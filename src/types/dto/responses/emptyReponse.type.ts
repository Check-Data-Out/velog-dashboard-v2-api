import { BaseResponseDto } from './baseResponse.type';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface EmptyResponseData {}
export class EmptyResponseDto extends BaseResponseDto<EmptyResponseData> {
  constructor(success: boolean, message: string, error: string | null = null) {
    super(success, message, {}, error);
  }
}
