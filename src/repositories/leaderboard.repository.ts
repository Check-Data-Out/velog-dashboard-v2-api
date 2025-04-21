import { Pool } from 'pg';

export class LeaderboardRepository {
  constructor(private pool: Pool) {}
}
