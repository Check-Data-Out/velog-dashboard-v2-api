import { SlackMessage, SlackAction, SentryIssue, SentryWebhookData } from '@/types';
import { SlackAttachment } from '@/types/models/Slack.type';

/**
 * 날짜/시간을 상대적 또는 절대적 형식으로 포맷팅하는 함수
 * @param dateString - 포맷팅할 날짜 문자열
 * @returns 포맷팅된 날짜 문자열
 */
export function formatDateTime(dateString?: string): string {
  if (!dateString) return 'Unknown';
  
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    // 상대 시간 표시
    if (diffMins < 1) return '방금 전';
    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    if (diffDays < 7) return `${diffDays}일 전`;
    
    // 절대 시간 표시 (한국 시간)
    return date.toLocaleString('ko-KR', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateString;
  }
}

/**
 * 이슈 상태별 액션 버튼을 생성하는 함수
 * @param issue - Sentry 이슈 정보
 * @param issueUrl - 이슈 상세 페이지 URL
 * @param hasSentryToken - Sentry API 토큰 존재 여부
 * @returns Slack 액션 버튼 배열
 */
export function generateIssueActions(issue: SentryIssue, issueUrl: string, hasSentryToken: boolean = false): SlackAction[] {
  const actions: SlackAction[] = [
    {
      type: 'button',
      text: '🔍 Sentry에서 자세히 보기',
      url: issueUrl,
      style: 'primary'
    }
  ];

  // Interactive 기능이 활성화된 경우에만 액션 버튼 추가
  if (!hasSentryToken) {
    return actions;
  }

  const issueStatus = issue.status || 'unresolved';
  const baseActionData = {
    issueId: issue.id,
    projectSlug: issue.project?.slug || 'unknown'
  };

  switch (issueStatus) {
    case 'unresolved':
      // 미해결 상태: 해결, 보관, 삭제 버튼
      actions.push(
        {
          type: 'button',
          text: '✅ 문제 해결',
          name: 'resolve_issue',
          value: JSON.stringify({ ...baseActionData, action: 'resolve' }),
          style: 'good',
          confirm: {
            title: '이슈 해결 확인',
            text: '이 이슈를 해결됨으로 표시하시겠습니까?',
            ok_text: '해결',
            dismiss_text: '취소'
          }
        },
        {
          type: 'button',
          text: '📦 보관',
          name: 'archive_issue',
          value: JSON.stringify({ ...baseActionData, action: 'archive' }),
          style: 'default',
          confirm: {
            title: '이슈 보관 확인',
            text: '이 이슈를 보관하시겠습니까?',
            ok_text: '보관',
            dismiss_text: '취소'
          }
        },
        {
          type: 'button',
          text: '🗑️ 삭제',
          name: 'delete_issue',
          value: JSON.stringify({ ...baseActionData, action: 'delete' }),
          style: 'danger',
          confirm: {
            title: '이슈 삭제 확인',
            text: '이 이슈를 완전히 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.',
            ok_text: '삭제',
            dismiss_text: '취소'
          }
        }
      );
      break;

    case 'resolved':
      // 해결됨 상태: 해결 취소, 보관, 삭제 버튼
      actions.push(
        {
          type: 'button',
          text: '↩️ 해결 취소',
          name: 'unresolve_issue',
          value: JSON.stringify({ ...baseActionData, action: 'unresolve' }),
          style: 'default',
          confirm: {
            title: '해결 취소 확인',
            text: '이 이슈의 해결 상태를 취소하시겠습니까?',
            ok_text: '취소',
            dismiss_text: '아니오'
          }
        },
        {
          type: 'button',
          text: '📦 보관',
          name: 'archive_issue',
          value: JSON.stringify({ ...baseActionData, action: 'archive' }),
          style: 'default'
        }
      );
      break;

    case 'ignored':
      // 보관 상태: 보관 취소, 해결, 삭제 버튼
      actions.push(
        {
          type: 'button',
          text: '📤 보관 취소',
          name: 'unarchive_issue',
          value: JSON.stringify({ ...baseActionData, action: 'unarchive' }),
          style: 'default',
          confirm: {
            title: '보관 취소 확인',
            text: '이 이슈의 보관 상태를 취소하시겠습니까?',
            ok_text: '취소',
            dismiss_text: '아니오'
          }
        },
        {
          type: 'button',
          text: '✅ 문제 해결',
          name: 'resolve_issue',
          value: JSON.stringify({ ...baseActionData, action: 'resolve' }),
          style: 'good'
        }
      );
      break;
  }

  return actions;
}

/**
 * Sentry 이슈 생성 이벤트를 Slack 메시지로 변환하는 함수
 * @param sentryData - Sentry 웹훅 데이터
 * @param hasSentryToken - Sentry API 토큰 존재 여부
 * @returns Slack 메시지 객체
 */
export function formatSentryIssueForSlack(sentryData: SentryWebhookData, hasSentryToken: boolean): SlackMessage {
  const { action, data } = sentryData;
  const issue = data.issue;
  
  if (!issue) {
    return {
      text: `🔔 Sentry 이벤트: ${action}`,
      attachments: [
        {
          color: 'warning',
          fields: [
            {
              title: '오류',
              value: '이슈 정보를 찾을 수 없습니다.',
              short: false,
            },
          ],
        },
      ],
    };
  }

  const statusEmoji = getStatusEmoji(issue.status);
  const statusColor = getStatusColor(issue.status);
  
  const fields = [
    {
      title: '프로젝트',
      value: issue.project?.name || 'Unknown',
      short: true,
    },
    {
      title: '상태',
      value: `${statusEmoji} ${issue.status?.toUpperCase() || 'UNKNOWN'}`,
      short: true,
    },
    {
      title: '발생 횟수',
      value: issue.count?.toString() || '0',
      short: true,
    },
    {
      title: '사용자 수',
      value: issue.userCount?.toString() || '0',
      short: true,
    },
  ];

  if (issue.culprit) {
    fields.push({
      title: '위치',
      value: issue.culprit,
      short: false,
    });
  }

  const attachment: SlackAttachment = {
    color: statusColor,
    title: issue.title || 'Unknown Error',
    title_link: issue.permalink,
    fields,
    footer: `Sentry | ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`,
    mrkdwn_in: ['text', 'pretext'],
  };

  // Sentry 토큰이 있을 때만 Interactive 버튼 추가
  if (hasSentryToken && issue.status !== 'resolved') {
    attachment.actions = createActionButtons(
      issue.id, 
      data.project?.organization?.slug || issue.project?.organization?.slug, 
      data.project?.slug || issue.project?.slug
    );
  }

  return {
    text: `🚨 *${getActionText(action)}*`,
    attachments: [attachment],
  };
}

/**
 * Sentry 이슈 상태 변경을 위한 Slack 메시지 업데이트 함수
 * @param sentryData - Sentry 웹훅 데이터
 * @param originalMessage - 원본 Slack 메시지
 * @param hasSentryToken - Sentry API 토큰 존재 여부
 * @returns 업데이트된 Slack 메시지
 */
export function createStatusUpdateMessage(sentryData: SentryWebhookData, hasSentryToken: boolean = false): SlackMessage {
  const { data } = sentryData;
  const issue = data.issue;
  
  if (!issue) {
    return {
      text: '❌ 이슈 정보를 찾을 수 없습니다.',
    };
  }

  const statusEmoji = getStatusEmoji(issue.status);
  const statusColor = getStatusColor(issue.status);
  
  const fields = [
    {
      title: '프로젝트',
      value: issue.project?.name || 'Unknown',
      short: true,
    },
    {
      title: '상태',
      value: `${statusEmoji} ${issue.status?.toUpperCase() || 'UNKNOWN'}`,
      short: true,
    },
    {
      title: '발생 횟수',
      value: issue.count?.toString() || '0',
      short: true,
    },
    {
      title: '사용자 수',
      value: issue.userCount?.toString() || '0',
      short: true,
    },
  ];

  if (issue.culprit) {
    fields.push({
      title: '위치',
      value: issue.culprit,
      short: false,
    });
  }

  const attachment: SlackAttachment = {
    color: statusColor,
    title: issue.title || 'Unknown Error',
    title_link: issue.permalink,
    fields,
    footer: `Sentry | 상태 변경: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`,
    mrkdwn_in: ['text', 'pretext'],
  };

  // 해결되지 않은 상태이고 Sentry 토큰이 있을 때만 액션 버튼 추가
  if (hasSentryToken && issue.status !== 'resolved') {
    attachment.actions = createActionButtons(
      issue.id, 
      data.project?.organization?.slug || issue.project?.organization?.slug, 
      data.project?.slug || issue.project?.slug
    );
  }

  return {
    text: `🔄 *이슈 상태가 변경되었습니다*`,
    attachments: [attachment],
  };
}

/**
 * 채널 ID 형식을 정규화하는 함수
 * @param channelId - 채널 ID 또는 이름
 * @returns 정규화된 채널 ID
 */
export function normalizeChannelId(channelId: string): string {
  if (!channelId.startsWith('C') && !channelId.startsWith('#')) {
    return '#' + channelId;
  }
  return channelId;
}

function createActionButtons(issueId: string, organizationSlug?: string, projectSlug?: string): SlackAction[] {
  if (!organizationSlug || !projectSlug) {
    return [];
  }

  return [
    {
      name: 'sentry_action',
      text: '✅ 해결',
      type: 'button' as const,
      value: `resolve:${issueId}:${organizationSlug}:${projectSlug}`,
      style: 'primary',
      confirm: {
        title: '이슈 해결',
        text: '이 이슈를 해결된 상태로 변경하시겠습니까?',
        ok_text: '해결',
        dismiss_text: '취소',
      },
    },
    {
      name: 'sentry_action',
      text: '🔇 무시',
      type: 'button' as const,
      value: `ignore:${issueId}:${organizationSlug}:${projectSlug}`,
      confirm: {
        title: '이슈 무시',
        text: '이 이슈를 무시하시겠습니까?',
        ok_text: '무시',
        dismiss_text: '취소',
      },
    },
    {
      name: 'sentry_action',
      text: '📦 보관',
      type: 'button' as const,
      value: `archive:${issueId}:${organizationSlug}:${projectSlug}`,
      confirm: {
        title: '이슈 보관',
        text: '이 이슈를 보관하시겠습니까?',
        ok_text: '보관',
        dismiss_text: '취소',
      },
    },
    {
      name: 'sentry_action',
      text: '🗑️ 삭제',
      type: 'button' as const,
      value: `delete:${issueId}:${organizationSlug}:${projectSlug}`,
      style: 'danger',
      confirm: {
        title: '이슈 삭제',
        text: '⚠️ 이 작업은 되돌릴 수 없습니다. 정말로 이 이슈를 삭제하시겠습니까?',
        ok_text: '삭제',
        dismiss_text: '취소',
      },
    },
  ];
}

function getStatusEmoji(status?: string): string {
  const emojiMap: Record<string, string> = {
    'unresolved': '🔴',
    'resolved': '✅',
    'ignored': '🔇',
    'archived': '📦',
  };
  return emojiMap[status || 'unresolved'] || '❓';
}

function getStatusColor(status?: string): string {
  const colorMap: Record<string, string> = {
    'unresolved': 'danger',
    'resolved': 'good',
    'ignored': 'warning',
    'archived': '#808080',
  };
  return colorMap[status || 'unresolved'] || 'warning';
}

function getActionText(action?: string): string {
  const actionMap: Record<string, string> = {
    'created': '새로운 오류가 발생했습니다',
    'resolved': '오류가 해결되었습니다',
    'unresolved': '오류가 다시 발생했습니다',
    'ignored': '오류가 무시되었습니다',
    'assigned': '오류가 할당되었습니다',
  };
  return actionMap[action || 'created'] || `오류 이벤트: ${action}`;
} 