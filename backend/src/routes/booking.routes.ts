import { Router } from "express";
import * as bookingController from "../controllers/booking.controller.js";
import * as waitlistController from "../controllers/waitlist.controller.js";
import { authenticate } from "../middlewares/auth.js";
import { bookingCreationRateLimiter } from "../middlewares/rateLimit.js";
import { validateBody, validateParams, validateQuery } from "../middlewares/validate.js";
import {
  bookingIdParamsSchema,
  createBookingSchema,
  listBookingsQuerySchema,
  recurrenceIdParamsSchema,
} from "../schemas/booking.schema.js";
import { joinWaitlistBodySchema, waitlistIdParamsSchema } from "../schemas/waitlist.schema.js";

export const bookingRouter = Router();

bookingRouter.use(authenticate);

bookingRouter.post("/", bookingCreationRateLimiter, validateBody(createBookingSchema), bookingController.create);
bookingRouter.get("/", validateQuery(listBookingsQuerySchema), bookingController.list);
bookingRouter.delete(
  "/series/:recurrenceId",
  validateParams(recurrenceIdParamsSchema),
  bookingController.removeSeries,
);
bookingRouter.post("/waitlist", bookingCreationRateLimiter, validateBody(joinWaitlistBodySchema), waitlistController.join);
bookingRouter.get("/waitlist", waitlistController.list);
bookingRouter.delete("/waitlist/:id", validateParams(waitlistIdParamsSchema), waitlistController.leave);
bookingRouter.get("/:id/ics", validateParams(bookingIdParamsSchema), bookingController.exportIcs);
bookingRouter.delete("/:id", validateParams(bookingIdParamsSchema), bookingController.remove);
