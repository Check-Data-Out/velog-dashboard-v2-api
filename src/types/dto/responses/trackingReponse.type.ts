import { BaseResponse } from './baseResponse.type';

type TrackingResponseData = Record<string, never>;
export type TrackingResponse = BaseResponse<TrackingResponseData>;
