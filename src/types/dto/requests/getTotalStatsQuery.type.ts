import { Transform } from 'class-transformer';
import { IsEnum, IsOptional } from 'class-validator';

export type TotalStatsPeriod = 7 | 30;
export type TotalStatsType = 'view' | 'like' | 'post';

export interface GetTotalStatsQuery {
  period?: TotalStatsPeriod;
  type?: TotalStatsType;
}

/**
 * @swagger
 * components:
 *   schemas:
 *     GetTotalStatsQueryDto:
 *       type: object
 *       required:
 *         - type
 *       properties:
 *         period:
 *           type: number
 *           description: 통계 조회 기간 (일수)
 *           enum: [7, 30]
 *           default: 7
 *         type:
 *           type: string
 *           description: 통계 타입
 *           enum: ['view', 'like', 'post']
 */
export class GetTotalStatsQueryDto {
  @IsOptional()
  @IsEnum([7, 30])
  @Transform(({ value }) => (value === '' ? 7 : Number(value)))
  period?: TotalStatsPeriod;

  @IsEnum(['view', 'like', 'post'])
  type: TotalStatsType;

  constructor(period?: TotalStatsPeriod, type?: TotalStatsType) {
    this.period = period || 7;
    this.type = type || 'view';
  }
}
