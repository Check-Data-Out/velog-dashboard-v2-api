import { IsString, Validate } from 'class-validator';

export interface PostParam extends Record<string, string> {
  postId: string;
}

export interface GetPostQuery {
  start?: string;
  end?: string;
}

/**
 * @swagger
 * components:
 *   schemas:
 *     GetPostQueryDto:
 *       type: object
 *       properties:
 *         start:
 *           type: string
 *           format: date
 *           description: 조회 시작 날짜
 *           nullable: true
 *         end:
 *           type: string
 *           format: date
 *           description: 조회 종료 날짜
 *           nullable: true
 */
export class GetPostQueryDto {
  @IsString()
  @Validate((value: string) => {
    const date = new Date(value);
    return !isNaN(date.getTime());
  }, {
    message: '유효한 날짜 형식이 아닙니다. (예: YYYY-MM-DD)'
  })
  start?: string;

  @IsString()
  @Validate((value: string) => {
    const date = new Date(value);
    return !isNaN(date.getTime());
  }, {
    message: '유효한 날짜 형식이 아닙니다. (예: YYYY-MM-DD)'
  })
  end?: string;
}