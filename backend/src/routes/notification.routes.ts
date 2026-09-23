import { Router } from "express";
import * as notificationController from "../controllers/notification.controller.js";
import { authenticate } from "../middlewares/auth.js";

export const notificationRouter = Router();

notificationRouter.use(authenticate);

notificationRouter.get("/", notificationController.list);
notificationRouter.post("/read", notificationController.markAllRead);
