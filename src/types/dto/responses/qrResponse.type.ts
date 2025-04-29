import { BaseResponseDto } from '@/types/dto/responses/baseResponse.type';

type Token10 = string & { __lengthBrand: 10 };

export interface QRLoginTokenResponseData {
  token: Token10;
}

export class QRLoginTokenResponseDto extends BaseResponseDto<QRLoginTokenResponseData> {}
