import { IsBoolean, IsEmail, IsNotEmpty, IsObject, IsOptional, IsString, IsUrl } from 'class-validator';
import { VelogUserVerifyResponse } from '../velog.type';

export class VelogUserVerifyResponseDto implements VelogUserVerifyResponse {
  @IsNotEmpty()
  @IsString()
  id: string;

  @IsNotEmpty()
  @IsString()
  username: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  constructor(id: string, username: string, email: string) {
    this.id = id;
    this.username = username;
    this.email = email;
  }
}

class ProfileLinksDTO {
  @IsOptional()
  @IsUrl()
  link?: string;
}

class ProfileDTO {
  @IsString()
  id: string;

  @IsString()
  thumbnail: string;

  @IsString()
  display_name: string;

  @IsString()
  short_bio: string;

  @IsObject()
  profile_links: ProfileLinksDTO;

  constructor(id: string, thumbnail: string, display_name: string, short_bio: string, profile_links: ProfileLinksDTO) {
    this.id = id;
    this.thumbnail = thumbnail;
    this.display_name = display_name;
    this.short_bio = short_bio;
    this.profile_links = profile_links;
  }
}

class UserMetaDTO {
  @IsString()
  id: string;

  @IsBoolean()
  email_notification: boolean;

  @IsBoolean()
  email_promotion: boolean;

  constructor(id: string, email_notification: boolean, email_promotion: boolean) {
    this.id = id;
    this.email_notification = email_notification;
    this.email_promotion = email_promotion;
  }
}

export class VelogUserLoginResponseDTO implements VelogUserVerifyResponse {
  @IsString()
  id: string;

  @IsString()
  username: string;

  @IsEmail()
  email: string;

  @IsObject()
  profile: ProfileDTO;

  @IsObject()
  user_meta: UserMetaDTO;

  constructor(id: string, username: string, email: string, profile: ProfileDTO, user_meta: UserMetaDTO) {
    this.id = id;
    this.username = username;
    this.email = email;
    this.profile = profile;
    this.user_meta = user_meta;
  }
}
