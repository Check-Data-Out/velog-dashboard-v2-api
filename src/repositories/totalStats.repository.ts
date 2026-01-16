import { Pool } from 'pg';
import logger from '@/configs/logger.config';
import { DBError } from '@/exception';
import { TotalStatsType } from '@/types';
import { getKSTDateStringWithOffset } from '@/utils/date.util';

interface RawStatsResult {
  date: string;
  total_value: string | number;
}

export class TotalStatsRepository {
  constructor(private pool: Pool) {}

  private async getTotalViewStats(userId: number, period: number): Promise<RawStatsResult[]> {
    try {
      const startDateKST = getKSTDateStringWithOffset(-period * 24 * 60);

      const query = `
        SELECT 
          pds.date,
          COALESCE(SUM(pds.daily_view_count), 0) AS total_value
        FROM posts_postdailystatistics pds
        JOIN posts_post p ON p.id = pds.post_id
        WHERE p.user_id = $1 
          AND p.is_active = true
          AND pds.date >= $2
        GROUP BY pds.date
        ORDER BY pds.date ASC;
      `;

      const result = await this.pool.query(query, [userId, startDateKST]);
      return result.rows;
    } catch (error) {
      logger.error('TotalStats Repo getTotalViewStats error:', error);
      throw new DBError('조회수 통계 조회 중 문제가 발생했습니다.');
    }
  }

  private async getTotalLikeStats(userId: number, period: number): Promise<RawStatsResult[]> {
    try {
      const startDateKST = getKSTDateStringWithOffset(-period * 24 * 60);

      const query = `
        SELECT 
          pds.date,
          COALESCE(SUM(pds.daily_like_count), 0) AS total_value
        FROM posts_postdailystatistics pds
        JOIN posts_post p ON p.id = pds.post_id
        WHERE p.user_id = $1 
          AND p.is_active = true
          AND pds.date >= $2
        GROUP BY pds.date
        ORDER BY pds.date ASC;
      `;

      const result = await this.pool.query(query, [userId, startDateKST]);
      return result.rows;
    } catch (error) {
      logger.error('TotalStats Repo getTotalLikeStats error:', error);
      throw new DBError('좋아요 통계 조회 중 문제가 발생했습니다.');
    }
  }

  private async getTotalPostStats(userId: number, period: number): Promise<RawStatsResult[]> {
    try {
      const startDateKST = getKSTDateStringWithOffset(-period * 24 * 60);

      const query = `
        WITH date_series AS (
          SELECT generate_series(
            DATE($2),
            CURRENT_DATE,
            '1 day'::interval
          )::date AS date
        )
        SELECT 
          ds.date,
          (SELECT COUNT(id) 
          FROM posts_post p 
          WHERE p.user_id = $1 
            AND p.is_active = true 
            AND DATE(p.released_at) <= ds.date
          ) AS total_value
        FROM date_series ds
        ORDER BY ds.date ASC;
      `;

      const result = await this.pool.query(query, [userId, startDateKST]);
      return result.rows;
    } catch (error) {
      logger.error('TotalStats Repo getTotalPostStats error:', error);
      throw new DBError('게시글 통계 조회 중 문제가 발생했습니다.');
    }
  }

  async getTotalStats(userId: number, period: number, type: TotalStatsType): Promise<RawStatsResult[]> {
    switch (type) {
      case 'view':
        return this.getTotalViewStats(userId, period);
      case 'like':
        return this.getTotalLikeStats(userId, period);
      case 'post':
        return this.getTotalPostStats(userId, period);
      default:
        throw new DBError('지원되지 않는 통계 타입입니다.');
    }
  }

  async getUserBadgeStats(username: string, dateRange: number = 30) {
    try {
      const pastDateKST = getKSTDateStringWithOffset(-dateRange * 24 * 60);

      const query = `
      WITH 
      user_posts AS (
        SELECT p.id, p.released_at
        FROM posts_post p
        JOIN users_user u ON u.id = p.user_id
        WHERE u.username = $1 AND p.is_active = true
      ),
      latest_stats AS (
        SELECT DISTINCT ON (pds.post_id)
          pds.post_id,
          pds.daily_view_count AS total_view,
          pds.daily_like_count AS total_like
        FROM posts_postdailystatistics pds
        INNER JOIN user_posts up ON up.id = pds.post_id
        ORDER BY pds.post_id, pds.date DESC
      ),
      start_stats AS (
        SELECT DISTINCT ON (pds.post_id)
          pds.post_id,
          pds.daily_view_count AS start_view,
          pds.daily_like_count AS start_like
        FROM posts_postdailystatistics pds
        INNER JOIN user_posts up ON up.id = pds.post_id
        WHERE pds.date <= $2
        ORDER BY pds.post_id, pds.date DESC
      )
      SELECT
        $1 AS username,
        COALESCE(SUM(ls.total_view), 0) AS total_views,
        COALESCE(SUM(ls.total_like), 0) AS total_likes,
        COUNT(up.id) AS total_posts,
        COALESCE(SUM(ls.total_view - COALESCE(ss.start_view, 0)), 0) AS view_diff,
        COALESCE(SUM(ls.total_like - COALESCE(ss.start_like, 0)), 0) AS like_diff,
        COUNT(CASE WHEN up.released_at >= $2 THEN 1 END) AS post_diff
      FROM user_posts up
      LEFT JOIN latest_stats ls ON ls.post_id = up.id
      LEFT JOIN start_stats ss ON ss.post_id = up.id
    `;

      const result = await this.pool.query(query, [username, pastDateKST]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('TotalStatsRepository getUserBadgeStats error:', error);
      throw new DBError('사용자 배지 통계 조회 중 문제가 발생했습니다.');
    }
  }

  async getUserRecentPosts(username: string, dateRange: number = 30, limit: number = 4) {
    try {
      const pastDateKST = getKSTDateStringWithOffset(-dateRange * 24 * 60);

      const query = `
      WITH 
      user_posts AS (
        SELECT p.id, p.title, p.released_at
        FROM posts_post p
        JOIN users_user u ON u.id = p.user_id
        WHERE u.username = $1 AND p.is_active = true
        ORDER BY p.released_at DESC
        LIMIT $2
      ),
      latest_stats AS (
        SELECT DISTINCT ON (pds.post_id)
          pds.post_id,
          pds.daily_view_count AS total_view,
          pds.daily_like_count AS total_like
        FROM posts_postdailystatistics pds
        INNER JOIN user_posts up ON up.id = pds.post_id
        ORDER BY pds.post_id, pds.date DESC
      ),
      start_stats AS (
        SELECT DISTINCT ON (pds.post_id)
          pds.post_id,
          pds.daily_view_count AS start_view
        FROM posts_postdailystatistics pds
        INNER JOIN user_posts up ON up.id = pds.post_id
        WHERE pds.date <= $3
        ORDER BY pds.post_id, pds.date DESC
      )
      SELECT
        up.title,
        up.released_at,
        COALESCE(ls.total_view, 0) AS today_view,
        COALESCE(ls.total_like, 0) AS today_like,
        COALESCE(ls.total_view - ss.start_view, ls.total_view, 0) AS view_diff
      FROM user_posts up
      LEFT JOIN latest_stats ls ON ls.post_id = up.id
      LEFT JOIN start_stats ss ON ss.post_id = up.id
      ORDER BY up.released_at DESC
    `;

      const result = await this.pool.query(query, [username, limit, pastDateKST]);
      return result.rows;
    } catch (error) {
      logger.error('TotalStatsRepository getUserRecentPosts error:', error);
      throw new DBError('최근 게시글 조회 중 문제가 발생했습니다.');
    }
  }

  async getLatestUpdatedAt(userId: number): Promise<string | null> {
    try {
      const query = `
        SELECT pds.updated_at
        FROM posts_postdailystatistics pds
        JOIN posts_post p ON p.id = pds.post_id
        WHERE p.user_id = $1
        ORDER BY pds.updated_at DESC
        LIMIT 1;
      `;

      const result = await this.pool.query(query, [userId]);

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0].updated_at;
    } catch (error) {
      logger.error('TotalStats Repo getLatestUpdatedAt error:', error);
      throw new DBError('최근 통계 업데이트 시간 조회 중 문제가 발생했습니다.');
    }
  }
}
