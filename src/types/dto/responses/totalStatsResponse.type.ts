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
export class TotalStatsResponseDto extends BaseResponseDto<TotalStatsItem[]> {}

/**
 * @swagger
 * components:
 *   schemas:
 *     BadgeUserData:
 *       type: object
 *       required:
 *         - username
 *         - totalViews
 *         - totalLikes
 *         - totalPosts
 *         - viewDiff
 *         - likeDiff
 *         - postDiff
 *       properties:
 *         username:
 *           type: string
 *           description: 사용자명
 *           example: "ljh3478"
 *         totalViews:
 *           type: number
 *           description: 총 조회수
 *           example: 6238
 *         totalLikes:
 *           type: number
 *           description: 총 좋아요 수
 *           example: 150
 *         totalPosts:
 *           type: number
 *           description: 총 게시글 수
 *           example: 10
 *         viewDiff:
 *           type: number
 *           description: 조회수 증가량 (30일 기준)
 *           example: 100
 *         likeDiff:
 *           type: number
 *           description: 좋아요 증가량 (30일 기준)
 *           example: 20
 *         postDiff:
 *           type: number
 *           description: 게시글 증가량 (30일 기준)
 *           example: 2
 */
export interface BadgeUserData {
  username: string;
  totalViews: number;
  totalLikes: number;
  totalPosts: number;
  viewDiff: number;
  likeDiff: number;
  postDiff: number;
}

/**
 * @swagger
 * components:
 *   schemas:
 *     BadgeRecentPost:
 *       type: object
 *       required:
 *         - title
 *         - releasedAt
 *         - viewCount
 *         - likeCount
 *         - viewDiff
 *       properties:
 *         title:
 *           type: string
 *           description: 게시글 제목
 *           example: "Velog Dashboard 회고"
 *         releasedAt:
 *           type: string
 *           format: date-time
 *           description: 게시일
 *           example: "2025-02-28T14:43:58.599Z"
 *         viewCount:
 *           type: number
 *           description: 조회수
 *           example: 67
 *         likeCount:
 *           type: number
 *           description: 좋아요 수
 *           example: 4
 *         viewDiff:
 *           type: number
 *           description: 조회수 증가량
 *           example: 20
 */
export interface BadgeRecentPost {
  title: string;
  releasedAt: string;
  viewCount: number;
  likeCount: number;
  viewDiff: number;
}

/**
 * @swagger
 * components:
 *   schemas:
 *     BadgeData:
 *       type: object
 *       required:
 *         - user
 *         - recentPosts
 *       properties:
 *         user:
 *           $ref: '#/components/schemas/BadgeUserData'
 *         recentPosts:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/BadgeRecentPost'
 *           description: 최근 게시글 목록 (최대 4개)
 *           maxItems: 4
 */
export interface BadgeData {
  user: BadgeUserData;
  recentPosts: BadgeRecentPost[];
}

/**
 * @swagger
 * components:
 *   schemas:
 *     BadgeDataResponseDto:
 *       allOf:
 *         - $ref: '#/components/schemas/BaseResponseDto'
 *         - type: object
 *           properties:
 *             data:
 *               $ref: '#/components/schemas/BadgeData'
 */
export class BadgeDataResponseDto extends BaseResponseDto<BadgeData | null> {}

/**
 * @swagger
 * components:
 *   schemas:
 *     StatsRefreshResponseDto:
 *       allOf:
 *         - $ref: '#/components/schemas/BaseResponseDto'
 *         - type: object
 *           properties:
 *             data:
 *               type: object
 *               nullable: true
 *               properties:
 *                 lastUpdatedAt:
 *                   type: string
 *                   format: date-time
 *                   description: 마지막으로 통계가 갱신된 시각 (ISO 8601, UTC)
 *                   example: "2025-05-23T15:00:00.000Z"
 *               description: 최신 상태 충돌 시 반환되는 마지막 갱신 시각 정보
 */
export class StatsRefreshResponseDto extends BaseResponseDto<{ lastUpdatedAt?: string }> {}
