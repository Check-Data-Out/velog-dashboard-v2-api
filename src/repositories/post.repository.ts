import { Pool } from 'pg';
import logger from '@/configs/logger.config';
import { DBError } from '@/exception';

export class PostRepository {
  constructor(private pool: Pool) { }

  async findPostsByUserId(userId: number, cursor?: string, sort?: string, isAsc?: boolean, limit: number = 15) {
    try {
      // 1) 정렬 컬럼 매핑
      let sortCol = 'p.released_at';
      switch (sort) {
        case 'dailyViewCount':
          sortCol = 'pds.daily_view_count';
          break;
        case 'dailyLikeCount':
          sortCol = 'pds.daily_like_count';
          break;
        default:
          sortCol = 'p.released_at';
          break;
      }

      // 2) ASC/DESC 결정
      const direction = isAsc ? 'ASC' : 'DESC';
      const orderBy = `${sortCol} ${direction}, p.id ${direction}`;

      // 3) 커서 WHERE 구문
      let cursorCondition = '';
      let params: unknown[] = [];
      if (cursor) {
        // 예: cursor가 "SOME_SORT_VALUE,1234" 형태라고 가정하고 파싱
        const [cursorSortValue, cursorId] = cursor.split(',');

        cursorCondition = `
          AND (
            ${sortCol} ${isAsc ? '>' : '<'} $2
            OR (
              ${sortCol} = $2
              AND p.id ${isAsc ? '>' : '<'} $3
            )
          )
        `;
        // 4개 파라미터: userId, cursorSortValue, cursorId, limit
        params = [userId, cursorSortValue, cursorId, limit];
      } else {
        // 2개 파라미터: userId, limit
        params = [userId, limit];
      }

      const query = `
        SELECT
          p.id,
          p.title,
          p.slug,
          p.created_at AS post_created_at,
          p.released_at AS post_released_at,
          COALESCE(pds.daily_view_count, 0) AS daily_view_count,
          COALESCE(pds.daily_like_count, 0) AS daily_like_count,
          COALESCE(yesterday_stats.daily_view_count, 0) AS yesterday_daily_view_count,
          COALESCE(yesterday_stats.daily_like_count, 0) AS yesterday_daily_like_count,
          pds.date
        FROM posts_post p
        LEFT JOIN (
          SELECT post_id,
                 daily_view_count,
                 daily_like_count,
                 date
          FROM posts_postdailystatistics
          WHERE (date AT TIME ZONE 'Asia/Seoul' AT TIME ZONE 'UTC')::date = (NOW() AT TIME ZONE 'UTC')::date
        ) pds ON p.id = pds.post_id
        LEFT JOIN (
          SELECT post_id, daily_view_count, daily_like_count, date
          FROM posts_postdailystatistics
          WHERE (date AT TIME ZONE 'Asia/Seoul' AT TIME ZONE 'UTC')::date = (NOW() AT TIME ZONE 'UTC' - INTERVAL '1 day')::date
        ) yesterday_stats ON p.id = yesterday_stats.post_id
        WHERE p.user_id = $1
          AND (pds.post_id IS NOT NULL OR yesterday_stats.post_id IS NOT NULL)
          ${cursorCondition}
        ORDER BY ${orderBy}
        LIMIT ${cursor ? '$4' : '$2'}
      `;

      const posts = await this.pool.query(query, params);

      // 다음 커서 만들기
      if (posts.rows.length === 0) {
        // 데이터 없으면 nextCursor도 null
        return {
          posts: [],
          nextCursor: null,
        };
      }

      // 마지막 레코드
      const lastPost = posts.rows[posts.rows.length - 1];
      // nextCursor = `${정렬 컬럼 값},${p.id}`
      // 예: 만약 sortCol이 p.title인 경우, lastPost.title + ',' + lastPost.id
      let sortValueForCursor = '';
      if (sort === 'dailyViewCount') {
        sortValueForCursor = lastPost.daily_view_count;
      } else if (sort === 'dailyLikeCount') {
        sortValueForCursor = lastPost.daily_like_count;
      } else {
        sortValueForCursor = new Date(lastPost.post_released_at).toISOString();
      }
      const nextCursor = `${sortValueForCursor},${lastPost.id}`;

      return {
        posts: posts.rows,
        nextCursor,
      };
    } catch (error) {
      logger.error('Post Repo findPostsByUserId error: ', error);
      throw new DBError('전체 post 조회 중 문제가 발생했습니다.');
    }
  }

  async getTotalPostCounts(id: number) {
    try {
      const query = 'SELECT COUNT(*) FROM "posts_post" WHERE user_id = $1';
      const result = await this.pool.query(query, [id]);
      return parseInt(result.rows[0].count, 10);
    } catch (error) {
      logger.error('Post Repo getTotalCounts error : ', error);
      throw new DBError('전체 post 조회 갯수 조회 중 문제가 발생했습니다.');
    }
  }

  async getYesterdayAndTodayViewLikeStats(userId: number) {
    // ! pds.updated_at 은 FE 화면을 위해 억지로 9h 시간 더한 값임 주의
    try {
      const query = `
        SELECT
            COALESCE(SUM(pds.daily_view_count), 0) AS daily_view_count,
            COALESCE(SUM(pds.daily_like_count), 0) AS daily_like_count,
            COALESCE(SUM(yesterday_stats.daily_view_count), 0) AS yesterday_views,
            COALESCE(SUM(yesterday_stats.daily_like_count), 0) AS yesterday_likes,
            (MAX(pds.updated_at AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'UTC') AS last_updated_date
        FROM posts_post p
        LEFT JOIN (
            SELECT post_id, daily_view_count, daily_like_count, updated_at
            FROM posts_postdailystatistics
            WHERE (date AT TIME ZONE 'Asia/Seoul' AT TIME ZONE 'UTC')::date = (NOW() AT TIME ZONE 'UTC')::date
        ) pds ON p.id = pds.post_id
        LEFT JOIN (
            SELECT post_id, daily_view_count, daily_like_count
            FROM posts_postdailystatistics
          WHERE (date AT TIME ZONE 'Asia/Seoul' AT TIME ZONE 'UTC')::date = (NOW() AT TIME ZONE 'UTC' - INTERVAL '1 day')::date
        ) yesterday_stats ON p.id = yesterday_stats.post_id
        WHERE p.user_id = $1
      `;
      const values = [userId];

      const result = await this.pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      logger.error('Post Repo getYesterdayAndTodayViewLikeStats error : ', error);
      throw new DBError('전체 post 통계 조회 중 문제가 발생했습니다.');
    }
  }

  async findPostByPostId(postId: number, start?: string, end?: string) {
    try {
      // 기본 쿼리 부분
      const baseQuery = `
        SELECT
          (pds.date AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'UTC' AS date,
          pds.daily_view_count,
          pds.daily_like_count
        FROM posts_postdailystatistics pds
        WHERE pds.post_id = $1
      `;

      // 날짜 필터링 조건 구성
      const dateFilterQuery = (start && end)
        ? `
          AND (pds.date AT TIME ZONE 'Asia/Seoul' AT TIME ZONE 'UTC')::date >= ($2 AT TIME ZONE 'Asia/Seoul' AT TIME ZONE 'UTC')::date
          AND (pds.date AT TIME ZONE 'Asia/Seoul' AT TIME ZONE 'UTC')::date <= ($3 AT TIME ZONE 'Asia/Seoul' AT TIME ZONE 'UTC')::date
        `
        : '';

      // 정렬 조건 추가
      const orderByQuery = `ORDER BY pds.date ASC`;

      // 최종 쿼리 조합
      const fullQuery = [baseQuery, dateFilterQuery, orderByQuery].join(' ');

      // 파라미터 배열 구성
      const queryParams: Array<number | string> = [postId];
      if (start && end) queryParams.push(start, end);

      // 쿼리 실행
      const result = await this.pool.query(fullQuery, queryParams);
      return result.rows;
    } catch (error) {
      logger.error('Post Repo findPostByPostId error:', error);
      throw new DBError('단건 post 조회 중 문제가 발생했습니다.');
    }
  }

  async findPostByPostUUID(postId: string, start: string, end: string) {
    try {
      const query = `
      SELECT
        (pds.date AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'UTC' AS date,
        pds.daily_view_count,
        pds.daily_like_count
      FROM posts_post p
      JOIN posts_postdailystatistics pds ON p.id = pds.post_id
      WHERE p.post_uuid = $1
        AND (pds.date AT TIME ZONE 'Asia/Seoul' AT TIME ZONE 'UTC')::date >= ($2 AT TIME ZONE 'Asia/Seoul' AT TIME ZONE 'UTC')::date
        AND (pds.date AT TIME ZONE 'Asia/Seoul' AT TIME ZONE 'UTC')::date <= ($3 AT TIME ZONE 'Asia/Seoul' AT TIME ZONE 'UTC')::date
      ORDER BY pds.date ASC
      `;

      const values = [postId, start, end];

      const result = await this.pool.query(query, values);
      return result.rows;
    } catch (error) {
      logger.error('Post Repo findPostByUUID error : ', error);
      throw new DBError('통계 데이터 조회 중 문제가 발생했습니다.');
    }
  }
}
