export interface User {
  id: number;
  velog_uuid: string;
  access_token: string;
  refresh_token: string;
  group_id: number;
  email: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  // 250607 추가
  username: string | null;
  thumbnail: string | null;
  // 251004 추가
  newsletter_subscribed: boolean;
  // 261019 추가 — 로그아웃 시 1 증가, 자체 세션의 ver 와 비교
  session_version: number;
}

export interface SampleUser {
  user: User;
  decryptedAccessToken: string;
  decryptedRefreshToken: string;
}
