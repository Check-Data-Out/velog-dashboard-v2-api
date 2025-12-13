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

export class BadgeDataResponseDto {
    user: BadgeUserData;
    recentPosts: BadgeRecentPost[];

    constructor(user: BadgeUserData, recentPosts: BadgeRecentPost[]) {
        this.user = user;
        this.recentPosts = recentPosts;
    }
}