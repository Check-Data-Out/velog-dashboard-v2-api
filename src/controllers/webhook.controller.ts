import { NextFunction, Request, RequestHandler, Response } from 'express';
import { SlackService } from '@/services/slack.service';
import { SentryService } from '@/services/sentry.service';
import { SentryWebhookData, SlackMessage } from '@/types';
import { SentryActionData, SentryApiAction } from '@/types/models/Sentry.type';
import logger from '@/configs/logger.config';
import { formatSentryIssueForSlack, createStatusUpdateMessage } from '@/utils/slack.util';
import { getNewStatusFromAction } from '@/utils/sentry.util';

export class WebhookController {
  constructor(
    private slackService: SlackService,
    private sentryService: SentryService,
  ) {}

  handleSentryWebhook: RequestHandler = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const sentryData = req.body;
      
      const slackMessage = await this.formatSentryDataForSlack(sentryData);
      
      if (slackMessage === null) {
        logger.info('기존 메시지 업데이트 완료, 새 메시지 전송 생략');
        res.status(200).json({ message: 'Webhook processed successfully' });
        return;
      }
      
      const issueId = sentryData.data?.issue?.id;
      await this.slackService.sendMessage(slackMessage, issueId);
      
      res.status(200).json({ message: 'Webhook processed successfully' });
    } catch (error) {
      logger.error('Sentry webhook 처리 실패:', error instanceof Error ? error.message : '알 수 없는 오류');
      next(error);
    }
  };

  handleSlackInteractive: RequestHandler = async (
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
      logger.error('Slack Interactive 처리 실패:', error instanceof Error ? error.message : '알 수 없는 오류');
      next(error);
    }
  };

  private async formatSentryDataForSlack(sentryData: SentryWebhookData): Promise<SlackMessage | null> {
    const { action, data } = sentryData;
    
    if (action === 'resolved' || action === 'unresolved' || action === 'ignored') {
      return await this.handleIssueStatusChange(sentryData);
    }
    
    if (action === 'created' && data.issue) {
      return formatSentryIssueForSlack(sentryData, this.sentryService.hasSentryToken());
    }
    
    return {
      text: `🔔 Sentry 이벤트: ${action || 'Unknown action'}`,
      attachments: [
        {
          color: 'warning',
          fields: [
            {
              title: '이벤트 타입',
              value: action || 'Unknown',
              short: true,
            },
          ],
        },
      ],
    };
  }
  
  private async handleIssueStatusChange(sentryData: SentryWebhookData): Promise<SlackMessage | null> {
    const { data } = sentryData;
    const issue = data.issue;
    
    if (!issue) {
      logger.warn('이슈 정보가 없습니다:', sentryData);
      return formatSentryIssueForSlack(sentryData, this.sentryService.hasSentryToken());
    }
    
    logger.info(`이슈 상태 변경 감지: ${issue.id} → ${sentryData.action}`);
    
    const messageInfo = this.slackService.getMessageInfo(issue.id);
    
    if (messageInfo) {
      logger.info('기존 메시지 발견, 업데이트 시도');
      
      try {
        const updatedMessage = createStatusUpdateMessage(
          sentryData, 
          this.sentryService.hasSentryToken()
        );
        
        await this.slackService.updateMessage(
          messageInfo.channel,
          messageInfo.ts,
          updatedMessage
        );
        
        logger.info('기존 메시지 업데이트 완료');
        return null;
        
      } catch (error) {
        logger.error('메시지 업데이트 실패, 새 메시지로 전송:', error instanceof Error ? error.message : '알 수 없는 오류');
        
      }
    } else {
      logger.info('기존 메시지 없음, 새 메시지 생성');
    }
    
    return formatSentryIssueForSlack(sentryData, this.sentryService.hasSentryToken());
  }

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