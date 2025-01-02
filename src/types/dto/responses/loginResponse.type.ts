import { BaseResponseDto } from '@/types/dto/responses/baseResponse.type';

interface ProfileType {
  thumbnail: string;
}

interface LoginResponseData {
  id: number;
  username: string;
  profile: ProfileType;
}

export class LoginResponseDto extends BaseResponseDto<LoginResponseData> {}
