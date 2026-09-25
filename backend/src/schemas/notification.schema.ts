import { z } from "../lib/zod.js";

export const notificationResponseSchema = z
  .object({
    id: z.string(),
    type: z.enum(["BOOKING_CONFIRMED", "BOOKING_REMINDER", "WAITLIST_AVAILABLE"]),
    message: z.string(),
    read: z.boolean(),
    createdAt: z.string(),
  })
  .openapi("Notification");
