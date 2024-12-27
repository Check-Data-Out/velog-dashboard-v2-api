import { Pool } from 'pg';
import logger from '../configs/logger.config';
import { DBError } from '../exception';

export class PostRepository {
  constructor(private pool: Pool) {}
  async findPostsByUserId(id: number, cursor?: string, sort?: string, isAsc?: boolean, limit: number = 15) {
    try {
      const query = `
        SELECT
          p.id,
          p.title,
          p.updated_at AS post_updated_at,
          p.created_at AS post_created_at,
          today_stats.daily_view_count,
          today_stats.daily_like_count,
          yesterday_stats.daily_view_count as yesterday_daily_view_count,
          yesterday_stats.daily_like_count as yesterday_daily_like_count,
          today_stats.date
        FROM posts_post p
        LEFT JOIN (
          SELECT post_id, daily_view_count, daily_like_count, date
          FROM posts_postdailystatistics
          WHERE date::date = (CURRENT_DATE AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Seoul')::date
        ) today_stats ON p.id = today_stats.post_id
        LEFT JOIN (
          SELECT post_id, daily_view_count, daily_like_count, date
          FROM posts_postdailystatistics
          WHERE date::date = (CURRENT_DATE AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Seoul' - INTERVAL '1 day')::date
        ) yesterday_stats ON p.id = yesterday_stats.post_id
        WHERE p.user_id = $1
        ${cursor ? 'AND p.id < $2' : ''}
        ORDER BY ${sort ? sort : 'p.updated_at'} ${isAsc ? 'ASC' : 'DESC'}
        LIMIT ${cursor ? '$3' : '$2'}
      `;

      const params = cursor ? [id, cursor, limit] : [id, limit];
      const posts = await this.pool.query(query, params);

      const lastPost = posts.rows[posts.rows.length - 1];
      const nextCursor = lastPost ? lastPost.id : null;

      return {
        posts: posts.rows || null,
        nextCursor,
      };
    } catch (error) {
      logger.error('Post Repo findPostsByUserId error : ', error);
      throw new DBError('전체 post 조회 중 문제가 발생했습니다.');
    }
  }

  async getTotalCounts(id: number) {
    try {
      const query = 'SELECT COUNT(*) FROM "posts_post" WHERE user_id = $1';
      const result = await this.pool.query(query, [id]);
      return parseInt(result.rows[0].count, 10);
    } catch (error) {
      logger.error('Post Repo getTotalCounts error : ', error);
      throw new DBError('전체 post 조회 갯수 조회 중 문제가 발생했습니다.');
    }
  }
}
