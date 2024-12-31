import { BaseResponseDto } from './baseResponse.type';

interface ProfileType {
  thumbnail: string;
}

interface LoginResponseData {
  id: number;
  username: string;
  profile: ProfileType;
}

export class LoginResponseDto extends BaseResponseDto<LoginResponseData> {
  constructor(
    success: boolean,
    message: string,
    id: number,
    username: string,
    profile: ProfileType,
    error: string | null,
  ) {
    const data = { id, username, profile };
    super(success, message, data, error);
  }
}
