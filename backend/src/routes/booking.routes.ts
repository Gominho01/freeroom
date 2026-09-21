import { Router } from "express";
import * as bookingController from "../controllers/booking.controller.js";
import { authenticate } from "../middlewares/auth.js";
import { validateBody, validateParams, validateQuery } from "../middlewares/validate.js";
import {
  bookingIdParamsSchema,
  createBookingSchema,
  listBookingsQuerySchema,
  recurrenceIdParamsSchema,
} from "../schemas/booking.schema.js";

export const bookingRouter = Router();

bookingRouter.use(authenticate);

bookingRouter.post("/", validateBody(createBookingSchema), bookingController.create);
bookingRouter.get("/", validateQuery(listBookingsQuerySchema), bookingController.list);
bookingRouter.delete(
  "/series/:recurrenceId",
  validateParams(recurrenceIdParamsSchema),
  bookingController.removeSeries,
);
bookingRouter.delete("/:id", validateParams(bookingIdParamsSchema), bookingController.remove);
