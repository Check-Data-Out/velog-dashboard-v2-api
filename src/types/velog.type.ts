export interface VelogUserLoginResponse {
  id: string;
  username: string;
  email?: string;
  profile: {
    thumbnail: string;
  };
}
