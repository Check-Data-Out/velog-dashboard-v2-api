/**
 * @swagger
 * components:
 *   schemas:
 *     BaseResponseDto:
 *       type: object
 *       required:
 *         - success
 *         - message
 *         - data
 *         - error
 *       properties:
 *         success:
 *           type: boolean
 *           description: 요청 성공 여부
 *         message:
 *           type: string
 *           description: 응답 메시지
 *         data:
 *           type: object
 *           description: 응답 데이터 (구체적인 타입은 각 엔드포인트에서 정의)
 *           nullable: true
 *         error:
 *           type: string
 *           description: 에러 메시지
 *           nullable: true
 */
export class BaseResponseDto<T> {
  success: boolean;
  message: string;
  data: T;
  error: string | null;

  constructor(success: boolean, message: string, data: T, error: string | null) {
    this.success = success;
    this.message = message;
    this.data = data;
    this.error = error;
  }
}
