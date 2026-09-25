import { OpenAPIRegistry, OpenApiGeneratorV3 } from "@asteasolutions/zod-to-openapi";
import { z } from "../lib/zod.js";
import { leaderboardEntrySchema, occupancyEntrySchema } from "../schemas/analytics.schema.js";
import { authResponseSchema, loginBodySchema, registerBodySchema } from "../schemas/auth.schema.js";
import {
  bookingIdParamsSchema,
  bookingResponseSchema,
  createBookingBodySchema,
  listBookingsQuerySchema,
  recurrenceIdParamsSchema,
} from "../schemas/booking.schema.js";
import { notificationResponseSchema } from "../schemas/notification.schema.js";
import {
  createRoomBodySchema,
  roomIdParamsSchema,
  roomResponseSchema,
  updateRoomBodySchema,
} from "../schemas/room.schema.js";
import { joinWaitlistBodySchema, waitlistEntryResponseSchema, waitlistIdParamsSchema } from "../schemas/waitlist.schema.js";

const registry = new OpenAPIRegistry();

const bearerAuth = registry.registerComponent("securitySchemes", "bearerAuth", {
  type: "http",
  scheme: "bearer",
  bearerFormat: "JWT",
});

const authenticated = [{ [bearerAuth.name]: [] }];

const errorResponseSchema = registry.register(
  "ErrorResponse",
  z.object({
    error: z.object({
      message: z.string(),
      details: z.unknown().optional(),
    }),
  }),
);

function jsonContent(schema: z.ZodType) {
  return { content: { "application/json": { schema } } };
}

// --- Auth ---

registry.registerPath({
  method: "post",
  path: "/auth/register",
  tags: ["Auth"],
  request: { body: jsonContent(registerBodySchema) },
  responses: {
    201: { description: "User registered", ...jsonContent(authResponseSchema) },
    409: { description: "Email already in use", ...jsonContent(errorResponseSchema) },
  },
});

registry.registerPath({
  method: "post",
  path: "/auth/login",
  tags: ["Auth"],
  request: { body: jsonContent(loginBodySchema) },
  responses: {
    200: { description: "Login successful", ...jsonContent(authResponseSchema) },
    401: { description: "Invalid credentials", ...jsonContent(errorResponseSchema) },
  },
});

// --- Rooms ---

registry.registerPath({
  method: "get",
  path: "/rooms",
  tags: ["Rooms"],
  security: authenticated,
  responses: {
    200: { description: "List of rooms", ...jsonContent(z.array(roomResponseSchema)) },
    401: { description: "Unauthorized", ...jsonContent(errorResponseSchema) },
  },
});

registry.registerPath({
  method: "get",
  path: "/rooms/{id}",
  tags: ["Rooms"],
  security: authenticated,
  request: { params: roomIdParamsSchema },
  responses: {
    200: { description: "Room found", ...jsonContent(roomResponseSchema) },
    404: { description: "Room not found", ...jsonContent(errorResponseSchema) },
  },
});

registry.registerPath({
  method: "post",
  path: "/rooms",
  tags: ["Rooms"],
  security: authenticated,
  request: { body: jsonContent(createRoomBodySchema) },
  responses: {
    201: { description: "Room created", ...jsonContent(roomResponseSchema) },
    400: { description: "Validation error", ...jsonContent(errorResponseSchema) },
    403: { description: "Admin role required", ...jsonContent(errorResponseSchema) },
  },
});

registry.registerPath({
  method: "put",
  path: "/rooms/{id}",
  tags: ["Rooms"],
  security: authenticated,
  request: { params: roomIdParamsSchema, body: jsonContent(updateRoomBodySchema) },
  responses: {
    200: { description: "Room updated", ...jsonContent(roomResponseSchema) },
    403: { description: "Admin role required", ...jsonContent(errorResponseSchema) },
    404: { description: "Room not found", ...jsonContent(errorResponseSchema) },
  },
});

registry.registerPath({
  method: "delete",
  path: "/rooms/{id}",
  tags: ["Rooms"],
  security: authenticated,
  request: { params: roomIdParamsSchema },
  responses: {
    204: { description: "Room deleted" },
    403: { description: "Admin role required", ...jsonContent(errorResponseSchema) },
    404: { description: "Room not found", ...jsonContent(errorResponseSchema) },
  },
});

// --- Bookings ---

registry.registerPath({
  method: "post",
  path: "/bookings",
  tags: ["Bookings"],
  security: authenticated,
  request: { body: jsonContent(createBookingBodySchema) },
  responses: {
    201: {
      description: "Booking created — an array of one Booking per occurrence when `recurrence` was set",
      ...jsonContent(bookingResponseSchema),
    },
    400: { description: "Validation error", ...jsonContent(errorResponseSchema) },
    404: { description: "Room not found", ...jsonContent(errorResponseSchema) },
    409: { description: "Time slot conflict for the booking, or for one of the series' occurrences", ...jsonContent(errorResponseSchema) },
    429: { description: "Too many booking requests — rate limited per user", ...jsonContent(errorResponseSchema) },
  },
});

registry.registerPath({
  method: "get",
  path: "/bookings",
  tags: ["Bookings"],
  security: authenticated,
  request: { query: listBookingsQuerySchema },
  responses: {
    200: { description: "List of bookings", ...jsonContent(z.array(bookingResponseSchema)) },
  },
});

registry.registerPath({
  method: "delete",
  path: "/bookings/series/{recurrenceId}",
  tags: ["Bookings"],
  security: authenticated,
  request: { params: recurrenceIdParamsSchema },
  responses: {
    204: { description: "Every occurrence in the series cancelled" },
    403: { description: "Not the series owner", ...jsonContent(errorResponseSchema) },
    404: { description: "Booking series not found", ...jsonContent(errorResponseSchema) },
  },
});

registry.registerPath({
  method: "get",
  path: "/bookings/{id}/ics",
  tags: ["Bookings"],
  security: authenticated,
  request: { params: bookingIdParamsSchema },
  responses: {
    200: {
      description: "The booking as a single-event .ics file, for importing into a calendar app",
      content: { "text/calendar": { schema: z.string() } },
    },
    403: { description: "Not the booking owner", ...jsonContent(errorResponseSchema) },
    404: { description: "Booking not found", ...jsonContent(errorResponseSchema) },
  },
});

registry.registerPath({
  method: "delete",
  path: "/bookings/{id}",
  tags: ["Bookings"],
  security: authenticated,
  request: { params: bookingIdParamsSchema },
  responses: {
    204: { description: "Booking cancelled" },
    403: { description: "Not the booking owner", ...jsonContent(errorResponseSchema) },
    404: { description: "Booking not found", ...jsonContent(errorResponseSchema) },
  },
});

// --- Waitlist ---

registry.registerPath({
  method: "post",
  path: "/bookings/waitlist",
  tags: ["Waitlist"],
  security: authenticated,
  request: { body: jsonContent(joinWaitlistBodySchema) },
  responses: {
    201: { description: "Joined the waitlist for this room/time range", ...jsonContent(waitlistEntryResponseSchema) },
    400: { description: "Validation error", ...jsonContent(errorResponseSchema) },
    404: { description: "Room not found", ...jsonContent(errorResponseSchema) },
    429: { description: "Too many booking requests — rate limited per user", ...jsonContent(errorResponseSchema) },
  },
});

registry.registerPath({
  method: "get",
  path: "/bookings/waitlist",
  tags: ["Waitlist"],
  security: authenticated,
  responses: {
    200: { description: "The requester's waitlist entries", ...jsonContent(z.array(waitlistEntryResponseSchema)) },
  },
});

registry.registerPath({
  method: "delete",
  path: "/bookings/waitlist/{id}",
  tags: ["Waitlist"],
  security: authenticated,
  request: { params: waitlistIdParamsSchema },
  responses: {
    204: { description: "Left the waitlist" },
    403: { description: "Not the entry's owner", ...jsonContent(errorResponseSchema) },
    404: { description: "Waitlist entry not found", ...jsonContent(errorResponseSchema) },
  },
});

// --- Analytics ---

registry.registerPath({
  method: "get",
  path: "/analytics/leaderboard",
  tags: ["Analytics"],
  security: authenticated,
  responses: {
    200: { description: "Rooms ranked by usage this month", ...jsonContent(z.array(leaderboardEntrySchema)) },
  },
});

registry.registerPath({
  method: "get",
  path: "/analytics/occupancy",
  tags: ["Analytics"],
  security: authenticated,
  responses: {
    200: {
      description: "Booked minutes per room, broken down by day of week",
      ...jsonContent(z.array(occupancyEntrySchema)),
    },
    403: { description: "Admin role required", ...jsonContent(errorResponseSchema) },
  },
});

// --- Notifications ---

registry.registerPath({
  method: "get",
  path: "/notifications",
  tags: ["Notifications"],
  security: authenticated,
  responses: {
    200: { description: "The requester's notifications, newest first", ...jsonContent(z.array(notificationResponseSchema)) },
  },
});

registry.registerPath({
  method: "post",
  path: "/notifications/read",
  tags: ["Notifications"],
  security: authenticated,
  responses: {
    204: { description: "Every unread notification marked read" },
  },
});

export function generateOpenApiDocument() {
  const generator = new OpenApiGeneratorV3(registry.definitions);

  return generator.generateDocument({
    openapi: "3.0.0",
    info: {
      title: "FreeRoom API",
      version: "0.1.0",
      description: "Meeting room booking API.",
    },
    servers: [{ url: "/" }],
  });
}
