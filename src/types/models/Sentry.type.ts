export type SentryIssueStatus = 'resolved' | 'unresolved' | 'ignored';

export type SentryAction = 'created' | 'resolved' | 'unresolved' | 'ignored';

export interface SentryProject {
  id: string;
  name: string;
  slug: string;
  platform?: string;
}

export interface SentryIssue {
  id: string;
  title: string;
  culprit?: string;
  status?: SentryIssueStatus;
  count: number;
  userCount: number;
  firstSeen: string;
  lastSeen?: string;
  project?: SentryProject;
  permalink?: string;
}

export interface SentryWebhookData {
  action: SentryAction;
  data: {
    issue: SentryIssue;
    project?: SentryProject;
  };
} 