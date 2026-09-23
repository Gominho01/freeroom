import { z } from "../lib/zod.js";

export const joinWaitlistBodySchema = z
  .object({
    roomId: z.string().min(1).openapi({ example: "clx0000000000000000000000" }),
    startTime: z.iso.datetime().openapi({ example: "2030-01-01T10:00:00.000Z" }),
    endTime: z.iso.datetime().openapi({ example: "2030-01-01T11:00:00.000Z" }),
  })
  .refine((data) => new Date(data.endTime).getTime() > new Date(data.startTime).getTime(), {
    message: "endTime must be after startTime",
    path: ["endTime"],
  })
  .openapi("JoinWaitlistRequest");

export const waitlistEntryResponseSchema = z
  .object({
    id: z.string(),
    roomId: z.string(),
    userId: z.string(),
    startTime: z.string(),
    endTime: z.string(),
    createdAt: z.string(),
    room: z.object({ id: z.string(), nickname: z.string() }).optional(),
  })
  .openapi("WaitlistEntry");

export const waitlistIdParamsSchema = z.object({
  id: z.string().min(1),
});

export type JoinWaitlistBody = z.infer<typeof joinWaitlistBodySchema>;
