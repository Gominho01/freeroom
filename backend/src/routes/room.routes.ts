import { Router } from "express";
import * as roomController from "../controllers/room.controller.js";
import { authenticate, requireRole } from "../middlewares/auth.js";
import { validateBody, validateParams } from "../middlewares/validate.js";
import { createRoomBodySchema, roomIdParamsSchema, updateRoomBodySchema } from "../schemas/room.schema.js";

export const roomRouter = Router();

roomRouter.use(authenticate);

roomRouter.get("/", roomController.list);
roomRouter.get("/:id", validateParams(roomIdParamsSchema), roomController.getById);
roomRouter.post("/", requireRole("ADMIN"), validateBody(createRoomBodySchema), roomController.create);
roomRouter.put(
  "/:id",
  requireRole("ADMIN"),
  validateParams(roomIdParamsSchema),
  validateBody(updateRoomBodySchema),
  roomController.update,
);
roomRouter.delete("/:id", requireRole("ADMIN"), validateParams(roomIdParamsSchema), roomController.remove);
