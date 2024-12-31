import { BaseResponseDto } from './baseResponse.type';

interface ProfileType {
  thumbnail: string;
}

interface LoginResponseData {
  id: number;
  username: string;
  profile: ProfileType;
}

export type LoginResponse = BaseResponseDto<LoginResponseData>;
