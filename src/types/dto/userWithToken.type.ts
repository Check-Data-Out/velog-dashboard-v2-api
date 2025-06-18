import { IsEmail, IsOptional, IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class UserWithTokenDto {
  @IsNotEmpty()
  @IsUUID()
  uuid: string;

  @IsOptional()
  @IsEmail()
  email: string | null = null;  // undefined 가능성 없애고 null 로 고정

  @IsNotEmpty()
  @IsString()
  username: string;

  @IsOptional()
  thumbnail: string | null = null;

  @IsNotEmpty()
  @IsString()
  accessToken: string;

  @IsNotEmpty()
  @IsString()
  refreshToken: string;

  constructor(uuid: string, email: string | null, username: string, thumbnail: string | null,  accessToken: string, refreshToken: string) {
    this.uuid = uuid;
    this.email = email;
    this.username = username;
    this.thumbnail = thumbnail;
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
  }
}
