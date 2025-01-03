import { VelogUserLoginResponse } from '@/velog.type';

declare global {
  namespace Express {
    interface Request {
      user: VelogUserLoginResponse;
      tokens: {
        accessToken: string;
        refreshToken: string;
      };
    }
  }
}
