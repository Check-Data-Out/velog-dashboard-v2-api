import axios from 'axios';
import { SlackMessage, SlackApiResponse, StoredMessageInfo, SlackPermissionsData } from '@/types';
import { normalizeChannelId } from '@/utils/slack.util';
import logger from '@/configs/logger.config';

const issueMessageMap = new Map<string, StoredMessageInfo>();

export class SlackService {
  private readonly webhookUrl: string;
  private readonly botToken: string;
  private readonly channelId: string;

  constructor() {
    this.webhookUrl = process.env.SLACK_WEBHOOK_URL || '';
    this.botToken = process.env.SLACK_BOT_TOKEN || '';
    this.channelId = process.env.SLACK_CHANNEL_ID || '#general';
    
    // 24시간마다 오래된 메시지 정보 정리
    setInterval(() => this.cleanupOldMessages(), 24 * 60 * 60 * 1000);
  }

  hasBotToken(): boolean {
    return !!this.botToken;
  }

  hasWebhookUrl(): boolean {
    return !!this.webhookUrl;
  }

  storeMessageInfo(issueId: string, messageInfo: Omit<StoredMessageInfo, 'timestamp'>): void {
    issueMessageMap.set(issueId, {
      ...messageInfo,
      timestamp: Date.now(),
    });
  }

  getMessageInfo(issueId: string): StoredMessageInfo | undefined {
    return issueMessageMap.get(issueId);
  }

  async checkPermissions(): Promise<SlackPermissionsData> {
    if (!this.botToken) {
      return {
        hasToken: false,
        isValid: false,
        permissions: [],
        botInfo: null,
        channelAccess: false,
        recommendations: [
          'SLACK_BOT_TOKEN 환경 변수를 설정해주세요.',
          'Slack 앱에서 Bot Token을 생성하고 적절한 권한을 부여해주세요.',
        ],
      };
    }

    try {
      const authResponse = await axios.get('https://slack.com/api/auth.test', {
        headers: {
          'Authorization': `Bearer ${this.botToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!authResponse.data.ok) {
        throw new Error(authResponse.data.error || 'Token validation failed');
      }

      const channelId = normalizeChannelId(this.channelId);

      const channelResponse = await axios.get('https://slack.com/api/conversations.info', {
        params: { channel: channelId },
        headers: {
          'Authorization': `Bearer ${this.botToken}`,
          'Content-Type': 'application/json',
        },
      });

      let historyAccess = false;
      
      try {
        const historyResponse = await axios.get('https://slack.com/api/conversations.history', {
          params: { channel: channelId, limit: 1 },
          headers: {
            'Authorization': `Bearer ${this.botToken}`,
            'Content-Type': 'application/json',
          },
        });
        historyAccess = historyResponse.data.ok;
      } catch (error) {
        logger.error('History access check failed:', error);
      }

      const permissions = [
        'chat:write',
        'channels:read',
        ...(historyAccess ? ['channels:history'] : []),
      ];

      const recommendations = [];
      if (!channelResponse.data.ok) {
        recommendations.push(`채널 ${this.channelId}에 대한 접근 권한이 없습니다. 봇을 채널에 초대해주세요.`);
      }
      if (!historyAccess) {
        recommendations.push('메시지 업데이트 기능을 위해 channels:history 권한이 필요합니다.');
      }

      return {
        hasToken: true,
        isValid: authResponse.data.ok,
        permissions,
        botInfo: {
          userId: authResponse.data.user_id,
          username: authResponse.data.user,
          teamId: authResponse.data.team_id,
          teamName: authResponse.data.team,
        },
        channelAccess: channelResponse.data.ok,
        recommendations: recommendations.length > 0 ? recommendations : ['모든 권한이 정상적으로 설정되었습니다.'],
      };
    } catch (error) {
      logger.error('Slack 권한 확인 중 오류:', error);
      return {
        hasToken: true,
        isValid: false,
        permissions: [],
        botInfo: null,
        channelAccess: false,
        recommendations: [
          'Bot Token이 유효하지 않습니다.',
          'Slack 앱 설정을 확인하고 올바른 토큰을 사용해주세요.',
        ],
      };
    }
  }

  async sendMessage(message: SlackMessage, issueId?: string): Promise<SlackApiResponse> {
    // Interactive 기능이 있다면 Bot Token 사용, 없다면 Webhook 사용
    if (this.botToken) {
      return await this.sendMessageWithBot(message, issueId);
    } else if (this.webhookUrl) {
      return await this.sendMessageWithWebhook(message);
    } else {
      throw new Error('Slack 설정이 없습니다. SLACK_BOT_TOKEN 또는 SLACK_WEBHOOK_URL을 설정해주세요.');
    }
  }

  private async sendMessageWithWebhook(message: SlackMessage): Promise<SlackApiResponse> {
    try {
      const response = await axios.post(this.webhookUrl, message, {
        headers: { 'Content-Type': 'application/json' },
      });

      logger.info('Slack 메시지 전송 성공 (Webhook)');
      return { success: true, data: response.data };
    } catch (error) {
      logger.error('Slack 메시지 전송 실패 (Webhook):', error instanceof Error ? error.message : '알 수 없는 오류');
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private async sendMessageWithBot(message: SlackMessage, issueId?: string): Promise<SlackApiResponse> {
    try {
      const channelId = normalizeChannelId(this.channelId);
      
      const response = await axios.post('https://slack.com/api/chat.postMessage', {
        channel: channelId,
        ...message,
      }, {
        headers: {
          'Authorization': `Bearer ${this.botToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.data.ok) {
        logger.info('Slack 메시지 전송 성공 (Bot)', { channel: channelId });
        
        if (issueId && response.data.ts) {
          this.storeMessageInfo(issueId, {
            channel: channelId,
            ts: response.data.ts,
          });
        }
        
        return { success: true, data: response.data };
      } else {
        throw new Error(response.data.error || 'Message send failed');
      }
    } catch (error) {
      logger.error('Slack 메시지 전송 실패 (Bot):', error instanceof Error ? error.message : '알 수 없는 오류');
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async updateMessage(channel: string, ts: string, updatedMessage: SlackMessage): Promise<SlackApiResponse> {
    if (!this.botToken) {
      throw new Error('메시지 업데이트에는 Bot Token이 필요합니다.');
    }

    try {
      const response = await axios.post('https://slack.com/api/chat.update', {
        channel,
        ts,
        ...updatedMessage,
      }, {
        headers: {
          'Authorization': `Bearer ${this.botToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.data.ok) {
        logger.info('Slack 메시지 업데이트 성공', { channel, ts });
        return { success: true, data: response.data };
      } else {
        throw new Error(response.data.error || 'Message update failed');
      }
    } catch (error) {
      logger.error('Slack 메시지 업데이트 실패:', error instanceof Error ? error.message : '알 수 없는 오류');
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private cleanupOldMessages(): void {
    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000;
    
    for (const [issueId, messageInfo] of issueMessageMap.entries()) {
      if (now - messageInfo.timestamp > twentyFourHours) {
        issueMessageMap.delete(issueId);
      }
    }
    
    logger.info(`오래된 메시지 정보 정리 완료. 현재 저장된 메시지: ${issueMessageMap.size}개`);
  }
} 