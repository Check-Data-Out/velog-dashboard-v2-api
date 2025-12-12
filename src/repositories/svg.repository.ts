import { Pool } from 'pg';
import logger from '@/configs/logger.config';
import { DBError, NotFoundError } from '@/exception';
import { getCurrentKSTDateString, getKSTDateStringWithOffset } from '@/utils/date.util';

export class SvgRepository {
    constructor(private pool: Pool) {}

    async getUserBadgeData(username: string, withRank: boolean, dateRange: number = 30) {
        try {
            const pastDateKST = getKSTDateStringWithOffset(-dateRange * 24 * 60);
            const cteQuery = this.buildBadgeCteQuery(dateRange, pastDateKST);
            
            const userStatsQuery = `
                ${cteQuery}
                SELECT
                    u.username,
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
                WHERE u.username = $1
                GROUP BY u.username
            `;
            const userStatsResult = await this.pool.query(userStatsQuery, [username]);

            if (userStatsResult.rows.length === 0) {
                throw new NotFoundError(`사용자를 찾을 수 없습니다: ${username}`);
            }

            const recentPostsQuery = `
                ${cteQuery}
                SELECT
                    p.title,
                    p.released_at,
                    COALESCE(ts.today_view, 0) AS today_view,
                    COALESCE(ts.today_like, 0) AS today_like,
                    COALESCE(ts.today_view, 0) - COALESCE(ss.start_view, 0) AS view_diff
                FROM posts_post p
                JOIN users_user u ON u.id = p.user_id
                LEFT JOIN today_stats ts ON ts.post_id = p.id
                LEFT JOIN start_stats ss ON ss.post_id = p.id
                WHERE u.username = $1
                    AND p.is_active = true
                ORDER BY p.released_at DESC
                LIMIT 3
            `;
            const recentPostsResult = await this.pool.query(recentPostsQuery, [username]);

            return {
                ...userStatsResult.rows[0],
                recent_posts: recentPostsResult.rows,
            };
        } catch (error) {
            if (error instanceof NotFoundError) {
                throw error;
            }

            logger.error('SvgRepository getUserBadgeData error: ', error);
            throw new DBError('배지 데이터 조회 중 문제가 발생했습니다.');
        }
    }

    private buildBadgeCteQuery(dateRange: number, pastDateKST?: string) {
        const nowDateKST = 
            new Date().getUTCHours() === 15
            ? getKSTDateStringWithOffset(-24 * 60)
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
}