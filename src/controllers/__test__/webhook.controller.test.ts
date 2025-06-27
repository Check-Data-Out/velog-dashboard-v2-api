import 'reflect-metadata';
import { Request, Response } from 'express';
import { WebhookController } from '@/controllers/webhook.controller';
import { sendSlackMessage } from '@/modules/slack/slack.notifier';
import { SentryWebhookData } from '@/types';

// Mock dependencies
jest.mock('@/modules/slack/slack.notifier');

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
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleSentryWebhook', () => {
    const mockSentryData: SentryWebhookData = {
      action: 'created',
      data: {
        issue: {
          id: 'test-issue-123',
          title: '테스트 오류입니다',
          culprit: 'TestFile.js:10',
          status: 'unresolved',
          count: 5,
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
        expect.stringContaining('🚨 *새로운 오류가 발생했습니다*')
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

    it('resolved 액션에 대해 올바른 메시지를 생성해야 한다', async () => {
      const resolvedData = {
        ...mockSentryData,
        action: 'resolved' as const,
        data: {
          ...mockSentryData.data,
          issue: {
            ...mockSentryData.data.issue,
            status: 'resolved' as const
          }
        }
      };
      mockRequest.body = resolvedData;
      mockSendSlackMessage.mockResolvedValue();

      await webhookController.handleSentryWebhook(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockSendSlackMessage).toHaveBeenCalledWith(
        expect.stringContaining('🚨 *오류가 해결되었습니다*')
      );
      expect(mockSendSlackMessage).toHaveBeenCalledWith(
        expect.stringContaining('✅ *제목:*')
      );
    });

    it('ignored 액션에 대해 올바른 메시지를 생성해야 한다', async () => {
      const ignoredData = {
        ...mockSentryData,
        action: 'ignored' as const,
        data: {
          ...mockSentryData.data,
          issue: {
            ...mockSentryData.data.issue,
            status: 'ignored' as const
          }
        }
      };
      mockRequest.body = ignoredData;
      mockSendSlackMessage.mockResolvedValue();

      await webhookController.handleSentryWebhook(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockSendSlackMessage).toHaveBeenCalledWith(
        expect.stringContaining('🚨 *오류가 무시되었습니다*')
      );
      expect(mockSendSlackMessage).toHaveBeenCalledWith(
        expect.stringContaining('🔇 *제목:*')
      );
    });

    it('알 수 없는 액션에 대해 기본 메시지를 생성해야 한다', async () => {
      const unknownActionData = {
        ...mockSentryData,
        action: 'unknown_action' as 'created'
      };
      mockRequest.body = unknownActionData;
      mockSendSlackMessage.mockResolvedValue();

      await webhookController.handleSentryWebhook(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockSendSlackMessage).toHaveBeenCalledWith(
        expect.stringContaining('오류 이벤트: unknown_action')
      );
    });

    it('알 수 없는 상태에 대해 기본 이모지를 사용해야 한다', async () => {
      const unknownStatusData = {
        ...mockSentryData,
        data: {
          ...mockSentryData.data,
          issue: {
            ...mockSentryData.data.issue,
            status: 'unknown_status' as 'unresolved'
          }
        }
      };
      mockRequest.body = unknownStatusData;
      mockSendSlackMessage.mockResolvedValue();

      await webhookController.handleSentryWebhook(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockSendSlackMessage).toHaveBeenCalledWith(
        expect.stringContaining('❓ *제목:*')
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

    it('빈 body로 요청 시에도 처리해야 한다', async () => {
      mockRequest.body = {};
      mockSendSlackMessage.mockResolvedValue();

      await webhookController.handleSentryWebhook(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      // undefined 값들에 대해서도 처리되어야 함
      expect(mockSendSlackMessage).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('필수 필드가 없는 경우에도 처리해야 한다', async () => {
      const incompleteData = {
        action: 'created',
        data: {
          issue: {
            id: 'test-123'
            // title, culprit 등 누락
          }
        }
      };
      mockRequest.body = incompleteData;
      mockSendSlackMessage.mockResolvedValue();

      await webhookController.handleSentryWebhook(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockSendSlackMessage).toHaveBeenCalledWith(
        expect.stringContaining('🔗 *상세 보기:* https://velog-dashboardv2.sentry.io/issues/test-123/')
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('formatSentryMessage (private method integration test)', () => {
    it('완전한 Sentry 데이터로 올바른 형식의 메시지를 생성해야 한다', async () => {
      const completeData: SentryWebhookData = {
        action: 'created',
        data: {
          issue: {
            id: 'issue-456',
            title: 'TypeError: Cannot read property of undefined',
            culprit: 'components/UserProfile.tsx:25',
            status: 'unresolved',
            count: 12,
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

      const expectedMessage = `🚨 *새로운 오류가 발생했습니다*

🔴 *제목:* TypeError: Cannot read property of undefined

📍 *위치:* components/UserProfile.tsx:25

🔗 *상세 보기:* https://velog-dashboardv2.sentry.io/issues/issue-456/`;

      expect(mockSendSlackMessage).toHaveBeenCalledWith(expectedMessage);
    });
  });
}); 