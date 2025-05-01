import { BaseResponseDto } from '@/types/dto/responses/baseResponse.type';

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
