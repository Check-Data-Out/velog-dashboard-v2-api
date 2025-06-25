import { SentryActionData } from '@/types';

/**
 * Sentry API 액션에 따른 새로운 상태를 반환하는 함수
 * @param action - Sentry API 액션
 * @returns 새로운 이슈 상태
 */
export function getNewStatusFromAction(action: string): string {
  const statusMap: Record<string, string> = {
    'resolve': 'resolved',
    'ignore': 'ignored',
    'archive': 'archived',
    'delete': 'deleted',
  };
  
  return statusMap[action] || 'unresolved';
}

/**
 * Sentry API 요청 데이터를 생성하는 함수
 * @param actionData - 액션 데이터
 * @returns API 요청을 위한 데이터와 메소드
 */
export function prepareSentryApiRequest(actionData: SentryActionData): {
  method: 'PUT' | 'DELETE';
  data?: { status: string };
} {
  const { action } = actionData;
  
  switch (action) {
    case 'resolve':
      return { method: 'PUT', data: { status: 'resolved' } };
    case 'unresolve':
      return { method: 'PUT', data: { status: 'unresolved' } };
    case 'archive':
      return { method: 'PUT', data: { status: 'ignored' } };
    case 'unarchive':
      return { method: 'PUT', data: { status: 'unresolved' } };
    case 'delete':
      return { method: 'DELETE' };
    default:
      throw new Error('지원되지 않는 액션입니다.');
  }
}

/**
 * Sentry API URL을 생성하는 함수
 * @param issueId - 이슈 ID
 * @returns Sentry API URL
 */
export function getSentryApiUrl(issueId: string): string {
  return `https://sentry.io/api/0/issues/${issueId}/`;
}

/**
 * Sentry 이슈 URL을 생성하는 함수
 * @param issueId - 이슈 ID
 * @param orgSlug - 조직 슬러그 (기본: velog-dashboardv2)
 * @returns Sentry 이슈 상세 페이지 URL
 */
export function getSentryIssueUrl(issueId: string, orgSlug: string = 'velog-dashboardv2'): string {
  return `https://sentry.io/organizations/${orgSlug}/issues/${issueId}/`;
} 