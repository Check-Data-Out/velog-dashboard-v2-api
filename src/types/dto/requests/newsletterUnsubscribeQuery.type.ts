import { IsNotEmpty, IsString, Matches } from 'class-validator';

/**
 * @swagger
 * components:
 *   schemas:
 *     NewsletterUnsubscribeQueryDto:
 *       type: object
 *       required:
 *         - uid
 *         - sig
 *       properties:
 *         uid:
 *           type: string
 *           pattern: '^[1-9]\d{0,18}$'
 *           example: '42'
 *           description: 수신거부할 사용자 id (앞자리 0 없는 십진수)
 *         sig:
 *           type: string
 *           example: PJT8snaX4RoJtPxS8SJBVracgxS_c0eIMiT9gFKdIKc
 *           description: 메일 링크에 담긴 서명 (패딩 없는 base64url HMAC-SHA256)
 */
export class NewsletterUnsubscribeQueryDto {
  // 앞자리 0은 서명 입력을 바꾸고 숫자가 아닌 값은 DB 오류를 내므로 서명 확인 전에 거른다
  @IsString()
  @Matches(/^[1-9]\d{0,18}$/)
  uid: string;

  @IsString()
  @IsNotEmpty()
  sig: string;

  constructor(uid: string, sig: string) {
    this.uid = uid;
    this.sig = sig;
  }
}
