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
  start?: string;
  @IsOptional()
  @IsDate()
  end?: string;

  constructor(start: string, end: string) {
    this.start = start;
    this.end = end;
  }
}
