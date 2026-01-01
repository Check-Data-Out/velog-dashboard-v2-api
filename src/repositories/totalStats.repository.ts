import { Pool } from 'pg';
import logger from '@/configs/logger.config';
import { DBError } from '@/exception';
import { TotalStatsType } from '@/types';
import { getCurrentKSTDateString, getKSTDateStringWithOffset } from '@/utils/date.util';

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
      const nowDateKST =
        new Date().getUTCHours() === 15 ? getKSTDateStringWithOffset(-24 * 60) : getCurrentKSTDateString();

      const query = `
        WITH 
        today_stats AS (
          SELECT DISTINCT ON (post_id)
            post_id,
            daily_view_count AS today_view,
            daily_like_count AS today_like
          FROM posts_postdailystatistics
          WHERE date = $2
          ORDER BY post_id, date DESC
        ),
        start_stats AS (
          SELECT DISTINCT ON (post_id)
            post_id,
            daily_view_count AS start_view,
            daily_like_count AS start_like
          FROM posts_postdailystatistics
          WHERE date = $3
          ORDER BY post_id, date DESC
        )
        SELECT
          u.username,
          COALESCE(SUM(ts.today_view), 0) AS total_views,
          COALESCE(SUM(ts.today_like), 0) AS total_likes,
          COUNT(DISTINCT CASE WHEN p.is_active = true THEN p.id END) AS total_posts,
          SUM(COALESCE(ts.today_view, 0) - COALESCE(ss.start_view, 0)) AS view_diff,
          SUM(COALESCE(ts.today_like, 0) - COALESCE(ss.start_like, 0)) AS like_diff,
          COUNT(DISTINCT CASE WHEN p.released_at >= $3 AND p.is_active = true THEN p.id END) AS post_diff
        FROM users_user u
        LEFT JOIN posts_post p ON p.user_id = u.id
        LEFT JOIN today_stats ts ON ts.post_id = p.id
        LEFT JOIN start_stats ss ON ss.post_id = p.id
        WHERE u.username = $1
        GROUP BY u.username
      `;

      const result = await this.pool.query(query, [username, nowDateKST, pastDateKST]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('TotalStatsRepository getUserBadgeStats error:', error);
      throw new DBError('사용자 배지 통계 조회 중 문제가 발생했습니다.');
    }
  }

  async getUserRecentPosts(username: string, dateRange: number = 30, limit: number = 4) {
    try {
      const pastDateKST = getKSTDateStringWithOffset(-dateRange * 24 * 60);
      const nowDateKST =
        new Date().getUTCHours() === 15 ? getKSTDateStringWithOffset(-24 * 60) : getCurrentKSTDateString();

      const query = `
        WITH 
        today_stats AS (
          SELECT DISTINCT ON (post_id)
            post_id,
            daily_view_count AS today_view,
            daily_like_count AS today_like
          FROM posts_postdailystatistics
          WHERE date = $3
          ORDER BY post_id, date DESC
        ),
        start_stats AS (
          SELECT DISTINCT ON (post_id)
            post_id,
            daily_view_count AS start_view,
            daily_like_count AS start_like
          FROM posts_postdailystatistics
          WHERE date = $4
          ORDER BY post_id, date DESC
        )
        SELECT
          p.title,
          p.released_at,
          COALESCE(ts.today_view, 0) AS today_view,
          COALESCE(ts.today_like, 0) AS today_like,
          (COALESCE(ts.today_view, 0) - COALESCE(ss.start_view, 0)) AS view_diff
        FROM posts_post p
        JOIN users_user u ON u.id = p.user_id
        LEFT JOIN today_stats ts ON ts.post_id = p.id
        LEFT JOIN start_stats ss ON ss.post_id = p.id
        WHERE u.username = $1
          AND p.is_active = true
        ORDER BY p.released_at DESC
        LIMIT $2
      `;

      const result = await this.pool.query(query, [username, limit, nowDateKST, pastDateKST]);
      return result.rows;
    } catch (error) {
      logger.error('TotalStatsRepository getUserRecentPosts error:', error);
      throw new DBError('최근 게시글 조회 중 문제가 발생했습니다.');
    }
  }
}
