import { randomUUID } from 'crypto';
import { PoolClient } from 'pg';

/**
 * 통합 테스트 시드 헬퍼. 트랜잭션을 연 client 를 받아 최소 행을 넣고, 테스트가 끝나면 ROLLBACK 으로 사라진다.
 * 스키마는 back-office Django 마이그레이션이 만든다. Django 의 default= 는 DB 기본값이 아니므로
 * NOT NULL 컬럼은 모두 값을 명시한다 (session_version 만 db_default 가 있다).
 */

export const insertUser = async (client: PoolClient, username: string | null = 'integration-test'): Promise<number> => {
  const result = await client.query(
    `INSERT INTO users_user
       (created_at, updated_at, velog_uuid, access_token, refresh_token, group_id, email, is_active, username, thumbnail, newsletter_subscribed)
     VALUES (NOW(), NOW(), $1, 'enc-access', 'enc-refresh', 1, NULL, true, $2, NULL, false)
     RETURNING id`,
    [randomUUID(), username],
  );
  return Number(result.rows[0].id);
};

export const insertPost = async (
  client: PoolClient,
  userId: number,
  releasedAt: string,
  title: string = 'integration-test-post',
): Promise<{ id: number; postUuid: string }> => {
  const postUuid = randomUUID();
  const result = await client.query(
    `INSERT INTO posts_post (created_at, updated_at, post_uuid, title, user_id, released_at, slug, is_active)
     VALUES (NOW(), NOW(), $1, $2, $3, $4, $5, true)
     RETURNING id`,
    [postUuid, title, userId, releasedAt, `integration-test-${postUuid}`],
  );
  return { id: Number(result.rows[0].id), postUuid };
};

/** date 는 저장소가 비교하는 값 그대로 넣는다 (getKSTDateStringWithOffset 의 'YYYY-MM-DD 00:00:00+09') */
export const insertDailyStats = async (
  client: PoolClient,
  postId: number,
  date: string,
  viewCount: number,
  likeCount: number,
): Promise<void> => {
  await client.query(
    `INSERT INTO posts_postdailystatistics (created_at, updated_at, date, daily_view_count, daily_like_count, post_id)
     VALUES (NOW(), NOW(), $1, $2, $3, $4)`,
    [date, viewCount, likeCount, postId],
  );
};

/** expiresInMinutes 가 음수면 이미 만료된 토큰이 된다 */
export const insertQRLoginToken = async (
  client: PoolClient,
  userId: number,
  token: string,
  expiresInMinutes: number,
  isUsed: boolean,
): Promise<void> => {
  await client.query(
    `INSERT INTO users_qrlogintoken (token, expires_at, is_used, ip_address, user_agent, user_id, created_at)
     VALUES ($1, NOW() + make_interval(mins => $2), $3, '127.0.0.1', 'test-agent', $4, NOW() - INTERVAL '10 minutes')`,
    [token, expiresInMinutes, isUsed, userId],
  );
};
