import { BaseResponseDto } from './baseResponse.type';

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

export class PostsResponseDto extends BaseResponseDto<PostsResponseData> {
  constructor(
    success: boolean,
    message: string,
    nextCursor: string | null,
    posts: GetAllPostType[],
    error: string | null,
  ) {
    const data = { nextCursor, posts };
    super(success, message, data, error);
  }
}
// ------ 단건 조회 ------
interface GetPostType {
  date: string;
  dailyViewCount: number;
  dailyLikeCount: number;
}

interface PostResponseData {
  post: GetPostType[];
}

export class PostResponseDto extends BaseResponseDto<PostResponseData> {
  constructor(success: boolean, message: string, post: GetPostType[], error: string | null) {
    const data = { post };
    super(success, message, data, error);
  }
}
/**
 *     "data": {
        "totalPostCount": 90,
        "stats": {
            "totalViews": 1470,
            "totalLikes": 11,
            "yesterdayViews": 1469,
            "yesterdayLikes": 11,
            "lastUpdatedDate": "2024-12-31T00:15:23.704Z"
        }
 */
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
export class PostStatisticsResponseDto extends BaseResponseDto<PostStatisticsData> {
  constructor(
    success: boolean,
    message: string,
    totalPostCount: number,
    stats: PostStatisticsType,
    error: string | null,
  ) {
    const data = { totalPostCount, stats };
    super(success, message, data, error);
  }
}
