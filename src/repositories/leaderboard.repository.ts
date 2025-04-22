import logger from '@/configs/logger.config';
import { Pool } from 'pg';
import { DBError } from '@/exception';
import { LeaderboardSortType, LeaderboardType } from '@/types/index';

export class LeaderboardRepository {
  constructor(private pool: Pool) {}

  async getLeaderboard(type: LeaderboardType, sort: LeaderboardSortType, dateRange: number, limit: number) {
    try {
      const cteQuery = this.buildLeaderboardCteQuery();
      const selectQuery = this.buildLeaderboardSelectQuery(type);
      const fromClause = this.buildLeaderboardFromClause(type);
      const sortCol = this.mapSortColByType(sort, type);
      const groupOrderClause = this.buildLeaderboardGroupOrderClause(sortCol, type);

      const query = `${cteQuery} ${selectQuery} ${fromClause} ${groupOrderClause}`;
      const values = await this.pool.query(query, [dateRange, limit]);

      return values.rows;
    } catch (error) {
      logger.error(`Leaderboard Repo getLeaderboard error:`, error);
      throw new DBError(`${type === 'post' ? '게시글' : '유저'} 리더보드 조회 중 문제가 발생했습니다.`);
    }
  }

  // 오늘 날짜와 기준 날짜의 통계를 가져오는 CTE(임시 결과 집합) 쿼리 빌드
  private buildLeaderboardCteQuery() {
    return `
      WITH today_stats AS (
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
        WHERE (date AT TIME ZONE 'Asia/Seoul' AT TIME ZONE 'UTC')::date >= ((NOW() AT TIME ZONE 'UTC')::date - ($1::int * INTERVAL '1 day'))
        ORDER BY post_id, date ASC
      )
    `;
  }

  // 메인 연산을 포함하는 SELECT 절 빌드
  private buildLeaderboardSelectQuery(type: LeaderboardType) {
    if (type === 'post') {
      return `
        SELECT
          p.id AS id,
          p.title,
          p.slug,
          p.released_at,

          -- 총 누적 조회수 / 좋아요 수 (오늘 기준)
          COALESCE(ts.today_view, 0) AS total_views,
          COALESCE(ts.today_like, 0) AS total_likes,

          -- 조회수 / 좋아요 수 상승값 = 오늘 - 기준일 (기준일이 없으면 diff = 0)
          COALESCE(ts.today_view, 0) - COALESCE(ss.start_view, COALESCE(ts.today_view, 0)) AS view_diff,
          COALESCE(ts.today_like, 0) - COALESCE(ss.start_like, COALESCE(ts.today_like, 0)) AS like_diff
      `;
    } else {
      return `
        SELECT
          u.id AS id,
          u.email AS email,

          -- 전체 게시물 누적 조회수 / 좋아요 수 합계 (오늘 기준)
          COALESCE(SUM(ts.today_view), 0) AS total_views,
          COALESCE(SUM(ts.today_like), 0) AS total_likes,

          -- 전체 게시물 조회수 / 좋아요 수 상승값 합계 = 오늘 - 기준일 (기준일이 없으면 diff = 0)
          SUM(
            COALESCE(ts.today_view, 0) - COALESCE(ss.start_view, COALESCE(ts.today_view, 0))
          ) AS view_diff,
          SUM(
            COALESCE(ts.today_like, 0) - COALESCE(ss.start_like, COALESCE(ts.today_like, 0))
          ) AS like_diff,

          -- 최근 dateRange내 업로드된 게시물 수
          COUNT(DISTINCT CASE
            WHEN p.released_at >= CURRENT_DATE - $1::int
            AND p.is_active = true
            THEN p.id
          END) AS post_diff,

          -- 전체 활성 게시물 수
          COUNT(DISTINCT CASE WHEN p.is_active = true THEN p.id END) AS total_posts
      `;
    }
  }

  // CTE 테이블 조인 및 WHERE 절을 포함하는 FROM 절 빌드
  private buildLeaderboardFromClause(type: LeaderboardType) {
    if (type === 'post') {
      return `
        FROM posts_post p
        LEFT JOIN today_stats ts ON ts.post_id = p.id
        LEFT JOIN start_stats ss ON ss.post_id = p.id
        WHERE p.is_active = true
      `;
    } else {
      return `
        FROM users_user u
        LEFT JOIN posts_post p ON p.user_id = u.id
        LEFT JOIN today_stats ts ON ts.post_id = p.id
        LEFT JOIN start_stats ss ON ss.post_id = p.id
        WHERE u.email IS NOT NULL
      `;
    }
  }

  // sort 매개변수를 정렬 컬럼으로 매핑
  private mapSortColByType(sort: LeaderboardSortType, type: LeaderboardType) {
    let sortCol = '';

    switch (sort) {
      case 'postCount':
        sortCol = type === 'user' ? 'post_diff' : 'view_diff';
        break;
      case 'likeCount':
        sortCol = 'like_diff';
        break;
      case 'viewCount':
      default:
        sortCol = 'view_diff';
        break;
    }

    return sortCol;
  }

  // 매핑된 정렬 컬럼으로 ORDER BY 절 및 LIMIT 절 빌드
  private buildLeaderboardGroupOrderClause(sortCol: string, type: LeaderboardType) {
    if (type === 'post') {
      return `
        ORDER BY ${sortCol} DESC
        LIMIT $2;
      `;
    } else {
      return `
        GROUP BY u.id, u.email
        ORDER BY ${sortCol} DESC
        LIMIT $2;
      `;
    }
  }
}
