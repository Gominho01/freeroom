import { Router } from "express";
import * as analyticsController from "../controllers/analytics.controller.js";
import { authenticate } from "../middlewares/auth.js";

export const analyticsRouter = Router();

analyticsRouter.use(authenticate);

analyticsRouter.get("/leaderboard", analyticsController.leaderboard);
