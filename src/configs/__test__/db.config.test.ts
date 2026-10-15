import { initializeDatabase } from '@/configs/db.config';

const mockClient = { query: jest.fn(), release: jest.fn() };

jest.mock('pg', () => ({
  Pool: jest.fn(() => ({ connect: async () => mockClient, on: jest.fn() })),
}));

jest.mock('@/configs/logger.config', () => ({
  error: jest.fn(),
  info: jest.fn(),
}));

describe('initializeDatabase', () => {
  it('연결만 확인하고 확장 DDL 은 실행하지 않아야 한다', async () => {
    mockClient.query.mockResolvedValue(undefined);

    await initializeDatabase();

    const queries = mockClient.query.mock.calls.map(([sql]) => sql);
    expect(queries).toEqual(['SELECT 1']);
    expect(mockClient.release).toHaveBeenCalledTimes(1);
  });
});
