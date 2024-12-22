import { Pool } from 'pg';

export class PostRepository {
  constructor(private pool: Pool) {}
  async findPostsByUserId(id: number) {
    const query = `
      SELECT
        p.id,
        p.title,
        p.updated_at,
        pds.daily_view_count,
        pds.daily_like_count
      FROM posts_post p
      LEFT JOIN posts_postdailystatistics pds on p.id = pds.post_id
      WHERE p.user_id = $1
      `;
    const posts = await this.pool.query(query, [id]);

    return posts.rows || null;
  }
  async getTotalCounts() {
    //todo : 총 게시글 갯수 구하기 count 함수
    return await this.pool.query('select count(*) from "posts_post"');
  }
}
