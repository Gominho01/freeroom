import { z } from "../lib/zod.js";

export const roomResponseSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    nickname: z.string(),
    quirks: z.array(z.string()),
    capacity: z.number().int(),
    amenities: z.array(z.string()),
    photos: z.array(z.string()),
    createdAt: z.string(),
  })
  .openapi("Room");

export const createRoomBodySchema = z
  .object({
    name: z.string().min(1).openapi({ example: "Conference Room A" }),
    // The room's identity in the UI — a nickname plus a couple of known
    // quirks, e.g. "the one with the broken AC".
    nickname: z.string().min(1).openapi({ example: "The Fridge" }),
    quirks: z.array(z.string()).default([]).openapi({ example: ["Broken AC", "Weak Wi-Fi"] }),
    capacity: z.number().int().positive().openapi({ example: 8 }),
    amenities: z.array(z.string()).default([]).openapi({ example: ["projector", "tv"] }),
    photos: z
      .array(z.string().url())
      .default([])
      .openapi({ example: ["https://images.unsplash.com/photo-1497366216548-37526070297c"] }),
  })
  .openapi("CreateRoomRequest");

export const updateRoomBodySchema = z
  .object({
    name: z.string().min(1).optional(),
    nickname: z.string().min(1).optional(),
    quirks: z.array(z.string()).optional(),
    capacity: z.number().int().positive().optional(),
    amenities: z.array(z.string()).optional(),
    photos: z.array(z.string().url()).optional(),
  })
  .openapi("UpdateRoomRequest");

export const roomIdParamsSchema = z.object({
  id: z.string().min(1),
});

export type CreateRoomBody = z.infer<typeof createRoomBodySchema>;
export type UpdateRoomBody = z.infer<typeof updateRoomBodySchema>;
