import { Router } from "express";
import { analyticsRouter } from "./analytics.routes.js";
import { authRouter } from "./auth.routes.js";
import { bookingRouter } from "./booking.routes.js";
import { roomRouter } from "./room.routes.js";

export const router = Router();

router.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

router.use("/auth", authRouter);
router.use("/rooms", roomRouter);
router.use("/bookings", bookingRouter);
router.use("/analytics", analyticsRouter);
