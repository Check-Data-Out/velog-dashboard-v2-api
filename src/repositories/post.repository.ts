import { Pool } from 'pg';

export class PostRepository {
  constructor(private pool: Pool) {}
}
