import { BaseResponseDto } from '@/types/dto/responses/baseResponse.type';

/**
 * @swagger
 * components:
 *   schemas:
 *     ProfileType:
 *       type: object
 *       properties:
 *         thumbnail:
 *           type: string
 *           description: 프로필 이미지 URL
 */
interface ProfileType {
  thumbnail: string;
}

/**
 * @swagger
 * components:
 *   schemas:
 *     LoginResponseData:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: 사용자 ID
 *         username:
 *           type: string
 *           description: 사용자 이름
 *         profile:
 *           $ref: '#/components/schemas/ProfileType'
 */
interface LoginResponseData {
  id: number;
  username: string;
  profile: ProfileType;
}

/**
 * @swagger
 * components:
 *   schemas:
 *     LoginResponseDto:
 *       allOf:
 *         - $ref: '#/components/schemas/BaseResponseDto'
 *         - type: object
 *           properties:
 *             data:
 *               $ref: '#/components/schemas/LoginResponseData'
 */
export class LoginResponseDto extends BaseResponseDto<LoginResponseData> {}
