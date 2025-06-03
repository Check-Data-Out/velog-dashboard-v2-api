import { BaseResponseDto } from '@/types/dto/responses/baseResponse.type';

/**
 * @swagger
 * components:
 *   schemas:
 *     TotalStatsItem:
 *       type: object
 *       required:
 *         - date
 *         - value
 *       properties:
 *         date:
 *           type: string
 *           format: date-time
 *           description: 통계 날짜 (ISO 8601 형식, UTC 기준)
 *           example: "2025-05-23T15:00:00.000Z"
 *         value:
 *           type: integer
 *           description: 통계 값 (조회수/좋아요수/게시글수)
 *           minimum: 0
 *           example: 619
 */
export interface TotalStatsItem {
  date: string;
  value: number;
}

/**
 * @swagger
 * components:
 *   schemas:
 *     TotalStatsResponseDto:
 *       allOf:
 *         - $ref: '#/components/schemas/BaseResponseDto'
 *         - type: object
 *           properties:
 *             data:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/TotalStatsItem'
 *               description: 기간별 통계 데이터 배열
 */
export class TotalStatsResponseDto extends BaseResponseDto<TotalStatsItem[]> { }