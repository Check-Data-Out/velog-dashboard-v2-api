import { NextFunction, Request, RequestHandler, Response } from 'express';
import logger from '@/configs/logger.config';
import { QRLoginTokenService } from "@/services/qr.service";
import { QRLoginTokenResponseDto } from "@/types/dto/responses/qrResponse.type";
import { InvalidTokenError, TokenExpiredError } from '@/exception/token.exception';
import { UserService } from '@/services/user.service';
import { NotFoundError } from '@/exception';
import { CookieOptions } from 'express';

type Token32 = string & { __lengthBrand: 32 };

export class QRLoginController {
  constructor(
    private qrService: QRLoginTokenService,
    private userService: UserService
  ) {}

  private cookieOption(): CookieOptions {
    const isProd = process.env.NODE_ENV === 'production';

    const baseOptions: CookieOptions = {
      httpOnly: isProd,
      secure: isProd,
    };

    if (isProd) {
      baseOptions.sameSite = 'lax';
      baseOptions.domain = "velog-dashboard.kro.kr";
    } else {
      baseOptions.domain = 'localhost';
    }

    return baseOptions;
  }

  createToken: RequestHandler = async (
    req: Request,
    res: Response<QRLoginTokenResponseDto>,
    next: NextFunction,
  ) => {
    try {
      const user = req.user;
      const ip = req.ip ?? '';
      const userAgent = req.headers['user-agent'] || '';

      const token = await this.qrService.create(user.id, ip, userAgent);
      const typedToken = token as Token32;

      const response = new QRLoginTokenResponseDto(
        true,
        'QR 토큰 생성 완료',
        { token: typedToken },
        null
      );
      res.status(200).json(response);
    } catch (error) {
      logger.error('QR 토큰 생성 실패:', error);
      next(error);
    }
  };

  getToken: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = req.query.token as string;
      if (!token) {
        throw new InvalidTokenError('토큰이 필요합니다.');
      }

      const found = await this.qrService.useToken(token);
      if (!found) {
        throw new TokenExpiredError();
      }

      const user = await this.userService.findByVelogUUID(found.user.toString());
      if (!user) throw new NotFoundError('유저를 찾을 수 없습니다.');

      const { decryptedAccessToken, decryptedRefreshToken } = this.userService.getDecryptedTokens(  
        user.group_id,  
        user.access_token,  
        user.refresh_token  
      );

      res.clearCookie('access_token', this.cookieOption());
      res.clearCookie('refresh_token', this.cookieOption());

      res.cookie('access_token', decryptedAccessToken, this.cookieOption());
      res.cookie('refresh_token', decryptedRefreshToken, this.cookieOption());

      res.redirect('/main');
    } catch (error) {
      logger.error('QR 토큰 로그인 처리 실패', error);
      next(error);
    }
  };
}
