import { BaseResponseDto } from '@/types/dto/responses/baseResponse.type';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface EmptyResponseData {}
export class EmptyResponseDto extends BaseResponseDto<EmptyResponseData> {}
