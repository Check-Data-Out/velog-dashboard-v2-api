import { Pool } from 'pg';
import logger from '@/configs/logger.config';
import { DBError } from '@/exception';
import { getCurrentKSTDateString, getKSTDateStringWithOffset } from '@/utils/date.util';

export class PostRepository {
  constructor(private pool: Pool) {}

  async findPostsByUserId(userId: number, cursor?: string, sort?: string, isAsc: boolean = false, limit: number = 15) {
    const nowDateKST = getCurrentKSTDateString();
    const tomorrowDateKST = getKSTDateStringWithOffset(24 * 60);
    const yesterDateKST = getKSTDateStringWithOffset(-24 * 60);

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
          SELECT post_id, daily_view_count, daily_like_count, date
          FROM posts_postdailystatistics
          WHERE date >= '${nowDateKST}' AND date < '${tomorrowDateKST}'
        ) pds ON p.id = pds.post_id
        LEFT JOIN (
          SELECT post_id, daily_view_count, daily_like_count, date
          FROM posts_postdailystatistics
          WHERE date >= '${yesterDateKST}' AND date < '${nowDateKST}'
        ) yesterday_stats ON p.id = yesterday_stats.post_id
        WHERE p.user_id = $1
          AND p.is_active = TRUE
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

  // findPostsByUserId 와 동일
  // view_growth, like_growth 컬럼 추가 연산
  async findPostsByUserIdWithGrowthMetrics(
    userId: number,
    cursor?: string,
    isAsc: boolean = false,
    limit: number = 15,
  ) {
    const nowDateKST = getCurrentKSTDateString();
    const tomorrowDateKST = getKSTDateStringWithOffset(24 * 60);
    const yesterDateKST = getKSTDateStringWithOffset(-24 * 60);

    try {
      const selectFields = `
        p.id,
        p.title,
        p.slug,
        p.created_at AS post_created_at,
        p.released_at AS post_released_at,
        COALESCE(pds.daily_view_count, 0) AS daily_view_count,
        COALESCE(pds.daily_like_count, 0) AS daily_like_count,
        COALESCE(yesterday_stats.daily_view_count, 0) AS yesterday_daily_view_count,
        COALESCE(yesterday_stats.daily_like_count, 0) AS yesterday_daily_like_count,
        pds.date,
        (COALESCE(pds.daily_view_count, 0) - COALESCE(yesterday_stats.daily_view_count, 0)) AS view_growth,
        (COALESCE(pds.daily_like_count, 0) - COALESCE(yesterday_stats.daily_like_count, 0)) AS like_growth
      `;

      const direction = isAsc ? 'ASC' : 'DESC';
      const orderByExpression = `view_growth ${direction}, p.id ${direction}`;

      // 커서 처리
      let cursorCondition = '';
      let params: unknown[] = [];

      if (cursor) {
        const [cursorSortValue, cursorId] = cursor.split(',');

        cursorCondition = `
        AND (
          (COALESCE(pds.daily_view_count, 0) - COALESCE(yesterday_stats.daily_view_count, 0)) ${isAsc ? '>' : '<'} $2
          OR (
            (COALESCE(pds.daily_view_count, 0) - COALESCE(yesterday_stats.daily_view_count, 0)) = $2
            AND p.id ${isAsc ? '>' : '<'} $3
          )
        )
      `;

        params = [userId, cursorSortValue, cursorId, limit];
      } else {
        params = [userId, limit];
      }

      const query = `
        SELECT ${selectFields}
        FROM posts_post p
        LEFT JOIN (
          SELECT post_id, daily_view_count, daily_like_count, date
          FROM posts_postdailystatistics
          WHERE date >= '${nowDateKST}' AND date < '${tomorrowDateKST}'
        ) pds ON p.id = pds.post_id
        LEFT JOIN (
          SELECT post_id, daily_view_count, daily_like_count, date
          FROM posts_postdailystatistics
          WHERE date >= '${yesterDateKST}' AND date < '${nowDateKST}'
        ) yesterday_stats ON p.id = yesterday_stats.post_id
        WHERE p.user_id = $1
          AND p.is_active = TRUE
          AND (pds.post_id IS NOT NULL OR yesterday_stats.post_id IS NOT NULL)
          ${cursorCondition}
        ORDER BY ${orderByExpression}
        LIMIT ${cursor ? '$4' : '$2'}
      `;

      const posts = await this.pool.query(query, params);

      if (posts.rows.length === 0) {
        return {
          posts: [],
          nextCursor: null,
        };
      }

      // 다음 커서 생성
      const lastPost = posts.rows[posts.rows.length - 1];
      const nextCursor = `${lastPost.view_growth},${lastPost.id}`;

      return {
        posts: posts.rows,
        nextCursor,
      };
    } catch (error) {
      logger.error('Post Repo findPostsByUserIdWithGrowthMetrics error: ', error);
      throw new DBError('트래픽 성장률 기준 post 조회 중 문제가 발생했습니다.');
    }
  }

  async getTotalPostCounts(id: number) {
    try {
      const query = 'SELECT COUNT(*) FROM "posts_post" WHERE user_id = $1 AND is_active = TRUE';
      const result = await this.pool.query(query, [id]);
      return parseInt(result.rows[0].count, 10);
    } catch (error) {
      logger.error('Post Repo getTotalCounts error : ', error);
      throw new DBError('전체 post 조회 갯수 조회 중 문제가 발생했습니다.');
    }
  }

  async getYesterdayAndTodayViewLikeStats(userId: number) {
    const nowDateKST = getCurrentKSTDateString();
    const tomorrowDateKST = getKSTDateStringWithOffset(24 * 60);
    const yesterDateKST = getKSTDateStringWithOffset(-24 * 60);

    try {
      const query = `
        SELECT
            COALESCE(SUM(pds.daily_view_count), 0) AS daily_view_count,
            COALESCE(SUM(pds.daily_like_count), 0) AS daily_like_count,
            COALESCE(SUM(yesterday_stats.daily_view_count), 0) AS yesterday_views,
            COALESCE(SUM(yesterday_stats.daily_like_count), 0) AS yesterday_likes,
            MAX(pds.updated_at) AS last_updated_date
        FROM posts_post p
        LEFT JOIN (
            SELECT post_id, daily_view_count, daily_like_count, updated_at
            FROM posts_postdailystatistics
            WHERE date >= '${nowDateKST}' AND date < '${tomorrowDateKST}'
        ) pds ON p.id = pds.post_id
        LEFT JOIN (
            SELECT post_id, daily_view_count, daily_like_count
            FROM posts_postdailystatistics
          WHERE date >= '${yesterDateKST}' AND date < '${nowDateKST}'
        ) yesterday_stats ON p.id = yesterday_stats.post_id
        WHERE p.user_id = $1
        AND p.is_active = TRUE
      `;
      const values = [userId];

      const result = await this.pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      logger.error('Post Repo getYesterdayAndTodayViewLikeStats error : ', error);
      throw new DBError('전체 post 통계 조회 중 문제가 발생했습니다.');
    }
  }

  /**
   * 특정 게시물의 주어진 날짜 범위 내 일별 통계를 조회합니다.
   *
   * @param postId - 통계를 조회할 게시물의 ID.
   * @param start - 조회 범위의 시작 날짜(포함), 'YYYY-MM-DD' 형식.
   * @param end - 조회 범위의 종료 날짜(포함), 'YYYY-MM-DD' 형식.
   * @returns 주어진 날짜 범위 내 일별 통계 배열을 반환하는 Promise:
   *          - `date`: 통계 날짜.
   *          - `daily_view_count`: 해당 날짜의 조회수.
   *          - `daily_like_count`: 해당 날짜의 좋아요 수.
   * @throws {DBError} 데이터베이스 조회 중 오류가 발생한 경우.
   */
  async findPostByPostId(postId: number, start: string, end: string) {
    const query = `
      SELECT
        pds.date,
        pds.daily_view_count,
        pds.daily_like_count
      FROM posts_postdailystatistics pds
      WHERE pds.post_id = $1
      AND pds.date >= $2
      AND pds.date <= $3
      ORDER BY pds.date ASC
    `;

    try {
      const values: Array<number | string> = [postId, start, end];
      const result = await this.pool.query(query, values);
      return result.rows;
    } catch (error) {
      logger.error('Post Repo findPostByPostId error:', error);
      throw new DBError('단건 post 조회 중 문제가 발생했습니다.');
    }
  }

  /**
   * 특정 게시물의 uuid 값 기반으로 날짜 범위 내 일별 통계를 조회합니다. 익스텐션에서 사용합니다.
   *
   * @param postUUUID - 통계를 조회할 게시물의 UUID.
   * @param start - 조회 범위의 시작 날짜(포함), 'YYYY-MM-DD' 형식.
   * @param end - 조회 범위의 종료 날짜(포함), 'YYYY-MM-DD' 형식.
   * @returns 주어진 날짜 범위 내 일별 통계 배열을 반환하는 Promise:
   *          - `date`: 통계 날짜.
   *          - `daily_view_count`: 해당 날짜의 조회수.
   *          - `daily_like_count`: 해당 날짜의 좋아요 수.
   * @throws {DBError} 데이터베이스 조회 중 오류가 발생한 경우.
   */
  async findPostByPostUUID(postUUUID: string, start: string, end: string) {
    // findPostByPostId 와 다르게 UUID 가 기준이라 join 필수
    const query = `
      SELECT
        pds.date,
        pds.daily_view_count,
        pds.daily_like_count
      FROM posts_post p
      JOIN posts_postdailystatistics pds ON p.id = pds.post_id
      WHERE p.post_uuid = $1
        AND p.is_active = TRUE
        AND pds.date >= $2
        AND pds.date <= $3
      ORDER BY pds.date ASC
    `;

    try {
      const values = [postUUUID, start, end];
      const result = await this.pool.query(query, values);
      return result.rows;
    } catch (error) {
      logger.error('Post Repo findPostByUUID error : ', error);
      throw new DBError('통계 데이터 조회 중 문제가 발생했습니다.');
    }
  }
}
