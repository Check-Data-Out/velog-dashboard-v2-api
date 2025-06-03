import logger from '@/configs/logger.config';
import { PostRepository } from '@/repositories/post.repository';
import { RawPostType } from '@/types';
import { getCurrentKSTDateString, getKSTDateStringWithOffset } from '@/utils/date.util';

export class PostService {
  constructor(private postRepo: PostRepository) {}

  async getAllposts(userId: number, cursor?: string, sort: string = '', isAsc?: boolean, limit: number = 15) {
    try {
      let result = null;
      if (sort === 'viewGrowth') {
        result = await this.postRepo.findPostsByUserIdWithGrowthMetrics(userId, cursor, isAsc, limit);
      } else {
        result = await this.postRepo.findPostsByUserId(userId, cursor, sort, isAsc, limit);
      }

      const transformedPosts = result.posts.map((post) => ({
        id: post.id,
        title: post.title,
        slug: post.slug,
        views: post.daily_view_count,
        likes: post.daily_like_count,
        yesterdayViews: post.yesterday_daily_view_count,
        yesterdayLikes: post.yesterday_daily_like_count,
        createdAt: post.post_created_at,
        releasedAt: post.post_released_at,
      }));

      return {
        posts: transformedPosts,
        nextCursor: result.nextCursor,
      };
    } catch (error) {
      logger.error('PostService getAllposts error : ', error);
      throw error;
    }
  }

  async getAllPostsStatistics(userId: number) {
    try {
      const postsStatistics = await this.postRepo.getYesterdayAndTodayViewLikeStats(userId);

      const transformedStatistics = {
        totalViews: parseInt(postsStatistics.daily_view_count) || 0,
        totalLikes: parseInt(postsStatistics.daily_like_count) || 0,
        yesterdayViews: parseInt(postsStatistics.yesterday_views) || 0,
        yesterdayLikes: parseInt(postsStatistics.yesterday_likes) || 0,
        lastUpdatedDate: postsStatistics.last_updated_date,
      };

      return transformedStatistics;
    } catch (error) {
      logger.error('PostService getAllPostsStatistics error : ', error);
      throw error;
    }
  }

  async getTotalPostCounts(id: number) {
    return await this.postRepo.getTotalPostCounts(id);
  }

  async getPostByPostId(postId: number, start?: string, end?: string) {
    // start, end 가 yyyy-mm-dd 만 넘어옴, 이를 kst 형태로 바꿔줘야 함
    const startKST = `${start} 00:00:00+09`;
    const endKST = `${end} 00:00:00+09`;

    try {
      const posts = await this.postRepo.findPostByPostId(postId, startKST, endKST);
      const transformedPosts = this.transformPosts(posts);
      return transformedPosts;
    } catch (error) {
      logger.error('PostService getPost error : ', error);
      throw error;
    }
  }

  async getPostByPostUUID(postUUUID: string) {
    // 날짜가 넘어오지 않기에 기본적으로 7일로 세팅
    const sevenDayAgoKST = getKSTDateStringWithOffset(-24 * 60 * 7);
    const endKST = getCurrentKSTDateString(); // now

    try {
      const posts = await this.postRepo.findPostByPostUUID(postUUUID, sevenDayAgoKST, endKST);
      const transformedPosts = this.transformPosts(posts);
      return transformedPosts;
    } catch (error) {
      logger.error('PostService getPostByPostUUID error : ', error);
      throw error;
    }
  }

  private transformPosts(posts: RawPostType[]) {
    return posts.map((post) => ({
      date: post.date,
      dailyViewCount: post.daily_view_count,
      dailyLikeCount: post.daily_like_count,
    }));
  }
}
