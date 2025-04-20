import { NextFunction, Request, RequestHandler, Response } from 'express';
import logger from '@/configs/logger.config';
import { QRLoginTokenService } from "@/services/qr.service";
import { QRLoginTokenResponseDto } from "@/types/dto/responses/qrResponse.type";

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

      const response = new QRLoginTokenResponseDto(
        true,
        'QR 토큰 생성 완료',
        { token: token },
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
        res.status(400).json({ success: false, message: '토큰이 필요합니다.' });
      }

      const found = await this.qrService.getByToken(token);

      if (!found) {
        res.status(404).json({ success: false, message: '유효하지 않거나 만료된 토큰입니다.' });
      }

      res.status(200).json({ success: true, message: '유효한 QR 토큰입니다.', token: found });
    } catch (error) {
      logger.error('QR 토큰 조회 실패', error);
      next(error);
    }
  };
}