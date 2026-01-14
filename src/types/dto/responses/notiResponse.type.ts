import { BaseResponseDto } from '@/types/dto/responses/baseResponse.type';
import { NotiPost } from '@/types/models/NotiPost.type';

/**
 * @swagger
 * components:
 *   schemas:
 *     NotiPostsResponseData:
 *       type: object
 *       properties:
 *         posts:
 *           type: array
 *           description: 알림 게시글 목록
 *           items:
 *             $ref: '#/components/schemas/NotiPost'
 */
interface NotiPostsResponseData {
  posts: NotiPost[];
}

/**
 * @swagger
 * components:
 *   schemas:
 *     NotiPostsResponseDto:
 *       allOf:
 *         - $ref: '#/components/schemas/BaseResponseDto'
 *         - type: object
 *           properties:
 *             data:
 *               $ref: '#/components/schemas/NotiPostsResponseData'
 */
export class NotiPostsResponseDto extends BaseResponseDto<NotiPostsResponseData> {}
