import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

/**
 * @swagger
 * components:
 *   schemas:
 *     PostSortType:
 *       type: string
 *       enum: ['', 'dailyViewCount', 'dailyLikeCount']
 *       description: |
 *         포스트 정렬 기준
 *         * '' - 작성일
 *         * 'dailyViewCount' - 조회수
 *         * 'dailyLikeCount' - 좋아요수
 *       default: ''
 */
export type PostSortType = '' | 'dailyViewCount' | 'dailyLikeCount';

export interface GetAllPostsQuery {
  cursor?: string;
  sort?: PostSortType;
  asc?: boolean;
}

/**
 * @swagger
 * components:
 *   schemas:
 *     GetAllPostsQueryDto:
 *       type: object
 *       properties:
 *         cursor:
 *           type: string
 *           description: 다음 페이지 조회를 위한 커서값
 *           nullable: true
 *         sort:
 *           $ref: '#/components/schemas/PostSortType'
 *           description: 포스트 정렬 기준
 *           nullable: true
 *         asc:
 *           type: boolean
 *           description: 오름차순 정렬 여부
 *           nullable: true
 *           default: false
 */
export class GetAllPostsQueryDto {
  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @IsString()
  sort?: PostSortType;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  asc?: boolean;

  constructor(cursor: string | undefined, sort: PostSortType, asc: boolean = false) {
    this.cursor = cursor;
    this.sort = sort || '';
    this.asc = asc;
  }
}
