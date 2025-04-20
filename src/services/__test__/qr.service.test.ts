import { QRLoginTokenService } from '@/services/qr.service';
import { QRLoginTokenRepository } from '@/repositories/qr.repository';
import { DBError } from '@/exception';
import { QRLoginToken } from '@/types/models/QRLoginToken.type';

jest.mock('@/repositories/qr.repository');

describe('QRLoginTokenService', () => {
  let service: QRLoginTokenService;
  let repo: jest.Mocked<QRLoginTokenRepository>;

  beforeEach(() => {
    const repoInstance = new QRLoginTokenRepository({} as any)
    repo = repoInstance as jest.Mocked<QRLoginTokenRepository>;
    service = new QRLoginTokenService(repo);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('QR 토큰을 생성하고 반환해야 한다', async () => {
      const userId = 1;
      const ip = '127.0.0.1';
      const userAgent = 'Chrome';
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

      const token = await service.create(userId, ip, userAgent);

      expect(token).toMatch(uuidRegex);
      expect(repo.createQRLoginToken).toHaveBeenCalledWith(token, userId, ip, userAgent);
    });

    it('QR 토큰 생성 중 오류 발생 시 예외 발생', async () => {
      const userId = 1;
      const ip = '127.0.0.1';
      const userAgent = 'Mozilla';
      repo.createQRLoginToken.mockRejectedValueOnce(new DBError('생성 실패'));

      await expect(service.create(userId, ip, userAgent)).rejects.toThrow('생성 실패');
      expect(repo.createQRLoginToken).toHaveBeenCalled();
    });
  });

  describe('getByToken', () => {
    const mockToken = 'sample-token';
    const mockQRToken: QRLoginToken = {
      token: mockToken,
      user: 1,
      created_at: new Date(),
      expires_at: new Date(Date.now() + 1000 * 60 * 5),
      is_used: false,
      ip_address: '127.0.0.1',
      user_agent: 'Chrome',
    };

    it('유효한 토큰 조회 시 QRLoginToken 반환', async () => {
      repo.findQRLoginToken.mockResolvedValue(mockQRToken);

      const result = await service.getByToken(mockToken);

      expect(result).toEqual(mockQRToken);
      expect(repo.findQRLoginToken).toHaveBeenCalledWith(mockToken);
    });

    it('토큰이 없을 경우 null 반환', async () => {
      repo.findQRLoginToken.mockResolvedValue(null);

      const result = await service.getByToken(mockToken);

      expect(result).toBeNull();
      expect(repo.findQRLoginToken).toHaveBeenCalledWith(mockToken);
    });

    it('토큰 조회 중 오류 발생 시 예외 발생', async () => {
      repo.findQRLoginToken.mockRejectedValueOnce(new DBError('조회 실패'));

      await expect(service.getByToken(mockToken)).rejects.toThrow('조회 실패');
      expect(repo.findQRLoginToken).toHaveBeenCalledWith(mockToken);
    });
  });
});
