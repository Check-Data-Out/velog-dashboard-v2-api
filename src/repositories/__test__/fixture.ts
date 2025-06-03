import { QueryResult } from "pg";

/**
* PostgreSQL 쿼리를 모킹하기 위한 mock Pool 객체
* 
* @description Jest 테스트에서 pg.Pool의 query 메서드를 모킹하는 데 사용됩니다.
* @example
* ```typescript
* // 성공적인 쿼리 결과 모킹
* mockPool.query.mockResolvedValue(createMockQueryResult([{ id: 1, name: 'test' }]));
* 
* // 에러 발생 모킹
* mockPool.query.mockRejectedValue(new Error('Database error'));
* ```
*/
export const mockPool: {
  query: jest.Mock<Promise<QueryResult<Record<string, unknown>>>, unknown[]>;
} = {
  query: jest.fn(),
};

/**
* pg의 QueryResult 타입을 만족하는 mock 객체를 생성하기 위한 헬퍼 함수
* 
* @template T - 쿼리 결과 row의 타입 (Record<string, unknown>를 확장해야 함)
* @param rows - 모킹할 데이터베이스 행들의 배열
* @returns PostgreSQL QueryResult 형태의 mock 객체
* 
* @description
* PostgreSQL의 실제 쿼리 결과와 동일한 구조를 가진 mock 객체를 생성합니다.
* Jest 테스트에서 데이터베이스 쿼리 결과를 모킹할 때 사용됩니다.
* 
* @example
* ```typescript
* // 사용자 데이터 모킹
* const mockUsers = [
*   { id: 1, name: 'John', email: 'john@example.com' },
*   { id: 2, name: 'Jane', email: 'jane@example.com' }
* ];
* const result = createMockQueryResult(mockUsers);
* 
* // 빈 결과 모킹
* const emptyResult = createMockQueryResult([]);
* 
* // Jest mock에서 사용
* mockPool.query.mockResolvedValue(createMockQueryResult(mockUsers));
* ```
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