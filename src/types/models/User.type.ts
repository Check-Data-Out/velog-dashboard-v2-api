export interface User {
  id: number;
  velog_uuid: string;
  access_token: string;
  refresh_token: string;
  group_id: number;
  email?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}


export interface SampleUser {
  user: User;
  decryptedAccessToken: string;
  decryptedRefreshToken: string;
}
