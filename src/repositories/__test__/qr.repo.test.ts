import { UserRepository } from '@/repositories/user.repository';
import { DBError } from '@/exception';
import { Pool } from 'pg';
import { mockPool } from '@/utils/fixtures';

jest.mock('pg');

describe('UserRepository - QR Login Token', () => {
  let repo: UserRepository;

  beforeEach(() => {
    repo = new UserRepository(mockPool as unknown as Pool);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createQRLoginToken', () => {
    it('QR 토큰을 성공적으로 삽입해야 한다', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce(undefined);

      await expect(repo.createQRLoginToken('token', 1, 'ip', 'agent')).resolves.not.toThrow();

      // 가장 중요한 검증 포인트만 확인
      expect(mockPool.query).toHaveBeenCalledTimes(1);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users_qrlogintoken'),
        expect.arrayContaining(['token', 1, 'ip', 'agent']),
      );
    });

    it('삽입 중 오류 발생 시 DBError를 던져야 한다', async () => {
      (mockPool.query as jest.Mock).mockRejectedValueOnce(new Error('fail'));

      await expect(repo.createQRLoginToken('token', 1, 'ip', 'agent')).rejects.toThrow(DBError);
    });
  });

  describe('updateQRLoginTokenToUse', () => {
    it('유저 ID로 토큰을 사용 처리해야 한다', async () => {
      const targetUserId = 1;
      (mockPool.query as jest.Mock).mockResolvedValueOnce(undefined);

      await expect(repo.updateQRLoginTokenToUse(targetUserId)).resolves.not.toThrow();

      expect(mockPool.query).toHaveBeenCalledTimes(1);
      expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('UPDATE users_qrlogintoken'), [targetUserId]);
    });

    it('토큰 사용 처리 중 오류 발생 시 DBError를 던져야 한다', async () => {
      (mockPool.query as jest.Mock).mockRejectedValueOnce(new Error('fail'));

      await expect(repo.updateQRLoginTokenToUse(1)).rejects.toThrow(DBError);

      expect(mockPool.query).toHaveBeenCalledTimes(1);
    });
  });
});
