import { User } from '@/types';

declare global {
  namespace Express {
    interface Request {
      user: User;
      requestId: string;
      startTime: number;
    }
  }
}
