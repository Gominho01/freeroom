import { Router } from "express";
import * as analyticsController from "../controllers/analytics.controller.js";
import { authenticate, requireRole } from "../middlewares/auth.js";

export const analyticsRouter = Router();

analyticsRouter.use(authenticate);

analyticsRouter.get("/leaderboard", analyticsController.leaderboard);
analyticsRouter.get("/occupancy", requireRole("ADMIN"), analyticsController.occupancy);
