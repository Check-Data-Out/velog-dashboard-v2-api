import { NextFunction, Request, RequestHandler, Response } from 'express';
import { EmptyResponseDto, SentryWebhookData } from '@/types';
import logger from '@/configs/logger.config';
// import { sendSlackMessage } from '@/modules/slack/slack.notifier';

export class WebhookController {
  private readonly STATUS_EMOJI = {
    'unresolved': '🔴',
    'resolved': '✅',
    'ignored': '🔇',
    'archived': '📦',
  } as const;

  handleSentryWebhook: RequestHandler = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const sentryData: SentryWebhookData = req.body;
      if(sentryData.action !== "created") res.status(400).json(new EmptyResponseDto(true, 'Sentry 웹훅 처리에 실패했습니다', {}, null));
      const slackMessage = this.formatSentryMessage(sentryData);
      console.log(slackMessage);
      // await sendSlackMessage(slackMessage);

      const response = new EmptyResponseDto(true, 'Sentry 웹훅 처리에 성공하였습니다.', {}, null);
      res.status(200).json(response);
    } catch (error) {
      logger.error('Sentry 웹훅 처리 실패:', error);
      next(error);
    }
  };

  private formatSentryMessage(sentryData: SentryWebhookData): string {
    const { data: { issue } } = sentryData;

    if(!issue.status || !issue.title || !issue.culprit || !issue.permalink || !issue.id) throw new Error('Sentry 웹훅 데이터가 올바르지 않습니다');

    const { status, title: issueTitle, culprit, permalink, id } = issue;
    const statusEmoji = this.STATUS_EMOJI[status as keyof typeof this.STATUS_EMOJI];

    // URL 생성 - permalink가 있으면 사용, 없으면 실제 프로젝트 URL 패턴으로 생성
    const detailUrl = permalink || `https://velog-dashboardv2.sentry.io/issues/${id}/`;

    let message = `🚨 *새로운 오류가 발생하였습니다*\n\n`;
    message += `${statusEmoji} *제목:* ${issueTitle}\n\n`;
    message += `📍 *위치:* ${culprit}\n\n`;
    message += `🔗 *상세 보기:* ${detailUrl}`;

    return message;
  }
} 