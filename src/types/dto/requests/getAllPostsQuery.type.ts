import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export type PostSortType = '' | 'dailyViewCount' | 'dailyLikeCount';

export interface GetAllPostsQuery {
  cursor?: string;
  sort?: PostSortType;
  asc?: boolean;
}

export class GetAllPostsQueryDto {
  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @IsString()
  sort?: PostSortType;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  asc?: boolean;

  constructor(cursor: string | undefined, sort: PostSortType, asc: boolean = false) {
    this.cursor = cursor;
    this.sort = sort || '';
    this.asc = asc;
  }
}
