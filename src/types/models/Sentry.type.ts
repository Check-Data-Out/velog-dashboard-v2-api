
export type SentryIssuePriority = 'high' | 'medium' | 'low';

export type SentryIssueStatus = 'resolved' | 'unresolved' | 'ignored';

export type SentryAction = 'created' | 'resolved' | 'unresolved' | 'ignored';

export interface SentryOrganization {
  id: string;
  slug: string;
  name: string;
}

export interface SentryProject {
  id: string;
  name: string;
  slug: string;
  platform?: string;
  organization?: SentryOrganization;
}

export interface SentryIssueMetadata {
  value?: string;
  type?: string;
}

export interface SentryIssue {
  id: string;
  shortId?: string;
  title: string;
  culprit?: string;
  metadata?: SentryIssueMetadata;
  status?: SentryIssueStatus;
  priority?: SentryIssuePriority;
  count: number;
  userCount: number;
  firstSeen: string;
  lastSeen?: string;
  project?: SentryProject;
  platform?: string;
  permalink?: string;
}

export interface SentryActor {
  id: string;
  name: string;
  email?: string;
}

export interface SentryWebhookData {
  action: SentryAction;
  data: {
    issue: SentryIssue;
    project?: SentryProject;
  };
  actor?: SentryActor;
}

export type SentryApiAction = 'resolve' | 'unresolve' | 'ignore' | 'archive' | 'unarchive' | 'delete';

export interface SentryActionData {
  issueId: string;
  organizationSlug: string;
  projectSlug: string;
  action: SentryApiAction;
}

export interface SentryActionResult {
  success: boolean;
  error?: string;
} 