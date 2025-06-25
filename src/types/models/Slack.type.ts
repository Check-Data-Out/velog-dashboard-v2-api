export interface SlackAttachmentField {
  title: string;
  value: string;
  short: boolean;
}

export interface SlackAction {
  type: 'button';
  text: string;
  name?: string;
  value?: string;
  url?: string;
  style?: 'default' | 'primary' | 'danger' | 'good';
  confirm?: {
    title: string;
    text: string;
    ok_text: string;
    dismiss_text: string;
  };
}

export interface SlackAttachment {
  callback_id?: string;
  color?: string;
  fields?: SlackAttachmentField[];
  actions?: SlackAction[];
  footer?: string;
  footer_icon?: string;
  ts?: number;
  text?: string;
  title?: string;
  title_link?: string;
  mrkdwn_in?: string[];
}

export interface SlackMessage {
  text: string;
  attachments?: SlackAttachment[];
  response_type?: 'in_channel' | 'ephemeral';
  [key: string]: unknown;
}

export interface SlackInteractiveAction {
  name: string;
  value: string;
  type: string;
}

export interface SlackInteractivePayload {
  type: string;
  callback_id?: string;
  actions?: SlackInteractiveAction[];
  original_message?: SlackMessage;
  response_url?: string;
  user?: {
    id: string;
    name: string;
  };
}

export interface StoredMessageInfo {
  channel: string;
  ts: string;
  timestamp: number;
}

export interface SlackApiResponse {
  success: boolean;
  error?: string;
  data?: unknown;
}

export interface SlackBotInfo {
  userId: string;
  username: string;
  teamId: string;
  teamName: string;
}

export interface SlackPermissionsData {
  hasToken: boolean;
  isValid: boolean;
  permissions: string[];
  botInfo: SlackBotInfo | null;
  channelAccess: boolean;
  recommendations: string[];
} 