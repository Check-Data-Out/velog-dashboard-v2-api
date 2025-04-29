import { UserRepository } from '@/repositories/user.repository';
import { DBError } from '@/exception';
import { Pool } from 'pg';

const mockPool: Partial<Pool> = {
  query: jest.fn(),
};

describe('QRLoginTokenRepository', () => {
  let repo: UserRepository;

  beforeEach(() => {
    repo = new UserRepository(mockPool as Pool);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createQRLoginToken', () => {
    it('QR 토큰을 성공적으로 삽입해야 한다', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce(undefined);

      await expect(
        repo.createQRLoginToken('token', 1, 'ip', 'agent')
      ).resolves.not.toThrow();

      expect(mockPool.query).toHaveBeenCalled();
    });

    it('삽입 중 오류 발생 시 DBError를 던져야 한다', async () => {
      (mockPool.query as jest.Mock).mockRejectedValueOnce(new Error('fail'));

      await expect(
        repo.createQRLoginToken('token', 1, 'ip', 'agent')
      ).rejects.toThrow(DBError);
    });
  });

  describe('findQRLoginToken', () => {
    it('토큰이 존재할 경우 반환해야 한다', async () => {
      const mockTokenData = { token: 'token', user: 1 };
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [mockTokenData] });

      const result = await repo.findQRLoginToken('token');
      expect(result).toEqual(mockTokenData);
    });

    it('토큰이 존재하지 않으면 null을 반환해야 한다', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const result = await repo.findQRLoginToken('token');
      expect(result).toBeNull();
    });

    it('조회 중 오류 발생 시 DBError를 던져야 한다', async () => {
      (mockPool.query as jest.Mock).mockRejectedValueOnce(new Error('fail'));

      await expect(repo.findQRLoginToken('token')).rejects.toThrow(DBError);
    });
  });

  describe('markTokenUsed', () => {
    it('토큰을 사용 처리해야 한다', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce(undefined);

      await expect(repo.markTokenUsed('token')).resolves.not.toThrow();
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users_qrlogintoken SET is_used = true'),
        ['token']
      );
    });

    it('토큰 사용 처리 중 오류 발생 시 DBError를 던져야 한다', async () => {
      (mockPool.query as jest.Mock).mockRejectedValueOnce(new Error('fail'));

      await expect(repo.markTokenUsed('token')).rejects.toThrow(DBError);
    });
  });
});
