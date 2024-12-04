export interface VelogUserLoginResponse {
  id: string;
  username: string;
  email: string;
  profile: {
    id: string;
    thumbnail: string;
    display_name: string;
    short_bio: string;
    profile_links: Record<string, string>;
  };
  user_meta: {
    id: string;
    email_notification: boolean;
    email_promotion: boolean;
  };
}
export interface VelogUserVerifyResponse {
  id: string;
  username: string;
  email: string;
}
