export interface PostDailyStatistics {
  id: number;
  post_id: number;
  date: string;
  daily_view_count: number;
  daily_like_count: number;
  created_at: Date;
  updated_at: Date;
}
