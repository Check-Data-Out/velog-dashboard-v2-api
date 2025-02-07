import { BaseResponseDto } from '@/types/dto/responses/baseResponse.type';

// ------ 전체 조회 ------
/**
 * @swagger
 * components:
 *   schemas:
 *     GetAllPostType:
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
 *           description: 게시물 제목
 *         views:
 *           type: integer
 *           description: 게시물 url slug 값
 *         likes:
 *           type: integer
 *           description: 총 좋아요수
 *         yesterdayViews:
 *           type: integer
 *           description: 어제 조회수
 *         yesterdayLikes:
 *           type: integer
 *           description: 어제 좋아요수
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: 생성일시
 *         releasedAt:
 *           type: string
 *           format: date-time
 *           description: 공개일시
 */
interface GetAllPostType {
  id: number;
  title: string;
  slug: string;
  views: number;
  likes: number;
  yesterdayViews: number;
  yesterdayLikes: number;
  createdAt: string;
  releasedAt: string;
}

/**
 * @swagger
 * components:
 *   schemas:
 *     PostsResponseData:
 *       type: object
 *       properties:
 *         nextCursor:
 *           type: string
 *           nullable: true
 *           description: 다음 페이지 커서값
 *         posts:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/GetAllPostType'
 */
interface PostsResponseData {
  nextCursor: string | null;
  posts: GetAllPostType[];
}

/**
 * @swagger
 * components:
 *   schemas:
 *     PostsResponseDto:
 *       allOf:
 *         - $ref: '#/components/schemas/BaseResponseDto'
 *         - type: object
 *           properties:
 *             data:
 *               $ref: '#/components/schemas/PostsResponseData'
 */

export class PostsResponseDto extends BaseResponseDto<PostsResponseData> {}

// ------ 단건 조회 ------
/**
 * @swagger
 * components:
 *   schemas:
 *     GetPostType:
 *       type: object
 *       properties:
 *         date:
 *           type: string
 *           format: date
 *           description: 통계 날짜
 *         dailyViewCount:
 *           type: integer
 *           description: 일일 조회수
 *         dailyLikeCount:
 *           type: integer
 *           description: 일일 좋아요수
 */
interface GetPostType {
  date: Date;
  dailyViewCount: number;
  dailyLikeCount: number;
}

/**
 * @swagger
 * components:
 *   schemas:
 *     PostResponseData:
 *       type: object
 *       properties:
 *         post:
 *           type: array
 *           nullable: true
 *           description: 기간 별 조회된 포스터 통계
 *           items:
 *             $ref: '#/components/schemas/GetPostType'
 */
export interface RawPostType {
  date: Date;
  daily_view_count: number;
  daily_like_count: number;
}
interface PostResponseData {
  post: GetPostType[];
}

/**
 * @swagger
 * components:
 *   schemas:
 *     PostResponseDto:
 *       allOf:
 *         - $ref: '#/components/schemas/BaseResponseDto'
 *         - type: object
 *           properties:
 *             data:
 *               $ref: '#/components/schemas/PostResponseData'
 */
export class PostResponseDto extends BaseResponseDto<PostResponseData> {}

// ------ 전체 통계 조회 ------
/**
 * @swagger
 * components:
 *   schemas:
 *     PostStatisticsType:
 *       type: object
 *       properties:
 *         totalViews:
 *           type: integer
 *           description: 전체 조회수
 *         totalLikes:
 *           type: integer
 *           description: 전체 좋아요수
 *         yesterdayViews:
 *           type: integer
 *           description: 어제 조회수
 *         yesterdayLikes:
 *           type: integer
 *           description: 어제 좋아요수
 *         lastUpdatedDate:
 *           type: string
 *           format: date-time
 *           description: 마지막 업데이트 일시
 */
interface PostStatisticsType {
  totalViews: number;
  totalLikes: number;
  yesterdayViews: number;
  yesterdayLikes: number;
  lastUpdatedDate: string;
}

/**
 * @swagger
 * components:
 *   schemas:
 *     PostStatisticsData:
 *       type: object
 *       properties:
 *         totalPostCount:
 *           type: integer
 *           description: 전체 게시물 수
 *         stats:
 *           $ref: '#/components/schemas/PostStatisticsType'
 */
interface PostStatisticsData {
  totalPostCount: number;
  stats: PostStatisticsType;
}

/**
 * @swagger
 * components:
 *   schemas:
 *     PostStatisticsResponseDto:
 *       allOf:
 *         - $ref: '#/components/schemas/BaseResponseDto'
 *         - type: object
 *           properties:
 *             data:
 *               $ref: '#/components/schemas/PostStatisticsData'
 */
export class PostStatisticsResponseDto extends BaseResponseDto<PostStatisticsData> {}
