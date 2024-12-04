import { VelogUserLoginResponse, VelogUserVerifyResponse } from '../velog.type';

declare global {
  namespace Express {
    interface Request {
      user: VelogUserLoginResponse | VelogUserVerifyResponse;
      tokens: {
        accessToken: string;
        refreshToken: string;
      };
    }
    namespace Express {
      interface CustomError extends Error {
        status: number;
        code: number;
        path: string;
      }
    }
  }
}
