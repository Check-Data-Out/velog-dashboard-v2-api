import { UserRepository } from '@/repositories/user.repository';
import { DBError } from '@/exception';
import { Pool } from 'pg';
import { QRLoginToken } from "@/types/models/QRLoginToken.type";
import { mockPool } from './fixture';

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

      await expect(
        repo.createQRLoginToken('token', 1, 'ip', 'agent')
      ).resolves.not.toThrow();

      // 가장 중요한 검증 포인트만 확인
      expect(mockPool.query).toHaveBeenCalledTimes(1);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users_qrlogintoken'),
        expect.arrayContaining(['token', 1, 'ip', 'agent'])
      );
    });

    it('삽입 중 오류 발생 시 DBError를 던져야 한다', async () => {
      (mockPool.query as jest.Mock).mockRejectedValueOnce(new Error('fail'));

      await expect(
        repo.createQRLoginToken('token', 1, 'ip', 'agent')
      ).rejects.toThrow(DBError);
    });
  });

  describe('findQRLoginToken', () => {
    it('유효한 토큰이 존재할 경우 반환해야 한다', async () => {
      const mockTokenData: QRLoginToken = {
        id: 1,
        token: 'token',
        user_id: 1,
        is_used: false,
        ip_address: 'ip',
        user_agent: 'agent',
        created_at: new Date(),
        expires_at: new Date(Date.now() + 5 * 60 * 1000) // 5분 후
      };

      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [mockTokenData] });

      const result = await repo.findQRLoginToken('token');

      // 결과 값 검증
      expect(result).toEqual(mockTokenData);

      // 쿼리 호출 검증 - 필수 요소만 검증
      expect(mockPool.query).toHaveBeenCalledTimes(1);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String), // 쿼리 내용은 구현 세부사항으로 간주
        ['token']          // 매개변수는 중요하므로 정확히 검증
      );
    });

    it('토큰이 존재하지 않으면 null을 반환해야 한다', async () => {
      // 참고로 존재하지 않거나, 만료된 토큰 밖에 없거나, 이미 사용된 토큰은 모두 "null 이 되는 것임"
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const result = await repo.findQRLoginToken('token');

      // null 반환 검증
      expect(result).toBeNull();

      // 쿼리 호출 검증
      expect(mockPool.query).toHaveBeenCalledTimes(1);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        ['token']
      );
    });

    it('조회 중 오류 발생 시 DBError를 던져야 한다', async () => {
      (mockPool.query as jest.Mock).mockRejectedValueOnce(new Error('fail'));

      await expect(repo.findQRLoginToken('token')).rejects.toThrow(DBError);

      expect(mockPool.query).toHaveBeenCalledTimes(1);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        ['token']
      );
    });
  });

  describe('updateQRLoginTokenToUse', () => {
    it('유저 ID로 토큰을 사용 처리해야 한다', async () => {
      const targetUserId = 1;
      (mockPool.query as jest.Mock).mockResolvedValueOnce(undefined);

      await expect(repo.updateQRLoginTokenToUse(targetUserId)).resolves.not.toThrow();

      expect(mockPool.query).toHaveBeenCalledTimes(targetUserId);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users_qrlogintoken'),
        [targetUserId]
      );
    });

    it('토큰 사용 처리 중 오류 발생 시 DBError를 던져야 한다', async () => {
      (mockPool.query as jest.Mock).mockRejectedValueOnce(new Error('fail'));

      await expect(repo.updateQRLoginTokenToUse(1)).rejects.toThrow(DBError);

      expect(mockPool.query).toHaveBeenCalledTimes(1);
    });
  });
});