export interface GetAllPostsQuery {
  cursor?: string;
  sort?: '' | 'daily_view_count' | 'daily_like_count';
  asc?: string;
}
