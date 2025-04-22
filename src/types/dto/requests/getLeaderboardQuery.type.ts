import { Transform } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, Max, Min } from 'class-validator';

/**
 * @swagger
 * components:
 *   schemas:
 *     LeaderboardType:
 *       type: string
 *       description: 리더보드 조회 타입
 *       nullable: true
 *       enum: ['user', 'post']
 *       default: 'user'
 */
export type LeaderboardType = 'user' | 'post';

/**
 * @swagger
 * components:
 *   schemas:
 *     LeaderboardSortType:
 *       type: string
 *       description: 리더보드 정렬 기준
 *       nullable: true
 *       enum: ['viewCount', 'likeCount', 'postCount']
 *       default: 'viewCount'
 */
export type LeaderboardSortType = 'viewCount' | 'likeCount' | 'postCount';

export interface GetLeaderboardQuery {
  type?: LeaderboardType;
  sort?: LeaderboardSortType;
  dateRange?: number;
  limit?: number;
}

/**
 * @swagger
 * components:
 *   schemas:
 *     GetLeaderboardQueryDto:
 *       type: object
 *       properties:
 *         type:
 *           $ref: '#/components/schemas/LeaderboardType'
 *           description: 리더보드 조회 타입
 *           nullable: true
 *           default: 'user'
 *         sort:
 *           $ref: '#/components/schemas/LeaderboardSortType'
 *           description: 리더보드 정렬 기준
 *           nullable: true
 *           default: 'viewCount'
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
export class GetLeaderboardQueryDto {
  @IsOptional()
  @IsEnum(['user', 'post'])
  @Transform(({ value }) => (value === '' ? 'user' : value))
  type?: LeaderboardType;

  @IsOptional()
  @IsEnum(['viewCount', 'likeCount', 'postCount'])
  @Transform(({ value }) => (value === '' ? 'viewCount' : value))
  sort?: LeaderboardSortType;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => Number(value))
  @Min(1)
  @Max(30)
  dateRange?: number;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => Number(value))
  @Min(1)
  @Max(30)
  limit?: number;

  constructor(type?: LeaderboardType, sort?: LeaderboardSortType, dateRange?: number, limit?: number) {
    this.type = type;
    this.sort = sort;
    this.dateRange = dateRange;
    this.limit = limit;
  }
}
