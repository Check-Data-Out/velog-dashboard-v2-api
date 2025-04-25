import { NextFunction, Request, RequestHandler, Response } from 'express';
import logger from '@/configs/logger.config';
import { QRLoginTokenService } from "@/services/qr.service";
import { QRLoginTokenResponseDto } from "@/types/dto/responses/qrResponse.type";
import { InvalidTokenError, TokenExpiredError } from '@/exception/token.exception';

// TODO: randomUUID() 기반으로 길이 36
type Token32 = string & { __lengthBrand: 32 };

export class QRLoginController {
  constructor(private qrService: QRLoginTokenService) {}

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
      logger.error('생성 실패:', error);
      next(error);
    }
  };

  getToken: RequestHandler = async (req, res, next) => {
    try {
      const token = req.query.token as string;

      if (!token) {
        throw new InvalidTokenError('토큰이 필요합니다.');
      }

      const found = await this.qrService.getByToken(token);

      if (!found) {
        throw new TokenExpiredError();
      }

      res.status(200).json({ success: true, message: '유효한 QR 토큰입니다.', token: found });
    } catch (error) {
      logger.error('QR 토큰 조회 실패', error);
      next(error);
    }
  };
}
