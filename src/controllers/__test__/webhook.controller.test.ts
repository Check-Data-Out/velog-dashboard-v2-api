import 'reflect-metadata';
import { Request, Response } from 'express';
import { WebhookController } from '@/controllers/webhook.controller';
import { sendSlackMessage } from '@/modules/slack/slack.notifier';
import { verifySignature } from '@/utils/verify.util';

// Mock dependencies
jest.mock('@/modules/slack/slack.notifier');
jest.mock('@/utils/verify.util');

// logger 모킹
jest.mock('@/configs/logger.config', () => ({
  error: jest.fn(),
  info: jest.fn(),
}));

describe('WebhookController', () => {
  let webhookController: WebhookController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: jest.Mock;
  let mockSendSlackMessage: jest.MockedFunction<typeof sendSlackMessage>;
  let mockVerifySignature: jest.MockedFunction<typeof verifySignature>;

  beforeEach(() => {
    // WebhookController 인스턴스 생성
    webhookController = new WebhookController();

    // Request, Response, NextFunction 모킹
    mockRequest = {
      body: {},
      headers: {},
    };

    mockResponse = {
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis(),
    };

    nextFunction = jest.fn();
    mockSendSlackMessage = sendSlackMessage as jest.MockedFunction<typeof sendSlackMessage>;
    mockVerifySignature = verifySignature as jest.MockedFunction<typeof verifySignature>;
    
    // 기본적으로 시그니처 검증이 성공하도록 설정
    mockVerifySignature.mockReturnValue(true);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleSentryWebhook', () => {
    // 실제 동작에 필요한 필수 값만 사용하도록 타입 미적용
    const mockSentryData = {
      action: 'created',
      data: {
        issue: {
          id: 'test-issue-123',
          title: '테스트 오류입니다',
          culprit: 'TestFile.js:10',
          status: 'unresolved',
          count: "5",
          userCount: 3,
          firstSeen: '2024-01-01T12:00:00.000Z',
          permalink: 'https://velog-dashboardv2.sentry.io/issues/test-issue-123/',
          project: {
            id: 'project-123',
            name: 'Velog Dashboard',
            slug: 'velog-dashboard'
          }
        }
      }
    };

    it('유효한 Sentry 웹훅 데이터로 처리에 성공해야 한다', async () => {
      mockRequest.body = mockSentryData;
      mockSendSlackMessage.mockResolvedValue();

      await webhookController.handleSentryWebhook(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockSendSlackMessage).toHaveBeenCalledWith(
        expect.stringContaining('🚨 *새로운 오류가 발생하였습니다*')
      );
      expect(mockSendSlackMessage).toHaveBeenCalledWith(
        expect.stringContaining('🔴 *제목:* 테스트 오류입니다')
      );
      expect(mockSendSlackMessage).toHaveBeenCalledWith(
        expect.stringContaining('📍 *위치:* TestFile.js:10')
      );
      expect(mockSendSlackMessage).toHaveBeenCalledWith(
        expect.stringContaining('🔗 *상세 보기:* https://velog-dashboardv2.sentry.io/issues/test-issue-123/')
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Sentry 웹훅 처리에 성공하였습니다.',
        data: {},
        error: null
      });
    });

    it('permalink가 없는 경우 기본 URL 패턴을 사용해야 한다', async () => {
      const dataWithoutPermalink = {
        ...mockSentryData,
        data: {
          ...mockSentryData.data,
          issue: {
            ...mockSentryData.data.issue,
            permalink: undefined
          }
        }
      };
      mockRequest.body = dataWithoutPermalink;
      mockSendSlackMessage.mockResolvedValue();

      await webhookController.handleSentryWebhook(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockSendSlackMessage).toHaveBeenCalledWith(
        expect.stringContaining('🔗 *상세 보기:* https://velog-dashboardv2.sentry.io/issues/test-issue-123/')
      );
    });

    it('Slack 메시지 전송 실패 시 에러를 전달해야 한다', async () => {
      mockRequest.body = mockSentryData;
      const slackError = new Error('Slack 전송 실패');
      mockSendSlackMessage.mockRejectedValue(slackError);

      await webhookController.handleSentryWebhook(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledWith(slackError);
      expect(mockResponse.json).not.toHaveBeenCalled();
    });

    // Invalid Body 케이스 테스트들
    it('action이 created가 아닌 경우 400 에러를 반환해야 한다', async () => {
      mockRequest.body = { action: 'resolved' };

      await webhookController.handleSentryWebhook(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Sentry 웹훅 처리에 실패했습니다',
        data: {},
        error: null
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('빈 body인 경우 400 에러를 반환해야 한다', async () => {
      mockRequest.body = {};

      await webhookController.handleSentryWebhook(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Sentry 웹훅 처리에 실패했습니다',
        data: {},
        error: null
      });
    });

    it('action이 없는 경우 400 에러를 반환해야 한다', async () => {
      mockRequest.body = { data: { issue: {} } };

      await webhookController.handleSentryWebhook(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Sentry 웹훅 처리에 실패했습니다',
        data: {},
        error: null
      });
    });

    it('전혀 다른 형태의 객체인 경우 400 에러를 반환해야 한다', async () => {
      mockRequest.body = {
        username: 'test',
        password: '123456',
        email: 'test@example.com'
      };

      await webhookController.handleSentryWebhook(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Sentry 웹훅 처리에 실패했습니다',
        data: {},
        error: null
      });
    });

    it('action은 created이지만 필수 필드가 없는 경우 에러를 전달해야 한다', async () => {
      mockRequest.body = {
        action: 'created',
        data: {
          issue: {
            // 필수 필드들이 누락됨
          }
        }
      };

      await webhookController.handleSentryWebhook(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Sentry 웹훅 데이터가 올바르지 않습니다'
        })
      );
      expect(mockResponse.json).not.toHaveBeenCalled();
    });

    it('action은 created이지만 data가 없는 경우 에러를 전달해야 한다', async () => {
      mockRequest.body = { action: 'created' };

      await webhookController.handleSentryWebhook(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
    });

    it('잘못된 타입의 body인 경우 400 에러를 반환해야 한다', async () => {
      mockRequest.body = 'invalid string body';

      await webhookController.handleSentryWebhook(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
  });

  describe('formatSentryMessage (private method integration test)', () => {
    it('완전한 Sentry 데이터로 올바른 형식의 메시지를 생성해야 한다', async () => {
      // 실제 동작에 필요한 필수 값만 사용하도록 타입 미적용
      const completeData = {
        action: 'created',
        data: {
          issue: {
            id: 'issue-456',
            title: 'TypeError: Cannot read property of undefined',
            culprit: 'components/UserProfile.tsx:25',
            status: 'unresolved',
            count: "12",
            userCount: 8,
            firstSeen: '2024-01-15T14:30:00.000Z',
            permalink: 'https://velog-dashboardv2.sentry.io/issues/issue-456/',
            project: {
              id: 'proj-789',
              name: 'Velog Dashboard V2',
              slug: 'velog-dashboard-v2'
            }
          }
        }
      };

      mockRequest.body = completeData;
      mockSendSlackMessage.mockResolvedValue();

      await webhookController.handleSentryWebhook(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      const expectedMessage = `🚨 *새로운 오류가 발생하였습니다*

🔴 *제목:* TypeError: Cannot read property of undefined

📍 *위치:* components/UserProfile.tsx:25

🔗 *상세 보기:* https://velog-dashboardv2.sentry.io/issues/issue-456/`;

      expect(mockSendSlackMessage).toHaveBeenCalledWith(expectedMessage);
    });
  });

  describe('Signature Verification', () => {
    const mockSentryData = {
      action: 'created',
      data: {
        issue: {
          id: 'test-issue-123',
          title: '시그니처 테스트 오류',
          culprit: 'TestFile.js:10',
          status: 'unresolved',
          count: "1",
          userCount: 1,
          firstSeen: '2024-01-01T12:00:00.000Z',
          permalink: 'https://velog-dashboardv2.sentry.io/issues/test-issue-123/',
          project: {
            id: 'project-123',
            name: 'Velog Dashboard',
            slug: 'velog-dashboard'
          }
        }
      }
    };

    it('유효한 시그니처로 웹훅 처리에 성공해야 한다', async () => {
      mockRequest.body = mockSentryData;
      mockRequest.headers = {
        'sentry-hook-signature': 'valid-signature'
      };
      mockVerifySignature.mockReturnValue(true);
      mockSendSlackMessage.mockResolvedValue();

      await webhookController.handleSentryWebhook(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockVerifySignature).toHaveBeenCalledWith(mockRequest);
      expect(mockSendSlackMessage).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('잘못된 시그니처로 400 에러를 반환해야 한다', async () => {
      mockRequest.body = mockSentryData;
      mockRequest.headers = {
        'sentry-hook-signature': 'invalid-signature'
      };
      mockVerifySignature.mockReturnValue(false);

      await webhookController.handleSentryWebhook(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockVerifySignature).toHaveBeenCalledWith(mockRequest);
      expect(mockSendSlackMessage).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Sentry 웹훅 처리에 실패했습니다',
        data: {},
        error: null
      });
    });

    it('시그니처 헤더가 누락된 경우 400 에러를 반환해야 한다', async () => {
      mockRequest.body = mockSentryData;
      mockRequest.headers = {}; // 시그니처 헤더 누락
      mockVerifySignature.mockReturnValue(false);

      await webhookController.handleSentryWebhook(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockVerifySignature).toHaveBeenCalledWith(mockRequest);
      expect(mockSendSlackMessage).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('시그니처 검증 중 예외 발생 시 에러를 전달해야 한다', async () => {
      mockRequest.body = mockSentryData;
      mockRequest.headers = {
        'sentry-hook-signature': 'some-signature'
      };
      const verificationError = new Error('SENTRY_CLIENT_SECRET is not defined');
      mockVerifySignature.mockImplementation(() => {
        throw verificationError;
      });

      await webhookController.handleSentryWebhook(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockVerifySignature).toHaveBeenCalledWith(mockRequest);
      expect(nextFunction).toHaveBeenCalledWith(verificationError);
      expect(mockSendSlackMessage).not.toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
    });
  });
}); 