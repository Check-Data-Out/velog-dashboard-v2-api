import { BaseResponseDto } from '@/types/dto/responses/baseResponse.type';

type EmptyResponseData = Record<string, never>;
/**
 * @swagger
 * components:
 *   schemas:
 *     EmptyResponseDto:
 *       allOf:
 *         - $ref: '#/components/schemas/BaseResponseDto'
 *         - type: object
 *           properties:
 *             data:
 *               type: object
 *               properties: {}
 */
export class EmptyResponseDto extends BaseResponseDto<EmptyResponseData> {}
