import { Request } from 'express';
import { verifySignature } from '../verify.util';
import crypto from 'crypto';

// 환경 변수 모킹
const mockEnv = {
  SENTRY_CLIENT_SECRET: 'test-secret-key'
};

describe('verifySignature', () => {
  let mockRequest: Partial<Request>;
  let originalEnv: NodeJS.ProcessEnv;

  beforeAll(() => {
    originalEnv = process.env;
  });

  beforeEach(() => {
    process.env = { ...originalEnv, ...mockEnv };
    mockRequest = {
      body: {},
      headers: {}
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('성공 케이스', () => {
    it('유효한 시그니처로 검증에 성공해야 한다', () => {
      const testBody = { action: 'created', data: { issue: { id: 'test' } } };
      const bodyString = JSON.stringify(testBody);
      const expectedSignature = crypto
        .createHmac('sha256', mockEnv.SENTRY_CLIENT_SECRET)
        .update(bodyString)
        .digest('hex');

      mockRequest.body = testBody;
      mockRequest.headers = {
        'sentry-hook-signature': expectedSignature
      };

      const result = verifySignature(mockRequest as Request);

      expect(result).toBe(true);
    });

    it('복잡한 객체 body로 검증에 성공해야 한다', () => {
      const testBody = {
        action: 'created',
        data: {
          issue: {
            id: 'complex-issue-123',
            title: 'Complex Error with Special Characters: áéíóú',
            culprit: 'components/User@Profile.tsx:42',
            status: 'unresolved',
            count: "15",
            userCount: 8,
            firstSeen: '2024-01-01T12:00:00.000Z'
          }
        }
      };

      const bodyString = JSON.stringify(testBody);
      const expectedSignature = crypto
        .createHmac('sha256', mockEnv.SENTRY_CLIENT_SECRET)
        .update(bodyString)
        .digest('hex');

      mockRequest.body = testBody;
      mockRequest.headers = {
        'sentry-hook-signature': expectedSignature
      };

      const result = verifySignature(mockRequest as Request);

      expect(result).toBe(true);
    });
  });

  describe('실패 케이스', () => {
    it('잘못된 시그니처로 검증에 실패해야 한다', () => {
      const testBody = { action: 'created', data: { issue: { id: 'test' } } };
      
      mockRequest.body = testBody;
      mockRequest.headers = {
        'sentry-hook-signature': 'invalid-signature'
      };

      const result = verifySignature(mockRequest as Request);

      expect(result).toBe(false);
    });

    it('시그니처 헤더가 누락된 경우 false를 반환해야 한다', () => {
      const testBody = { action: 'created', data: { issue: { id: 'test' } } };
      
      mockRequest.body = testBody;
      mockRequest.headers = {}; // 시그니처 헤더 누락

      const result = verifySignature(mockRequest as Request);

      expect(result).toBe(false);
    });

    it('빈 시그니처로 검증에 실패해야 한다', () => {
      const testBody = { action: 'created', data: { issue: { id: 'test' } } };
      
      mockRequest.body = testBody;
      mockRequest.headers = {
        'sentry-hook-signature': ''
      };

      const result = verifySignature(mockRequest as Request);

      expect(result).toBe(false);
    });

    it('다른 secret으로 생성된 시그니처로 검증에 실패해야 한다', () => {
      const testBody = { action: 'created', data: { issue: { id: 'test' } } };
      const bodyString = JSON.stringify(testBody);
      const wrongSignature = crypto
        .createHmac('sha256', 'wrong-secret')
        .update(bodyString)
        .digest('hex');

      mockRequest.body = testBody;
      mockRequest.headers = {
        'sentry-hook-signature': wrongSignature
      };

      const result = verifySignature(mockRequest as Request);

      expect(result).toBe(false);
    });
  });

  describe('에러 케이스', () => {
    it('SENTRY_CLIENT_SECRET이 없는 경우 에러를 발생시켜야 한다', () => {
      delete process.env.SENTRY_CLIENT_SECRET;
      
      const testBody = { action: 'created', data: { issue: { id: 'test' } } };
      mockRequest.body = testBody;
      mockRequest.headers = {
        'sentry-hook-signature': 'some-signature'
      };

      expect(() => {
        verifySignature(mockRequest as Request);
      }).toThrow('SENTRY_CLIENT_SECRET is not defined');
    });
  });
}); 