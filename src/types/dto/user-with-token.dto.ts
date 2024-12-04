import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class UserWithTokenDto {
  @IsNotEmpty()
  @IsString()
  id: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  accessToken: string;

  @IsNotEmpty()
  @IsString()
  refreshToken: string;

  constructor(id: string, email: string, accessToken: string, refreshToken: string) {
    this.id = id;
    this.email = email;
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
  }
}
