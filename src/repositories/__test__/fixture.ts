import { QueryResult } from "pg";

export const mockPool: {
  query: jest.Mock<Promise<QueryResult<Record<string, unknown>>>, unknown[]>;
} = {
  query: jest.fn(),
};

/**
 * pg의 QueryResult 타입을 만족하는 mock 객체를 생성하기 위한 헬퍼 함수
 * @param rows 
 * @returns 
 */
export function createMockQueryResult<T extends Record<string, unknown>>(rows: T[]): QueryResult<T> {
  return {
    rows,
    rowCount: rows.length,
    command: '',
    oid: 0,
    fields: [],
  } satisfies QueryResult<T>;
}