import { IsEmail, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class VelogUserLoginDto {
  @IsString()
  id: string;
  @IsString()
  username: string;
  @IsEmail()
  email: string;

  @ValidateNested()
  @Type(() => ProfileDTO)
  profile: ProfileDTO;

  constructor(id: string, username: string, email: string, profile: ProfileDTO) {
    this.id = id;
    this.username = username;
    this.email = email;
    this.profile = profile;
  }
}
class ProfileDTO {
  @IsString()
  thumbnail: string;

  constructor(thumbnail: string) {
    this.thumbnail = thumbnail;
  }
}
