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
}


export interface SampleUser {
  user: User;
  decryptedAccessToken: string;
  decryptedRefreshToken: string;
}
