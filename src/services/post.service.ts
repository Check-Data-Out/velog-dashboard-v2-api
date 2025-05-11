import logger from '@/configs/logger.config';
import { PostRepository } from '@/repositories/post.repository';
import { RawPostType } from '@/types';

export class PostService {
  constructor(private postRepo: PostRepository) { }

  async getAllposts(userId: number, cursor?: string, sort: string = '', isAsc?: boolean, limit: number = 15) {
    try {
      let result = null;
      if (sort === "viewGrowth") {
        result = await this.postRepo.findPostsByUserIdWithGrowthMetrics(userId, cursor, isAsc, limit);
      }
      else {
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
    const kstStart = `${start} 00:00:00+09`;
    const kstEnd = `${end} 00:00:00+09`;

    try {
      const posts = await this.postRepo.findPostByPostId(postId, kstStart, kstEnd);

      const transformedPosts = this.transformPosts(posts);

      return transformedPosts;
    } catch (error) {
      logger.error('PostService getPost error : ', error);
      throw error;
    }
  }

  // !! 해당 함수 사용하지 않는 것으로 보임, 추후 정리 필요
  async getPostByPostUUID(postUUUID: string) {
    try {
      const seoulNow = new Date(new Date().getTime() + 9 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(seoulNow);

      const start = sevenDaysAgo.toISOString().split('T')[0];
      const end = seoulNow.toISOString().split('T')[0];
      sevenDaysAgo.setDate(seoulNow.getDate() - 6);

      // start, end 가 무조건 yyyy-mm-dd 로 넘어옴
      console.log(start, end);
      const posts = await this.postRepo.findPostByPostUUID(postUUUID, start, end);

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
