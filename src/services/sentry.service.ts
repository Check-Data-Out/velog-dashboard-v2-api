import axios from 'axios';
import { SentryActionData, SentryActionResult } from '@/types';
import logger from '@/configs/logger.config';

export class SentryService {
  private readonly sentryToken: string;

  constructor() {
    this.sentryToken = process.env.SENTRY_AUTH_TOKEN || '';
  }


  hasSentryToken(): boolean {
    return !!this.sentryToken;
  }

  async handleIssueAction(actionData: SentryActionData): Promise<SentryActionResult> {
    if (!this.sentryToken) {
      return { success: false, error: 'Sentry 토큰이 설정되지 않았습니다.' };
    }

    try {
      const { action, issueId, organizationSlug, projectSlug } = actionData;
      const url = `https://sentry.io/api/0/projects/${organizationSlug}/${projectSlug}/issues/`;
      
      let data: Record<string, unknown>;
      
      switch (action) {
        case 'resolve':
          data = { status: 'resolved' };
          break;
        case 'ignore':
          data = { status: 'ignored' };
          break;
        case 'archive':
          data = { status: 'ignored', statusDetails: { ignoreUntilEscalating: true } };
          break;
        case 'delete':
          return await this.deleteIssue(organizationSlug, projectSlug, issueId);
        default:
          return { success: false, error: `지원하지 않는 액션: ${action}` };
      }

      const response = await axios.put(`${url}`, {
        issues: [issueId],
        ...data,
      }, {
        headers: {
          'Authorization': `Bearer ${this.sentryToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 200) {
        logger.info(`Sentry 이슈 ${action} 성공:`, { issueId, action });
        return { success: true };
      } else {
        throw new Error(`Unexpected response status: ${response.status}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Sentry 이슈 ${actionData.action} 실패:`, errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  private async deleteIssue(organizationSlug: string, projectSlug: string, issueId: string): Promise<SentryActionResult> {
    try {
      const url = `https://sentry.io/api/0/projects/${organizationSlug}/${projectSlug}/issues/${issueId}/`;
      
      const response = await axios.delete(url, {
        headers: {
          'Authorization': `Bearer ${this.sentryToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 202 || response.status === 204) {
        logger.info('Sentry 이슈 삭제 성공:', { issueId });
        return { success: true };
      } else {
        throw new Error(`Unexpected response status: ${response.status}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Sentry 이슈 삭제 실패:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }
} 