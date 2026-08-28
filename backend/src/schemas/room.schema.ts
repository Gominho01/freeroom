import { z } from "../lib/zod.js";

export const roomResponseSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    capacity: z.number().int(),
    amenities: z.array(z.string()),
    createdAt: z.string(),
  })
  .openapi("Room");

export const createRoomBodySchema = z
  .object({
    name: z.string().min(1).openapi({ example: "Conference Room A" }),
    capacity: z.number().int().positive().openapi({ example: 8 }),
    amenities: z.array(z.string()).default([]).openapi({ example: ["projector", "tv"] }),
  })
  .openapi("CreateRoomRequest");

export const updateRoomBodySchema = z
  .object({
    name: z.string().min(1).optional(),
    capacity: z.number().int().positive().optional(),
    amenities: z.array(z.string()).optional(),
  })
  .openapi("UpdateRoomRequest");

export const roomIdParamsSchema = z.object({
  id: z.string().min(1),
});

export type CreateRoomBody = z.infer<typeof createRoomBodySchema>;
export type UpdateRoomBody = z.infer<typeof updateRoomBodySchema>;
