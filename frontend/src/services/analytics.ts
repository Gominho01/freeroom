import { request } from './http';
import type { LeaderboardEntry } from '../types';

export function getLeaderboard(token: string): Promise<LeaderboardEntry[]> {
  return request<LeaderboardEntry[]>('/analytics/leaderboard', token);
}
