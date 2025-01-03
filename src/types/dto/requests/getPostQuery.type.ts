import { Type } from 'class-transformer';
import { IsDate, IsOptional } from 'class-validator';

export interface PostParam {
  postId?: string;
}

export interface GetPostQuery {
  start?: string;
  end?: string;
}

export class GetPostQueryDto {
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  start?: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  end?: string;

  constructor(start: string, end: string) {
    this.start = start;
    this.end = end;
  }
}
