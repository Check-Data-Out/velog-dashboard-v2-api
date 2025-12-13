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

    private generateSimpleSvg(data: any, assets: string): string {
        return `<svg width="400" height="120" xmlns="http://www.w3.org/2000/svg">
            <rect width="400" height="120" fill="#1E1E1E"/>
            <text x="20" y="40" fill="white" font-size="20">${data.username}</text>
            <text x="20" y="70" fill="white">Views: ${data.total_views}</text>
            <text x="20" y="100" fill="white">Likes: ${data.total_likes}</text>
        </svg>`;
    }

    private generateDefaultSvg(data: any, assets: string, withRank: boolean): string {
        return `<svg width="600" height="300" xmlns="http://www.w3.org/2000/svg">
            <rect width="600" height="300" fill="#1E1E1E"/>
            <text x="20" y="30" fill="white" font-size="18">${data.username}</text>
            <text x="20" y="60" fill="white">Views: ${data.total_views}</text>
            <text x="20" y="90" fill="white">Recent Posts: ${data.recent_posts?.length || 0}</text>
            ${withRank ? `<text x="20" y="120" fill="white">Rank: #${data.view_rank || 'N/A'}</text>` : ''}
        </svg>`;
    }
}
