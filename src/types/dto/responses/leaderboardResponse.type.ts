import { BaseResponseDto } from '@/types/dto/responses/baseResponse.type';

/**
 * @swagger
 * components:
 *   schemas:
 *     LeaderboardUser:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: 사용자 PK
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
interface LeaderboardUser {
  id: string;
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
 *     UserLeaderboardData:
 *       type: object
 *       properties:
 *         users:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/LeaderboardUser'
 */
export interface UserLeaderboardData {
  users: LeaderboardUser[];
}

/**
 * @swagger
 * components:
 *   schemas:
 *     UserLeaderboardResponseDto:
 *       allOf:
 *         - $ref: '#/components/schemas/BaseResponseDto'
 *         - type: object
 *           properties:
 *             data:
 *               $ref: '#/components/schemas/UserLeaderboardData'
 */
export class UserLeaderboardResponseDto extends BaseResponseDto<UserLeaderboardData> {}

/**
 * @swagger
 * components:
 *   schemas:
 *     LeaderboardPost:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: 게시물 PK
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
interface LeaderboardPost {
  id: string;
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
 *     PostLeaderboardData:
 *       type: object
 *       properties:
 *         posts:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/LeaderboardPost'
 */
export interface PostLeaderboardData {
  posts: LeaderboardPost[];
}

/**
 * @swagger
 * components:
 *   schemas:
 *     PostLeaderboardResponseDto:
 *       allOf:
 *         - $ref: '#/components/schemas/BaseResponseDto'
 *         - type: object
 *           properties:
 *             data:
 *               $ref: '#/components/schemas/PostLeaderboardData'
 */
export class PostLeaderboardResponseDto extends BaseResponseDto<PostLeaderboardData> {}
