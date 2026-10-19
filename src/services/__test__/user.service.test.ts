import { Pool } from 'pg';
import { UserService } from '@/services/user.service';
import { SAMPLE_USER_VELOG_UUID, UserRepository } from '@/repositories/user.repository';
import { mockUser } from '@/utils/fixtures';

jest.mock('@/utils/key.util', () => ({
  getKeyByGroup: jest.fn().mockReturnValue('01234567890123456789012345678901'),
}));

jest.mock('@/repositories/user.repository', () => ({
  ...jest.requireActual('@/repositories/user.repository'),
  UserRepository: jest.fn().mockImplementation(() => ({
    incrementSessionVersion: jest.fn(),
    updateQRLoginTokenToUse: jest.fn(),
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
