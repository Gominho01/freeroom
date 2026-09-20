import { request } from './http';
import type { LeaderboardEntry, OccupancyEntry } from '../types';

export function getLeaderboard(token: string): Promise<LeaderboardEntry[]> {
  return request<LeaderboardEntry[]>('/analytics/leaderboard', token);
}

export function getOccupancy(token: string): Promise<OccupancyEntry[]> {
  return request<OccupancyEntry[]>('/analytics/occupancy', token);
}
