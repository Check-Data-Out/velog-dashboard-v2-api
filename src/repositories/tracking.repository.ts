import { Pool } from 'pg';

export class TrackingRepository {
  constructor(private readonly pool: Pool) {}
}
