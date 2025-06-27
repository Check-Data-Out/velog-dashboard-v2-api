import { NextFunction, Request, RequestHandler, Response } from 'express';
import { EmptyResponseDto, SentryWebhookData } from '@/types';
import logger from '@/configs/logger.config';
import { sendSlackMessage } from '@/modules/slack/slack.notifier';

export class WebhookController {
  private readonly STATUS_EMOJI = {
    'unresolved': '🔴',
    'resolved': '✅',
    'ignored': '🔇',
    'archived': '📦',
  } as const;

  private readonly ACTION_TEXT = {
    'created': '새로운 오류가 발생했습니다',
    'resolved': '오류가 해결되었습니다',
    'unresolved': '오류가 다시 발생했습니다',
    'ignored': '오류가 무시되었습니다',
    'assigned': '오류가 할당되었습니다',
  } as const;

  handleSentryWebhook: RequestHandler = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const sentryData: SentryWebhookData = req.body;
      const slackMessage = this.formatSentryMessage(sentryData);
      await sendSlackMessage(slackMessage);

      const response = new EmptyResponseDto(true, 'Sentry 웹훅 처리에 성공하였습니다.', {}, null);
      res.status(200).json(response);
    } catch (error) {
      logger.error('Sentry 웹훅 처리 실패:', error);
      next(error);
    }
  };

  private formatSentryMessage(sentryData: SentryWebhookData): string {
    const { action, data } = sentryData || {};
    const issue = data?.issue || {};

    // 알 수 없는 액션에 대한 기본값 처리
    const actionText = this.ACTION_TEXT[action as keyof typeof this.ACTION_TEXT] || `오류 이벤트: ${action}`;
    
    // 알 수 없는 상태에 대한 기본값 처리
    const statusEmoji = this.STATUS_EMOJI[issue.status as keyof typeof this.STATUS_EMOJI] || '❓';
    
    const issueTitle = issue.title || '제목 없음';
    const culprit = issue.culprit || '위치 정보 없음';
    const permalink = issue.permalink;

    // URL 생성 - permalink가 있으면 사용, 없으면 실제 프로젝트 URL 패턴으로 생성
    const detailUrl = permalink || `https://velog-dashboardv2.sentry.io/issues/${issue.id || 'unknown'}/`;

    let message = `🚨 *${actionText}*\n\n`;
    message += `${statusEmoji} *제목:* ${issueTitle}\n\n`;
    message += `📍 *위치:* ${culprit}\n\n`;
    message += `🔗 *상세 보기:* ${detailUrl}`;

    return message;
  }
} 