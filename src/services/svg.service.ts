import logger from '@/configs/logger.config';
import { SvgBadgeType } from '@/types';
import { SvgRepository } from '@/repositories/svg.repository';

export class SvgService {
    constructor(private svgRepo: SvgRepository) {}

    async generateBadgeSvg(
        username: string,
        type: SvgBadgeType,
        assets: string,
        withRank: boolean,
    ): Promise<string> {
        try {
            const data = await this.svgRepo.getUserBadgeData(username, withRank);

            if (type === 'simple') {
                return this.generateSimpleSvg(data, assets);
            } else {
                return this.generateDefaultSvg(data, assets, withRank);
            }
        } catch (error) {
            logger.error('SvgService generateBadgeSvg error: ', error);
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

    private formatNumber(num: number): string {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'm';
        }

        if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'k';
        }

        return num.toString();
    }
}