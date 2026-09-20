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
