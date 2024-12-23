import { Pool } from 'pg';
import logger from '../configs/logger.config';
import { DBError } from '../exception';

export class PostRepository {
  constructor(private pool: Pool) {}
  async findPostsByUserId(id: number, cursor?: string, limit: number = 5) {
    try {
      const query = `
      SELECT
        p.id,
        p.title,
        p.updated_at,
        pds.daily_view_count,
        pds.daily_like_count
      FROM posts_post p
      LEFT JOIN posts_postdailystatistics pds on p.id = pds.post_id
      WHERE p.user_id = $1
        ${cursor ? 'AND p.id < $2' : ''}
      ORDER BY p.created_at DESC
      LIMIT ${cursor ? '$3' : '$2'}
    `;

      const params = cursor ? [id, cursor, limit] : [id, limit];
      const posts = await this.pool.query(query, params);

      // 다음 커서는 마지막 항목의 id
      const lastItem = posts.rows[posts.rows.length - 1];
      const nextCursor = lastItem ? lastItem.id : null;

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
