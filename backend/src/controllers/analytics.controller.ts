import type { Request, Response } from "express";
import * as analyticsService from "../services/analytics.service.js";

export async function leaderboard(_req: Request, res: Response): Promise<void> {
  const entries = await analyticsService.getUsageLeaderboard();
  res.status(200).json(entries);
}

export async function occupancy(_req: Request, res: Response): Promise<void> {
  const entries = await analyticsService.getOccupancyByRoomAndDay();
  res.status(200).json(entries);
}
