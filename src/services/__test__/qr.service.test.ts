import { UserService } from '@/services/user.service';
import { UserRepository } from '@/repositories/user.repository';
import { DBError } from '@/exception';
import { QRLoginToken } from '@/types/models/QRLoginToken.type';
import { Pool } from 'pg';
import crypto from 'crypto';

const validKey = crypto.randomBytes(32).toString('utf8');

jest.mock('@/utils/key.util', () => ({
  getKeyByGroup: () => validKey,
}));

jest.mock('@/modules/slack/slack.notifier', () => ({
  sendSlackMessage: jest.fn(),
}));

jest.mock('@/repositories/user.repository');

describe('UserService 의 QRService', () => {
  let service: UserService;
  let repo: jest.Mocked<UserRepository>;

  beforeEach(() => {
    const mockPool = {} as jest.Mocked<Pool>;
    const repoInstance = new UserRepository(mockPool);
    repo = repoInstance as jest.Mocked<UserRepository>;
    service = new UserService(repo);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const velogUUID = 'uuid-1234';
    const ip = '127.0.0.1';
    const userAgent = 'Chrome';
    
    const mockUser = {
      id: 1,
      velog_uuid: velogUUID,
      access_token: 'token',
      refresh_token: 'token',
      group_id: 1,
      email: 'test@example.com',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    };

    it('QR 토큰을 생성하고 반환해야 한다', async () => {
      repo.findByUserVelogUUID.mockResolvedValueOnce(mockUser);
      
      const token = await service.create(velogUUID, ip, userAgent);
      
      expect(typeof token).toBe('string');
      expect(token.length).toBe(10);
      expect(/^[A-Za-z0-9\-_.~!]{10}$/.test(token)).toBe(true);
      expect(repo.createQRLoginToken).toHaveBeenCalledWith(token, mockUser.id, ip, userAgent);
    });
    
    it('유저 조회 실패 시 예외 발생', async () => {
      repo.findByUserVelogUUID.mockResolvedValueOnce(null as unknown as typeof mockUser);
      
      await expect(service.create(velogUUID, ip, userAgent)).rejects.toThrow('QR 토큰 생성 실패: 유저 없음');
    });

    it('QR 토큰 생성 중 오류 발생 시 예외 발생', async () => {
      repo.findByUserVelogUUID.mockResolvedValueOnce(mockUser);
      repo.createQRLoginToken.mockRejectedValueOnce(new DBError('생성 실패'));

      await expect(service.create(velogUUID, ip, userAgent)).rejects.toThrow('생성 실패');
    });
  });

  describe('useToken', () => {
    it('유효한 토큰 사용 처리 후 반환', async () => {
      const mockToken: QRLoginToken = {
        token: 'token',
        user: 1,
        created_at: new Date(),
        expires_at: new Date(),
        is_used: false,
        ip_address: '127.0.0.1',
        user_agent: 'Chrome',
      };
      repo.findQRLoginToken.mockResolvedValue(mockToken);

      const result = await service.useToken('token');

      expect(result).toEqual(mockToken);
      expect(repo.markTokenUsed).toHaveBeenCalledWith('token');
    });

    it('토큰이 존재하지 않으면 null 반환', async () => {
      repo.findQRLoginToken.mockResolvedValue(null);
      const result = await service.useToken('token');
      expect(result).toBeNull();
    });

    it('markTokenUsed 호출 시 예외 발생하면 전파', async () => {
      const mockToken: QRLoginToken = {
        token: 'token',
        user: 1,
        created_at: new Date(),
        expires_at: new Date(),
        is_used: false,
        ip_address: '127.0.0.1',
        user_agent: 'Chrome',
      };
      repo.findQRLoginToken.mockResolvedValue(mockToken);
      repo.markTokenUsed.mockRejectedValueOnce(new DBError('사용 처리 실패'));

      await expect(service.useToken('token')).rejects.toThrow('사용 처리 실패');
    });
  });
});
