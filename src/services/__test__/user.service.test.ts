import { Pool } from 'pg';
import { UserService } from '@/services/user.service';
import { SAMPLE_USER_VELOG_UUID, UserRepository } from '@/repositories/user.repository';
import { mockUser } from '@/utils/fixtures';
import { sendSlackMessage } from '@/modules/slack/slack.notifier';
import logger from '@/configs/logger.config';

jest.mock('@/utils/key.util', () => ({
  getKeyByGroup: jest.fn().mockReturnValue('01234567890123456789012345678901'),
}));

jest.mock('@/modules/slack/slack.notifier', () => ({
  sendSlackMessage: jest.fn(),
}));

jest.mock('@/repositories/user.repository', () => ({
  ...jest.requireActual('@/repositories/user.repository'),
  UserRepository: jest.fn().mockImplementation(() => ({
    incrementSessionVersion: jest.fn(),
    updateQRLoginTokenToUse: jest.fn(),
    findByUserId: jest.fn(),
    findByUserEmail: jest.fn(),
    unsubscribeNewsletter: jest.fn(),
  })),
}));

describe('UserService 로그아웃', () => {
  let userService: UserService;
  let userRepo: jest.Mocked<UserRepository>;

  beforeEach(() => {
    userRepo = new UserRepository({} as Pool) as jest.Mocked<UserRepository>;
    userService = new UserService(userRepo);
  });

  it('로그아웃하면 세션 버전을 올리고 쓰지 않은 QR 토큰을 사용 처리해야 한다', async () => {
    await userService.logout(mockUser);

    expect(userRepo.incrementSessionVersion).toHaveBeenCalledWith(mockUser.id);
    expect(userRepo.updateQRLoginTokenToUse).toHaveBeenCalledWith(mockUser.id);
  });

  it('샘플 계정은 다른 방문자 세션을 끊지 않도록 세션 버전을 올리지 않아야 한다', async () => {
    await userService.logout({ ...mockUser, velog_uuid: SAMPLE_USER_VELOG_UUID });

    expect(userRepo.incrementSessionVersion).not.toHaveBeenCalled();
  });
});

describe('UserService 뉴스레터 수신거부 (id)', () => {
  let userService: UserService;
  let userRepo: jest.Mocked<UserRepository>;
  const context = { source: '원클릭(메일 사업자)' as const, ip: '10.0.0.1', userAgent: 'mail-provider' };

  beforeEach(() => {
    jest.clearAllMocks();
    userRepo = new UserRepository({} as Pool) as jest.Mocked<UserRepository>;
    userService = new UserService(userRepo);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('구독 중인 사용자는 수신거부하고 Slack 에 사용자·시각·경로·요청 정보를 알려야 한다', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-22T15:00:00Z'));
    userRepo.findByUserId.mockResolvedValue(mockUser);

    await userService.unsubscribeNewsletterById(mockUser.id, context);

    expect(userRepo.unsubscribeNewsletter).toHaveBeenCalledWith(mockUser.id);
    const message = (sendSlackMessage as jest.Mock).mock.calls[0][0] as string;
    for (const expected of [
      `id: ${mockUser.id}`,
      'nuung',
      'test@example.com',
      '2026-10-23 00:00:00 KST',
      '원클릭(메일 사업자)',
      '10.0.0.1',
      'mail-provider',
      '이미 수신거부 상태: 아니오',
    ]) {
      expect(message).toContain(expected);
    }
  });

  it('이미 수신거부한 사용자는 다시 처리하지 않고 그 사실을 Slack 에 남겨야 한다', async () => {
    userRepo.findByUserId.mockResolvedValue({ ...mockUser, newsletter_subscribed: false });

    await userService.unsubscribeNewsletterById(mockUser.id, context);

    expect(userRepo.unsubscribeNewsletter).not.toHaveBeenCalled();
    expect(sendSlackMessage).toHaveBeenCalledWith(expect.stringContaining('이미 수신거부 상태: 예'));
  });

  it('없는 사용자는 조용히 끝나야 한다', async () => {
    userRepo.findByUserId.mockResolvedValue(null);

    await expect(userService.unsubscribeNewsletterById(999, context)).resolves.toBeUndefined();

    expect(userRepo.unsubscribeNewsletter).not.toHaveBeenCalled();
    expect(sendSlackMessage).not.toHaveBeenCalled();
  });

  it('Slack 전송이 실패해도 수신거부는 성공으로 끝나야 한다', async () => {
    userRepo.findByUserId.mockResolvedValue(mockUser);
    (sendSlackMessage as jest.Mock).mockRejectedValueOnce(new Error('slack down'));

    await expect(userService.unsubscribeNewsletterById(mockUser.id, context)).resolves.toBeUndefined();

    expect(userRepo.unsubscribeNewsletter).toHaveBeenCalledWith(mockUser.id);
  });
});

describe('UserService 뉴스레터 수신거부 (기존 email 링크)', () => {
  let userService: UserService;
  let userRepo: jest.Mocked<UserRepository>;
  const context = { source: '기존 email 링크' as const, ip: '10.0.0.1', userAgent: 'browser' };

  beforeEach(() => {
    jest.clearAllMocks();
    userRepo = new UserRepository({} as Pool) as jest.Mocked<UserRepository>;
    userService = new UserService(userRepo);
  });

  it('이메일로 찾은 사용자를 수신거부하고 같은 형식으로 경로를 구분해 알려야 한다', async () => {
    userRepo.findByUserEmail.mockResolvedValue(mockUser);

    await userService.unsubscribeNewsletter(mockUser.email as string, context);

    expect(userRepo.unsubscribeNewsletter).toHaveBeenCalledWith(mockUser.id);
    expect(sendSlackMessage).toHaveBeenCalledWith(expect.stringContaining('- 경로: 기존 email 링크'));
  });

  it('사용자가 없어도 서버 로그에 이메일을 남기지 않아야 한다', async () => {
    const logged = [jest.spyOn(logger, 'info'), jest.spyOn(logger, 'error')];
    userRepo.findByUserEmail.mockResolvedValue(null);

    await userService.unsubscribeNewsletter('nobody@example.com', context);

    expect(sendSlackMessage).not.toHaveBeenCalled();
    for (const spy of logged) {
      expect(JSON.stringify(spy.mock.calls)).not.toContain('nobody@example.com');
      spy.mockRestore();
    }
  });
});
