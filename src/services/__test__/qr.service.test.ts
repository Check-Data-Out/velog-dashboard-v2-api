import { Pool } from 'pg';
import { DBError } from '@/exception';
import { UserService } from '@/services/user.service';
import { UserRepository } from '@/repositories/user.repository';
import { QRLoginToken } from '@/types/models/QRLoginToken.type';
import { mockUser } from '@/utils/fixtures';

// AESEncryption 클래스 모킹
jest.mock('@/modules/token_encryption/aes_encryption', () => {
  // TokenEncryptionService 인터페이스를 구현한 모의 객체 반환
  return jest.fn().mockImplementation(() => ({
    encrypt: jest.fn().mockReturnValue('encrypted-token'),
    decrypt: jest.fn().mockImplementation((token) => {
      // useToken 메서드에서 필요한 반환값 제공
      if (token === 'encrypted-access-token') return 'decrypted-access-token';
      if (token === 'encrypted-refresh-token') return 'decrypted-refresh-token';
      return 'unknown-token';
    }),
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
    const mockQRToken: QRLoginToken = {
      id: 1,
      token: 'token',
      user_id: 1,
      created_at: new Date(),
      expires_at: new Date(),
      is_used: false,
      ip_address: '127.0.0.1',
      user_agent: 'Chrome',
    };

    it('유효한 토큰 사용 시 복호화된 토큰 정보 반환', async () => {
      userRepo.findQRLoginToken.mockResolvedValue(mockQRToken);
      userRepo.findByUserId.mockResolvedValue(mockUser);

      const result = await userService.useToken('token');

      expect(result).toEqual({
        decryptedAccessToken: 'decrypted-access-token',
        decryptedRefreshToken: 'decrypted-refresh-token',
      });
      expect(userRepo.findQRLoginToken).toHaveBeenCalledWith('token');
      expect(userRepo.findByUserId).toHaveBeenCalledWith(mockQRToken.user_id);
      expect(userRepo.updateQRLoginTokenToUse).toHaveBeenCalledWith(mockQRToken.user_id);
    });

    it('토큰이 존재하지 않으면 null 반환', async () => {
      userRepo.findQRLoginToken.mockResolvedValue(null);

      const result = await userService.useToken('token');

      expect(result).toBeNull();
      expect(userRepo.findQRLoginToken).toHaveBeenCalledWith('token');
      expect(userRepo.findByUserId).not.toHaveBeenCalled();
      expect(userRepo.updateQRLoginTokenToUse).not.toHaveBeenCalled();
    });

    it('findByUserId 호출 시 예외가 발생하면 전파', async () => {
      userRepo.findQRLoginToken.mockResolvedValue(mockQRToken);
      userRepo.findByUserId.mockRejectedValueOnce(new DBError('사용자 조회 실패'));

      await expect(userService.useToken('token')).rejects.toThrow('사용자 조회 실패');
      expect(userRepo.findQRLoginToken).toHaveBeenCalledWith('token');
      expect(userRepo.findByUserId).toHaveBeenCalledWith(mockQRToken.user_id);
      expect(userRepo.updateQRLoginTokenToUse).not.toHaveBeenCalled();
    });

    it('updateQRLoginTokenToUse 호출 시 예외가 발생하면 전파', async () => {
      userRepo.findQRLoginToken.mockResolvedValue(mockQRToken);
      userRepo.findByUserId.mockResolvedValue(mockUser);
      userRepo.updateQRLoginTokenToUse.mockRejectedValueOnce(new DBError('토큰 사용 처리 실패'));

      await expect(userService.useToken('token')).rejects.toThrow('토큰 사용 처리 실패');
      expect(userRepo.findQRLoginToken).toHaveBeenCalledWith('token');
      expect(userRepo.findByUserId).toHaveBeenCalledWith(mockQRToken.user_id);
      expect(userRepo.updateQRLoginTokenToUse).toHaveBeenCalledWith(mockQRToken.user_id);
    });
  });
});
