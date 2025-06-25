import { NextFunction, Request, RequestHandler, Response } from 'express';
import { SlackService } from '@/services/slack.service';
import { SentryService } from '@/services/sentry.service';
import logger from '@/configs/logger.config';
import { PermissionCheckResponseDto, SlackSuccessResponseDto } from '@/types';
import { SentryActionData, SentryApiAction } from '@/types/models/Sentry.type';
import { getNewStatusFromAction } from '@/utils/sentry.util';

export class SlackController {
  constructor(
    private slackService: SlackService,
    private sentryService: SentryService,
  ) {}

  checkPermissions: RequestHandler = async (
    req: Request,
    res: Response<PermissionCheckResponseDto>,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const permissions = await this.slackService.checkPermissions();
      const response = new PermissionCheckResponseDto(true, 'Slack 권한 확인 완료', permissions, null);
      res.status(200).json(response);
    } catch (error) {
      logger.error('Slack 권한 확인 실패:', error instanceof Error ? error.message : '알 수 없는 오류');
      next(error);
    }
  };

  testBot: RequestHandler = async (
    req: Request,
    res: Response<SlackSuccessResponseDto>,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!this.slackService.hasBotToken() && !this.slackService.hasWebhookUrl()) {
        const response = new SlackSuccessResponseDto(
          false,
          'SLACK_BOT_TOKEN 또는 SLACK_WEBHOOK_URL 환경 변수가 설정되지 않았습니다.',
          {},
          'MISSING_SLACK_CONFIG'
        );
        res.status(400).json(response);
        return;
      }

      const testMessage = {
        text: '🤖 봇 테스트 메시지입니다!',
        attachments: [
          {
            color: 'good',
            fields: [
              {
                title: '테스트 결과',
                value: '✅ Slack 연동이 정상적으로 작동합니다.',
                short: false,
              },
            ],
            footer: `테스트 시간: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`,
          },
        ],
      };

      await this.slackService.sendMessage(testMessage);
      const response = new SlackSuccessResponseDto(true, '봇 테스트 메시지 전송 완료!', {}, null);
      res.status(200).json(response);
    } catch (error) {
      logger.error('봇 테스트 실패:', error instanceof Error ? error.message : '알 수 없는 오류');
      next(error);
    }
  };

  handleInteractive: RequestHandler = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const payload = JSON.parse(req.body.payload);
      
      if (payload.type === 'interactive_message' && payload.actions && payload.actions[0]) {
        const action = payload.actions[0];
        
        if (action.name === 'sentry_action') {
          const [actionType, issueId, organizationSlug, projectSlug] = action.value.split(':');
          
          const actionData: SentryActionData = {
            action: actionType as SentryApiAction,
            issueId,
            organizationSlug,
            projectSlug,
          };

          if (actionData.issueId && actionData.organizationSlug && actionData.projectSlug) {
            logger.info('Processing Sentry action:', actionData);

            const result = await this.sentryService.handleIssueAction(actionData);
            
            if (result.success) {
              const updatedMessage = this.createSuccessMessage(actionData, payload.original_message || {});
              res.json(updatedMessage);
            } else {
              const errorMessage = this.createErrorMessage(result.error || 'Unknown error', payload.original_message || {});
              res.json(errorMessage);
            }
            return;
          }
        }
      }

      res.json({ text: '❌ 잘못된 요청입니다.' });
    } catch (error) {
      logger.error('Interactive 처리 실패:', error instanceof Error ? error.message : '알 수 없는 오류');
      next(error);
    }
  };

  private createSuccessMessage(actionData: SentryActionData, originalMessage: unknown): unknown {
    const { action } = actionData;

    const updatedMessage = JSON.parse(JSON.stringify(originalMessage));
    
    if (updatedMessage.attachments && updatedMessage.attachments[0]) {
      const newStatus = getNewStatusFromAction(action);
      const statusColors = {
        'resolved': 'good',
        'ignored': 'warning',
        'archived': '#808080',
        'unresolved': 'danger',
      };
      
      updatedMessage.attachments[0].color = statusColors[newStatus as keyof typeof statusColors] || 'good';
      
      const statusMapping = {
        'resolved': 'RESOLVED',
        'ignored': 'IGNORED',
        'archived': 'ARCHIVED',
        'unresolved': 'UNRESOLVED',
      };
      
      const statusText = statusMapping[newStatus as keyof typeof statusMapping] || newStatus.toUpperCase();
      updatedMessage.attachments[0].footer = `✅ ${statusText} | 처리 완료: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`;
      
      delete updatedMessage.attachments[0].actions;
    }

    return updatedMessage;
  }

  private createErrorMessage(error: string, originalMessage: unknown): unknown {
    const updatedMessage = JSON.parse(JSON.stringify(originalMessage));
    
    if (updatedMessage.attachments && updatedMessage.attachments[0]) {
      updatedMessage.attachments[0].fields.push({
        title: '❌ 오류 발생',
        value: error,
        short: false,
      });

      updatedMessage.attachments[0].color = 'danger';
    }

    return updatedMessage;
  }
} 