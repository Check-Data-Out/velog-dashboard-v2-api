export interface PostDailyStatistics {
  id: number;
  postId: number;
  date: string;
  dailyViewCount: number;
  dailyLikeCount: number;
  createdAt: Date;
  updatedAt: Date;
}
