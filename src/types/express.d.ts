import { User } from '@/velog.type';

declare global {
  namespace Express {
    interface Request {
      user: User;
      tokens: {
        accessToken: string;
        refreshToken: string;
      };
    }
  }
}
