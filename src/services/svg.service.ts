import logger from '@/configs/logger.config';
import { BadgeDataResponseDto, SvgBadgeType } from '@/types';
import { LeaderboardRepository } from '@/repositories/leaderboard.repository';

export class SvgService {
    constructor(private leaderboardRepo: LeaderboardRepository) {}

    async getBadgeData(
        username: string,
        type: SvgBadgeType,
        dateRange: number = 30,
    ): Promise<BadgeDataResponseDto> {
        try {
            const userStats = await this.leaderboardRepo.getUserStats(username, dateRange);
            const recentPosts = type === 'default'
                ? await this.leaderboardRepo.getRecentPosts(username, dateRange, 3)
                : [];

            return new BadgeDataResponseDto(
                {
                    username: userStats.username,
                    totalViews: Number(userStats.total_views),
                    totalLikes: Number(userStats.total_likes),
                    totalPosts: Number(userStats.total_posts),
                    viewDiff: Number(userStats.view_diff),
                    likeDiff: Number(userStats.like_diff),
                    postDiff: Number(userStats.post_diff),
                },
                recentPosts.map(post => ({
                    title: post.title,
                    releasedAt: post.released_at,
                    viewCount: Number(post.today_view),
                    likeCount: Number(post.today_like),
                    viewDiff: Number(post.view_diff),
                }))
            )
        } catch (error) {
            logger.error('SvgService getBadgeData error: ', error);
            throw error;
        }
    }
}
