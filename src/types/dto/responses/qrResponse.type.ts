import { BaseResponseDto } from '@/types/dto/responses/baseResponse.type';
import { QRLoginTokenStatus } from '@/types/models/QRLoginToken.type';

/**
 * @swagger
 * components:
 *   schemas:
 *     QRLoginTokenResponseData:
 *       type: object
 *       properties:
 *         token:
 *           type: string
 *           minLength: 10
 *           maxLength: 10
 *           example: ABC123EFGH
 *           description: QR 로그인용 10자리 토큰
 */
type Token10 = string & { __lengthBrand: 10 };

export interface QRLoginTokenResponseData {
  token: Token10;
}

/**
 * @swagger
 * components:
 *   schemas:
 *     QRLoginTokenResponseDto:
 *       allOf:
 *         - $ref: '#/components/schemas/BaseResponseDto'
 *         - type: object
 *           properties:
 *             data:
 *               $ref: '#/components/schemas/QRLoginTokenResponseData'
 */
export class QRLoginTokenResponseDto extends BaseResponseDto<QRLoginTokenResponseData> {}

/**
 * @swagger
 * components:
 *   schemas:
 *     QRLoginStatusResponseData:
 *       type: object
 *       required:
 *         - status
 *       properties:
 *         status:
 *           type: string
 *           enum: [pending, used, expired]
 *           description: pending 은 대기, used 는 휴대폰에서 확인됨, expired 는 만료·무효화·없는 토큰
 *         usedAt:
 *           type: string
 *           format: date-time
 *           description: 확인 시각 (used 일 때만)
 *         userAgent:
 *           type: string
 *           nullable: true
 *           description: 확인한 기기의 User-Agent (used 일 때만)
 *         ip:
 *           type: string
 *           nullable: true
 *           description: 확인한 기기의 참고용 IP. x-forwarded-for 첫 값이라 위조될 수 있다 (used 일 때만)
 *     QRLoginStatusResponseDto:
 *       allOf:
 *         - $ref: '#/components/schemas/BaseResponseDto'
 *         - type: object
 *           properties:
 *             data:
 *               $ref: '#/components/schemas/QRLoginStatusResponseData'
 */
export class QRLoginStatusResponseDto extends BaseResponseDto<QRLoginTokenStatus> {}
