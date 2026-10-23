import { IsString, Length } from 'class-validator';

/**
 * @swagger
 * components:
 *   schemas:
 *     QRLoginConfirmRequestDto:
 *       type: object
 *       required:
 *         - token
 *       properties:
 *         token:
 *           type: string
 *           minLength: 10
 *           maxLength: 10
 *           example: ABC123EFGH
 *           description: QR 코드에 담긴 10자리 토큰
 */
export class QRLoginConfirmRequestDto {
  @IsString()
  @Length(10, 10)
  token: string;

  constructor(token: string) {
    this.token = token;
  }
}
