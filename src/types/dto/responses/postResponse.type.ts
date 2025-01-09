import { BaseResponseDto } from '@/types/dto/responses/baseResponse.type';

// ------ 전체 조회 ------
interface GetAllPostType {
  id: number;
  title: string;
  views: number;
  likes: number;
  yesterdayViews: number;
  yesterdayLikes: number;
  createdAt: string;
  releasedAt: string;
}

interface PostsResponseData {
  nextCursor: string | null;
  posts: GetAllPostType[];
}

export class PostsResponseDto extends BaseResponseDto<PostsResponseData> {}

// ------ 단건 조회 ------
interface GetPostType {
  date: Date;
  dailyViewCount: number;
  dailyLikeCount: number;
}

export interface RawPostType {
  date: Date;
  daily_view_count: number;
  daily_like_count: number;
}
interface PostResponseData {
  post: GetPostType[];
}

export class PostResponseDto extends BaseResponseDto<PostResponseData> {}

// ------ 전체 통계 ------
interface PostStatisticsType {
  totalViews: number;
  totalLikes: number;
  yesterdayViews: number;
  yesterdayLikes: number;
  lastUpdatedDate: string;
}

interface PostStatisticsData {
  totalPostCount: number;
  stats: PostStatisticsType;
}

export class PostStatisticsResponseDto extends BaseResponseDto<PostStatisticsData> {}
