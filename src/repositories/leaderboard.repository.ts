import logger from '@/configs/logger.config';
import { Pool } from 'pg';
import { DBError } from '@/exception';
import { UserLeaderboardSortType, PostLeaderboardSortType } from '@/types/index';
import { getCurrentKSTDateString, getKSTDateStringWithOffset } from '@/utils/date.util';

export class LeaderboardRepository {
  constructor(private pool: Pool) {}

  async getUserLeaderboard(sort: UserLeaderboardSortType, dateRange: number, limit: number) {
    try {
      const pastDateKST = getKSTDateStringWithOffset(-dateRange * 24 * 60);
      const cteQuery = this.buildLeaderboardCteQuery(dateRange, pastDateKST);

      const query = `
        ${cteQuery}
        SELECT
          u.id AS id,
          u.email AS email,
          u.username AS username,
          COALESCE(SUM(ts.today_view), 0) AS total_views,
          COALESCE(SUM(ts.today_like), 0) AS total_likes, 
          COUNT(DISTINCT CASE WHEN p.is_active = true THEN p.id END) AS total_posts,
          SUM(COALESCE(ts.today_view, 0) - COALESCE(ss.start_view, 0)) AS view_diff,
          SUM(COALESCE(ts.today_like, 0) - COALESCE(ss.start_like, 0)) AS like_diff,
          COUNT(DISTINCT CASE WHEN p.released_at >= '${pastDateKST}' AND p.is_active = true THEN p.id END) AS post_diff
        FROM users_user u
        LEFT JOIN posts_post p ON p.user_id = u.id
        LEFT JOIN today_stats ts ON ts.post_id = p.id
        LEFT JOIN start_stats ss ON ss.post_id = p.id
        WHERE u.username IS NOT NULL
        GROUP BY u.id, u.email, u.username
        HAVING SUM(COALESCE(ts.today_view, 0)) != SUM(COALESCE(ts.today_view, 0) - COALESCE(ss.start_view, 0))
        ORDER BY ${this.SORT_COL_MAPPING[sort]} DESC, u.id
        LIMIT $1;
      `;
      const result = await this.pool.query(query, [limit]);

      return result.rows;
    } catch (error) {
      logger.error(`Leaderboard Repo getUserLeaderboard error:`, error);
      throw new DBError(`사용자 리더보드 조회 중 문제가 발생했습니다.`);
    }
  }

  async getPostLeaderboard(sort: PostLeaderboardSortType, dateRange: number, limit: number) {
    try {
      const pastDateKST = getKSTDateStringWithOffset(-dateRange * 24 * 60);
      const cteQuery = this.buildLeaderboardCteQuery(dateRange, pastDateKST);

      const query = `
        ${cteQuery}
        SELECT
          p.id AS id,
          p.title,
          p.slug,
          p.released_at,
          u.username AS username,
          COALESCE(ts.today_view, 0) AS total_views,
          COALESCE(ts.today_like, 0) AS total_likes,
          COALESCE(ts.today_view, 0) - COALESCE(ss.start_view, 0) AS view_diff,
          COALESCE(ts.today_like, 0) - COALESCE(ss.start_like, 0) AS like_diff
        FROM posts_post p
        LEFT JOIN users_user u ON u.id = p.user_id
        LEFT JOIN today_stats ts ON ts.post_id = p.id
        LEFT JOIN start_stats ss ON ss.post_id = p.id
        WHERE p.is_active = true
          AND (
            p.released_at >= '${pastDateKST}'
            OR 
            COALESCE(ts.today_view, 0) != COALESCE(ts.today_view, 0) - COALESCE(ss.start_view, 0)
          )
        ORDER BY ${this.SORT_COL_MAPPING[sort]} DESC, p.id
        LIMIT $1;
      `;
      const result = await this.pool.query(query, [limit]);

      return result.rows;
    } catch (error) {
      logger.error(`Leaderboard Repo getPostLeaderboard error:`, error);
      throw new DBError(`게시물 리더보드 조회 중 문제가 발생했습니다.`);
    }
  }

  // 오늘 날짜와 기준 날짜의 통계를 가져오는 CTE(임시 결과 집합) 쿼리 빌드
  private buildLeaderboardCteQuery(dateRange: number, pastDateKST?: string) {
    // KST 기준 00시~01시 (UTC 15:00~16:00) 사이라면 전날 데이터를 사용
    const nowDateKST = new Date().getUTCHours() === 15
      ? getKSTDateStringWithOffset(-24 * 60) // 전날 데이터
      : getCurrentKSTDateString();

    if (!pastDateKST) {
      pastDateKST = getKSTDateStringWithOffset(-dateRange * 24 * 60);
    }

    return `
      WITH 
      today_stats AS (
        SELECT DISTINCT ON (post_id)
          post_id,
          daily_view_count AS today_view,
          daily_like_count AS today_like
        FROM posts_postdailystatistics
        WHERE date = '${nowDateKST}'
      ),
      start_stats AS (
        SELECT DISTINCT ON (post_id)
          post_id,
          daily_view_count AS start_view,
          daily_like_count AS start_like
        FROM posts_postdailystatistics
        WHERE date = '${pastDateKST}'
      )
    `;
  }

  private readonly SORT_COL_MAPPING = {
    viewCount: 'view_diff',
    likeCount: 'like_diff',
    postCount: 'post_diff',
  } as const;
}
