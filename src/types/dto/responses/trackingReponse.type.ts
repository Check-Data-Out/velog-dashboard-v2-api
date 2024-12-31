import { BaseResponseDto } from './baseResponse.type';

type TrackingResponseData = Record<string, never>;
export type TrackingResponse = BaseResponseDto<TrackingResponseData>;
