import { BaseResponseDto } from '@/types/dto/responses/baseResponse.type';

export interface BadgeUserData {
    username: string;
    totalViews: number;
    totalLikes: number;
    totalPosts: number;
    viewDiff: number;
    likeDiff: number;
    postDiff: number;
}

export interface BadgeRecentPost {
    title: string;
    releasedAt: string;
    viewCount: number;
    likeCount: number;
    viewDiff: number;
}

export interface BadgeData {
    user: BadgeUserData;
    recentPosts: BadgeRecentPost[];
}

export class BadgeDataResponseDto extends BaseResponseDto<BadgeData | null> {
    constructor(success: boolean, message: string, data: BadgeData | null, error: string | null) {
        super(success, message, data, error);
    }
}
