import rateLimit from "express-rate-limit";
import { TooManyRequestsError } from "../lib/errors.js";

/** Limits how often one user can create a booking or join a waitlist —
 * keyed by user id rather than IP, since every route this guards already
 * sits behind `authenticate`. Shared across both actions so switching
 * between them doesn't reset the budget. */
export const bookingCreationRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id ?? req.ip ?? "unknown",
  handler: (_req, _res, next) => {
    next(new TooManyRequestsError("Too many booking requests — please wait a moment and try again."));
  },
});
