import { z } from "../lib/zod.js";

export const bookingResponseSchema = z
  .object({
    id: z.string(),
    roomId: z.string(),
    userId: z.string(),
    startTime: z.string(),
    endTime: z.string(),
    createdAt: z.string(),
    // Set on every occurrence of a recurring booking, sharing one value per
    // series — null for a one-off.
    recurrenceId: z.string().nullable().optional(),
    // Only populated by GET /bookings, where an admin can see every user's
    // bookings — lets the UI show whose booking is whose.
    user: z.object({ id: z.string(), name: z.string() }).optional(),
  })
  .openapi("Booking");

// Registered for OpenAPI docs. Runtime validation uses `createBookingSchema`
// below, which adds the cross-field endTime > startTime refinement.
export const createBookingBodySchema = z
  .object({
    roomId: z.string().min(1).openapi({ example: "clx0000000000000000000000" }),
    startTime: z.iso.datetime().openapi({ example: "2030-01-01T10:00:00.000Z" }),
    endTime: z.iso.datetime().openapi({ example: "2030-01-01T11:00:00.000Z" }),
    // When set, books the same weekly time slot for this many occurrences
    // (including the first) instead of a single booking.
    recurrence: z
      .object({
        occurrences: z.number().int().min(2).max(12).openapi({ example: 4 }),
      })
      .optional(),
  })
  .openapi("CreateBookingRequest");

export const createBookingSchema = createBookingBodySchema
  .refine((data) => new Date(data.endTime).getTime() > new Date(data.startTime).getTime(), {
    message: "endTime must be after startTime",
    path: ["endTime"],
  })
  .refine((data) => new Date(data.startTime).getTime() > Date.now(), {
    message: "startTime must be in the future",
    path: ["startTime"],
  });

export const listBookingsQuerySchema = z.object({
  roomId: z.string().min(1).optional(),
  userId: z.string().min(1).optional(),
  from: z.iso.datetime().optional(),
  to: z.iso.datetime().optional(),
});

export const bookingIdParamsSchema = z.object({
  id: z.string().min(1),
});

export const recurrenceIdParamsSchema = z.object({
  recurrenceId: z.string().min(1),
});

export type CreateBookingBody = z.infer<typeof createBookingBodySchema>;
export type ListBookingsQuery = z.infer<typeof listBookingsQuerySchema>;
