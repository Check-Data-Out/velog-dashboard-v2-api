import { BaseResponseDto } from '@/types/dto/responses/baseResponse.type';

type EmptyResponseData = Record<string, never>;
export class EmptyResponseDto extends BaseResponseDto<EmptyResponseData> {}
