import { BaseResponseDto } from '@/types/dto/responses/baseResponse.type';

/**
 * @swagger
 * components:
 *   schemas:
 *     LeaderboardUserType:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: 사용자 ID
 *         email:
 *           type: string
 *           description: 사용자 이메일
 *         totalViews:
 *           type: integer
 *           description: 누적 조회수
 *         totalLikes:
 *           type: integer
 *           description: 누적 좋아요 수
 *         totalPosts:
 *           type: integer
 *           description: 누적 게시물 수
 *         viewDiff:
 *           type: integer
 *           description: 구간 조회수 상승값
 *         likeDiff:
 *           type: integer
 *           description: 구간 좋아요 수 상승값
 *         postDiff:
 *           type: integer
 *           description: 구간 게시물 수 상승값
 */
export interface LeaderboardUserType {
  id: number;
  email: string;
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
 *     LeaderboardPostType:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: 게시물 ID
 *         title:
 *           type: string
 *           description: 게시물 제목
 *         slug:
 *           type: string
 *           description: 게시물 url slug 값
 *         totalViews:
 *           type: integer
 *           description: 누적 조회수
 *         totalLikes:
 *           type: integer
 *           description: 누적 좋아요 수
 *         viewDiff:
 *           type: integer
 *           description: 구간 조회수 상승값
 *         likeDiff:
 *           type: integer
 *           description: 구간 좋아요 수 상승값
 *         releasedAt:
 *           type: string
 *           format: date-time
 *           description: 게시물 업로드 일시
 */
export interface LeaderboardPostType {
  id: number;
  title: string;
  slug: string;
  totalViews: number;
  totalLikes: number;
  viewDiff: number;
  likeDiff: number;
  releasedAt: string;
}

/**
 * @swagger
 * components:
 *   schemas:
 *     LeaderboardResponseData:
 *       type: object
 *       properties:
 *         posts:
 *           type: array
 *           nullable: true
 *           items:
 *             $ref: '#/components/schemas/LeaderboardPostType'
 *         users:
 *           type: array
 *           nullable: true
 *           items:
 *             $ref: '#/components/schemas/LeaderboardUserType'
 */
export interface LeaderboardResponseData {
  users: LeaderboardUserType[] | null;
  posts: LeaderboardPostType[] | null;
}

/**
 * @swagger
 * components:
 *   schemas:
 *     LeaderboardResponseDto:
 *       allOf:
 *         - $ref: '#/components/schemas/BaseResponseDto'
 *         - type: object
 *           properties:
 *             data:
 *               $ref: '#/components/schemas/LeaderboardResponseData'
 */
export class LeaderboardResponseDto extends BaseResponseDto<LeaderboardResponseData> {}
