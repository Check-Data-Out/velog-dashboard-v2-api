import { User } from '@/types';

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
