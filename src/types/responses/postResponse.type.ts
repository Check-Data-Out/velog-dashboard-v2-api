import { BaseResponse } from './baseResponse.type';

interface PostType {
  id: number;
  title: string;
  views: number;
  likes: number;
  yesterdayViews: number;
  yesterdayLikes: number;
  createdAt: string;
  releasedAt: string;
}

interface PostResponseData {
  nextCursor: string | null;
  posts: PostType[];
}

export type PostResponse = BaseResponse<PostResponseData>;
