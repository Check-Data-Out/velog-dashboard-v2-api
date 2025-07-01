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
  ignoreCount: string;
  ignoreWindow: string;
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

// 무조건 오류 생성(created) 메세지만 받도록 해 두었기 때문에, 무조건 해당 타입의 형태로 넘어옵니다
// 참고: https://docs.sentry.io/organization/integrations/integration-platform/webhooks/issues/
export interface SentryWebhookData {
  action: 'created';
  installation: { uuid: string };
  data: {
    issue: SentryIssue;
  };
} 