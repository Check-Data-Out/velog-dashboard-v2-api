import { QRLoginTokenRepository } from '@/repositories/qr.repository';
import { DBError } from '@/exception';
import { Pool } from 'pg';

const mockPool: Partial<Pool> = {
  query: jest.fn()
};

describe('QRLoginTokenRepository', () => {
  let repo: QRLoginTokenRepository;

  beforeEach(() => {
    repo = new QRLoginTokenRepository(mockPool as Pool);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should insert QR login token', async () => {
    (mockPool.query as jest.Mock).mockResolvedValueOnce(undefined);

    await expect(
      repo.createQRLoginToken('token', 1, 'ip', 'agent')
    ).resolves.not.toThrow();

    expect(mockPool.query).toHaveBeenCalled();
  });

  it('should throw DBError on insert failure', async () => {
    (mockPool.query as jest.Mock).mockRejectedValueOnce(new Error('fail'));

    await expect(repo.createQRLoginToken('token', 1, 'ip', 'agent'))
      .rejects.toThrow(DBError);
  });

  it('should return token if found', async () => {
    (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ token: 'token' }] });

    const result = await repo.findQRLoginToken('token');
    expect(result).toEqual({ token: 'token' });
  });

  it('should return null if token not found', async () => {
    (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

    const result = await repo.findQRLoginToken('token');
    expect(result).toBeNull();
  });

  it('should throw DBError on select failure', async () => {
    (mockPool.query as jest.Mock).mockRejectedValueOnce(new Error('fail'));

    await expect(repo.findQRLoginToken('token')).rejects.toThrow(DBError);
  });
});