import { Pool } from 'pg';
import { DBError, UnauthorizedError } from '@/exception';
import { UserService } from '@/services/user.service';
import { UserRepository } from '@/repositories/user.repository';
import { mockUser } from '@/utils/fixtures';

// AESEncryption 클래스 모킹
jest.mock('@/modules/token_encryption/aes_encryption', () => {
  // TokenEncryptionService 인터페이스를 구현한 모의 객체 반환
  return jest.fn().mockImplementation(() => ({
    encrypt: jest.fn().mockReturnValue('encrypted-token'),
  }));
});

// getKeyByGroup 모킹 - 키를 항상 리턴하도록
jest.mock('@/utils/key.util', () => ({
  getKeyByGroup: jest.fn().mockReturnValue('01234567890123456789012345678901'), // 32바이트 키
}));

// UserRepository 모킹
jest.mock('@/repositories/user.repository');

describe('UserService의 QR 로그인 기능', () => {
  let userService: UserService;
  let userRepo: jest.Mocked<UserRepository>;
  let mockPool: jest.Mocked<Pool>;

  beforeEach(() => {
    // DB Pool 목 설정
    const mockPoolObj = {};
    mockPool = mockPoolObj as jest.Mocked<Pool>;

    const repoInstance = new UserRepository(mockPool);
    userRepo = repoInstance as jest.Mocked<UserRepository>;
    userService = new UserService(userRepo);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createUserQRToken', () => {
    it('QR 토큰을 생성하고 반환해야 한다', async () => {
      const userId = 1;
      const ip = '127.0.0.1';
      const userAgent = 'Chrome';

      const token = await userService.createUserQRToken(userId, ip, userAgent);

      expect(typeof token).toBe('string');
      expect(token.length).toBe(10);
      expect(/^[A-Za-z0-9\-_.~!]{10}$/.test(token)).toBe(true);
      expect(userRepo.createQRLoginToken).toHaveBeenCalledWith(token, userId, ip, userAgent);
    });

    it('QR 토큰 생성 중 오류 발생 시 예외 발생', async () => {
      userRepo.createQRLoginToken.mockRejectedValueOnce(new DBError('생성 실패'));

      await expect(userService.createUserQRToken(1, 'ip', 'agent')).rejects.toThrow('생성 실패');
    });
  });

  describe('useToken', () => {
    const ip = '10.0.0.1';
    const userAgent = 'phone-agent';

    it('토큰을 소비하고 토큰 주인 사용자를 반환', async () => {
      userRepo.consumeQRLoginToken.mockResolvedValue(mockUser.id);
      userRepo.findByUserId.mockResolvedValue(mockUser);

      const result = await userService.useToken('token', ip, userAgent);

      expect(result).toEqual(mockUser);
      expect(userRepo.consumeQRLoginToken).toHaveBeenCalledWith('token', ip, userAgent);
      expect(userRepo.findByUserId).toHaveBeenCalledWith(mockUser.id);
      expect(userRepo.updateQRLoginTokenToUse).not.toHaveBeenCalled();
    });

    it('소비할 수 없는 토큰이면 null 반환', async () => {
      userRepo.consumeQRLoginToken.mockResolvedValue(null);

      const result = await userService.useToken('token', ip, userAgent);

      expect(result).toBeNull();
      expect(userRepo.findByUserId).not.toHaveBeenCalled();
    });

    it('토큰 주인이 비활성 사용자면 UnauthorizedError', async () => {
      userRepo.consumeQRLoginToken.mockResolvedValue(mockUser.id);
      userRepo.findByUserId.mockResolvedValue({ ...mockUser, is_active: false });

      await expect(userService.useToken('token', ip, userAgent)).rejects.toThrow(UnauthorizedError);
    });

    it('토큰 주인 사용자가 없으면 UnauthorizedError', async () => {
      userRepo.consumeQRLoginToken.mockResolvedValue(mockUser.id);
      userRepo.findByUserId.mockResolvedValue(null);

      await expect(userService.useToken('token', ip, userAgent)).rejects.toThrow(UnauthorizedError);
    });

    it('토큰 소비 중 예외가 발생하면 전파', async () => {
      userRepo.consumeQRLoginToken.mockRejectedValueOnce(new DBError('토큰 사용 처리 실패'));

      await expect(userService.useToken('token', ip, userAgent)).rejects.toThrow('토큰 사용 처리 실패');
      expect(userRepo.findByUserId).not.toHaveBeenCalled();
    });
  });

  describe('getQRLoginTokenStatus', () => {
    it('저장소가 판정한 본인 토큰 상태를 그대로 반환', async () => {
      userRepo.findQRLoginTokenStatus.mockResolvedValue({ status: 'pending' });

      const result = await userService.getQRLoginTokenStatus('token', 1);

      expect(result).toEqual({ status: 'pending' });
      expect(userRepo.findQRLoginTokenStatus).toHaveBeenCalledWith('token', 1);
    });
  });
});
