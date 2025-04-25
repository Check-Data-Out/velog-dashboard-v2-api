import { BaseResponseDto } from '@/types/dto/responses/baseResponse.type';

type Token32 = string & { __lengthBrand: 32 };

export interface QRLoginTokenResponseData {
  token: Token32;
}

export class QRLoginTokenResponseDto extends BaseResponseDto<QRLoginTokenResponseData> {}
