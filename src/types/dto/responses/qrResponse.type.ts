import { BaseResponseDto } from '@/types/dto/responses/baseResponse.type';

interface QRLoginTokenResponseData {
    token: string;
  }
  
export class QRLoginTokenResponseDto extends BaseResponseDto<QRLoginTokenResponseData> { }
