export interface GetAllPostsQuery {
  cursor?: string;
  sort?: '' | 'title' | 'daily_view_count' | 'daily_like_count';
  asc?: string;
}
