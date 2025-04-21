import { LeaderboardRepository } from '@/repositories/leaderboard.repository';

export class LeaderboardService {
  constructor(private leaderboardRepo: LeaderboardRepository) {}
}
