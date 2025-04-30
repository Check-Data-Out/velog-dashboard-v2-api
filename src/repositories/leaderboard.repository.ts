import logger from '@/configs/logger.config';
import { Pool } from 'pg';
import { DBError } from '@/exception';
import { UserLeaderboardSortType, PostLeaderboardSortType } from '@/types/index';

export class LeaderboardRepository {
  constructor(private pool: Pool) {}

  async getUserLeaderboard(sort: UserLeaderboardSortType, dateRange: number, limit: number) {
    try {
      const cteQuery = this.buildLeaderboardCteQuery();

      const query = `
        ${cteQuery}
        SELECT
          u.id AS id,
          u.email AS email,
          COALESCE(SUM(ts.today_view), 0)::int AS total_views,
          COALESCE(SUM(ts.today_like), 0)::int AS total_likes, 
          COUNT(DISTINCT CASE WHEN p.is_active = true THEN p.id END)::int AS total_posts,
          SUM(COALESCE(ts.today_view, 0) - COALESCE(ss.start_view, COALESCE(ts.today_view, 0)))::int AS view_diff,
          SUM(COALESCE(ts.today_like, 0) - COALESCE(ss.start_like, COALESCE(ts.today_like, 0)))::int AS like_diff,
          COUNT(DISTINCT CASE WHEN p.released_at >= CURRENT_DATE - make_interval(days := $1::int) AND p.is_active = true THEN p.id END)::int AS post_diff
        FROM users_user u
        LEFT JOIN posts_post p ON p.user_id = u.id
        LEFT JOIN today_stats ts ON ts.post_id = p.id
        LEFT JOIN start_stats ss ON ss.post_id = p.id
        WHERE u.email IS NOT NULL
        GROUP BY u.id, u.email
        ORDER BY ${this.SORT_COL_MAPPING[sort]} DESC
        LIMIT $2;
      `;
      const result = await this.pool.query(query, [dateRange, limit]);

      return result.rows;
    } catch (error) {
      logger.error(`Leaderboard Repo getUserLeaderboard error:`, error);
      throw new DBError(`사용자 리더보드 조회 중 문제가 발생했습니다.`);
    }
  }

  async getPostLeaderboard(sort: PostLeaderboardSortType, dateRange: number, limit: number) {
    try {
      const cteQuery = this.buildLeaderboardCteQuery();

      const query = `
        ${cteQuery}
        SELECT
          p.id AS id,
          p.title,
          p.slug,
          p.released_at,
          COALESCE(ts.today_view, 0)::int AS total_views,
          COALESCE(ts.today_like, 0)::int AS total_likes,
          (COALESCE(ts.today_view, 0) - COALESCE(ss.start_view, COALESCE(ts.today_view, 0)))::int AS view_diff,
          (COALESCE(ts.today_like, 0) - COALESCE(ss.start_like, COALESCE(ts.today_like, 0)))::int AS like_diff
        FROM posts_post p
        LEFT JOIN today_stats ts ON ts.post_id = p.id
        LEFT JOIN start_stats ss ON ss.post_id = p.id
        WHERE p.is_active = true
        ORDER BY ${this.SORT_COL_MAPPING[sort]} DESC
        LIMIT $2;
      `;
      const result = await this.pool.query(query, [dateRange, limit]);

      return result.rows;
    } catch (error) {
      logger.error(`Leaderboard Repo getPostLeaderboard error:`, error);
      throw new DBError(`게시물 리더보드 조회 중 문제가 발생했습니다.`);
    }
  }

  // 오늘 날짜와 기준 날짜의 통계를 가져오는 CTE(임시 결과 집합) 쿼리 빌드
  private buildLeaderboardCteQuery() {
    return `
      WITH 
      today_stats AS (
        SELECT DISTINCT ON (post_id)
          post_id,
          daily_view_count AS today_view,
          daily_like_count AS today_like
        FROM posts_postdailystatistics
        WHERE (date AT TIME ZONE 'Asia/Seoul' AT TIME ZONE 'UTC')::date <= (NOW() AT TIME ZONE 'UTC')::date
        ORDER BY post_id, date DESC
      ),
      start_stats AS (
        SELECT DISTINCT ON (post_id)
          post_id,
          daily_view_count AS start_view,
          daily_like_count AS start_like
        FROM posts_postdailystatistics
        WHERE (date AT TIME ZONE 'Asia/Seoul' AT TIME ZONE 'UTC')::date >= ((NOW() AT TIME ZONE 'UTC')::date - make_interval(days := $1::int))
        ORDER BY post_id, date ASC
      )
    `;
  }

  private readonly SORT_COL_MAPPING = {
    viewCount: 'view_diff',
    likeCount: 'like_diff',
    postCount: 'post_diff',
  } as const;
}
