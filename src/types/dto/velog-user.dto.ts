import { IsEmail, IsObject, IsString, ValidateNested } from 'class-validator';
import { VelogUserLoginResponse } from '../velog.type';
import { Type } from 'class-transformer';

export class VelogUserLoginDto implements VelogUserLoginResponse {
  @IsString()
  id!: string;
  @IsString()
  username!: string;
  @IsEmail()
  email!: string;
  @IsObject()
  @ValidateNested()
  @Type(() => ProfileDTO)
  profile!: ProfileDTO;
}
class ProfileDTO {
  @IsString()
  thumbnail: string;

  constructor(thumbnail: string) {
    this.thumbnail = thumbnail;
  }
}
