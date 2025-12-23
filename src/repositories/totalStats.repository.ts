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
