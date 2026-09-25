import { z } from "../lib/zod.js";

export const leaderboardEntrySchema = z
  .object({
    roomId: z.string(),
    name: z.string(),
    nickname: z.string(),
    bookingCount: z.number().int(),
    totalMinutes: z.number(),
  })
  .openapi("LeaderboardEntry");

export const occupancyEntrySchema = z
  .object({
    roomId: z.string(),
    name: z.string(),
    nickname: z.string(),
    minutesByDay: z.object({
      Sun: z.number(),
      Mon: z.number(),
      Tue: z.number(),
      Wed: z.number(),
      Thu: z.number(),
      Fri: z.number(),
      Sat: z.number(),
    }),
  })
  .openapi("OccupancyEntry");
