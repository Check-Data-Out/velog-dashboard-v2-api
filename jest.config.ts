import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/src/**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  moduleFileExtensions: ['ts', 'js'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  verbose: true,
  modulePathIgnorePatterns: ['<rootDir>/dist/', '<rootDir>/node_modules/'],
  // 통합 테스트는 실제 DBMS 연결이 필요하므로 기본 실행에서 제외한다.
  // 실행하려면 `pnpm test:integration` 을 사용한다.
  testPathIgnorePatterns: ['/__test__/integration/'],
};

export default config;
