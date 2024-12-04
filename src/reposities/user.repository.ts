import { Pool } from 'pg';

export class UserRepository {
  constructor(private readonly pool: Pool) {}
}
