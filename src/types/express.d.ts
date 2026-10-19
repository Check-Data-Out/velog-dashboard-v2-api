import { User } from '@/types';

declare global {
  namespace Express {
    interface Request {
      user: User;
      // velog 토큰(레거시 쿠키·헤더)으로 인증한 요청에만 있다. 세션 쿠키로 인증하면 없음
      tokens?: {
        accessToken: string;
        refreshToken: string;
      };
      requestId: string;
      startTime: number;
    }
  }
}
