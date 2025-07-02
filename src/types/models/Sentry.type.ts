// 모든 상세 타입의 정보는 해당 문서 페이지에서 확인하실 수 있습니다.
// Sentry AI 왈 내용이 문서와 실제 전송되는 값들이 조금씩 다를 수 있다고 하는데, 전체적인 구조와 각 값의 타입은 동일하다고 하네요
// 참고: https://docs.sentry.io/organization/integrations/integration-platform/webhooks/issues/#statusdetails

export type SentryIssueStatus = 'resolved' | 'unresolved' | 'ignored';
export type SentryIssueSubStatus = "archived_until_escalating" | "archived_until_condition_met" | "archived_forever" | "escalating" | "ongoing" | "regressed" | "new"

export interface SentryProject {
  id: string;
  name: string;
  slug: string;
  platform?: string;
}

export interface SentryMetadata {
  filename: string;
  type: string;
  value: string;
}

export interface SentryIssueStatusDetails {
  inRelease: string;
  inNextRelease: boolean;
  inCommit: string;
  ignoreCount: number;
  ignoreWindow: number;
}

export interface SentryIssue {
  url?: string;
  web_url?: string;
  project_url?: string;
  id: string;
  shareId?: string | null;
  shortId: string;
  title: string;
  culprit: string;
  permalink?: string | null;
  logger?: string | null;
  level: string;
  status: SentryIssueStatus;
  statusDetails?: SentryIssueStatusDetails;
  substatus: SentryIssueSubStatus;
  isPublic: boolean;
  platform: string;
  project: SentryProject;
  type: string;
  metadata?: SentryMetadata;
  numComments: number;
  assignedTo?: string | null;
  isBookmarked: boolean;
  isSubscribed: boolean;
  subscriptionDetails?: string | null;
  hasSeen: boolean;
  annotations: [];
  issueType: string;
  issueCategory: string;
  priority: string;
  priorityLockedAt?: string | null;
  seerFixabilityScore?: string | null;
  seerAutofixLastTriggered?: string | null;
  isUnhandled: boolean;
  count: string;
  userCount: number;
  firstSeen: string;
  lastSeen: string;
}

export interface SentryWebhookData {
  action: 'created';
  installation: { uuid: string };
  data: {
    issue: SentryIssue;
  };
  actor: {
    type: string;
    id: string;
    name: string;
  };
} 