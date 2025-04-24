import { Transform } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, Max, Min } from 'class-validator';

/**
 * @swagger
 * components:
 *   schemas:
 *     UserLeaderboardSortType:
 *       type: string
 *       description: 사용자 리더보드 정렬 기준
 *       nullable: true
 *       enum: ['viewCount', 'likeCount', 'postCount']
 *       default: 'viewCount'
 */
export type UserLeaderboardSortType = 'viewCount' | 'likeCount' | 'postCount';

/**
 * @swagger
 * components:
 *   schemas:
 *     PostLeaderboardSortType:
 *       type: string
 *       description: 게시물 리더보드 정렬 기준
 *       nullable: true
 *       enum: ['viewCount', 'likeCount']
 *       default: 'viewCount'
 */
export type PostLeaderboardSortType = 'viewCount' | 'likeCount';

interface GetLeaderboardQuery {
  dateRange?: number;
  limit?: number;
}

export interface GetUserLeaderboardQuery extends GetLeaderboardQuery {
  sort?: UserLeaderboardSortType;
}

export interface GetPostLeaderboardQuery extends GetLeaderboardQuery {
  sort?: PostLeaderboardSortType;
}

/**
 * @swagger
 * components:
 *   schemas:
 *     GetLeaderboardQueryDto:
 *       type: object
 *       properties:
 *         dateRange:
 *           type: number
 *           description: 리더보드 조회 기간 (일수)
 *           nullable: true
 *           default: 30
 *           minimum: 1
 *           maximum: 30
 *         limit:
 *           type: number
 *           description: 리더보드 조회 제한 수
 *           nullable: true
 *           default: 10
 *           minimum: 1
 *           maximum: 30
 */
class GetLeaderboardQueryDto {
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => (value === '' ? 30 : Number(value)))
  @Min(1)
  @Max(30)
  dateRange?: number;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => (value === '' ? 10 : Number(value)))
  @Min(1)
  @Max(30)
  limit?: number;

  constructor(dateRange?: number, limit?: number) {
    this.dateRange = dateRange;
    this.limit = limit;
  }
}

/**
 * @swagger
 * components:
 *   schemas:
 *     GetUserLeaderboardQueryDto:
 *       type: object
 *       properties:
 *         sort:
 *           type: string
 *           description: 사용자 리더보드 정렬 기준
 *           nullable: true
 *           enum: ['viewCount', 'likeCount', 'postCount']
 *           default: 'viewCount'
 */
export class GetUserLeaderboardQueryDto extends GetLeaderboardQueryDto {
  @IsOptional()
  @IsEnum(['viewCount', 'likeCount', 'postCount'])
  @Transform(({ value }) => (value === '' ? 'viewCount' : value))
  sort?: UserLeaderboardSortType;

  constructor(sort?: UserLeaderboardSortType) {
    super();
    this.sort = sort;
  }
}

/**
 * @swagger
 * components:
 *   schemas:
 *     GetPostLeaderboardQueryDto:
 *       type: object
 *       properties:
 *         sort:
 *           type: string
 *           description: 게시물 리더보드 정렬 기준
 *           nullable: true
 *           enum: ['viewCount', 'likeCount']
 *           default: 'viewCount'
 */
export class GetPostLeaderboardQueryDto extends GetLeaderboardQueryDto {
  @IsOptional()
  @IsEnum(['viewCount', 'likeCount'])
  @Transform(({ value }) => (value === '' ? 'viewCount' : value))
  sort?: PostLeaderboardSortType;

  constructor(sort?: PostLeaderboardSortType) {
    super();
    this.sort = sort;
  }
}
