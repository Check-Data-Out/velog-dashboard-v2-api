import { Type } from 'class-transformer';
import { IsDate, IsOptional } from 'class-validator';

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
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  start?: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  end?: string;

  constructor(start: string, end: string) {
    this.start = start;
    this.end = end;
  }
}
