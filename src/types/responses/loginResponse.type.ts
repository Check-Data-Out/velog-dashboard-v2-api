import { BaseResponse } from './baseResponse.type';

interface ProfileType {
  thumbnail: string;
}

interface LoginResponseData {
  id: number;
  username: string;
  profile: ProfileType;
}

export type LoginResponse = BaseResponse<LoginResponseData>;
