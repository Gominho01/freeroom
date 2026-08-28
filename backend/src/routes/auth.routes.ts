import { Router } from "express";
import * as authController from "../controllers/auth.controller.js";
import { validateBody } from "../middlewares/validate.js";
import { loginBodySchema, registerBodySchema } from "../schemas/auth.schema.js";

export const authRouter = Router();

authRouter.post("/register", validateBody(registerBodySchema), authController.register);
authRouter.post("/login", validateBody(loginBodySchema), authController.login);
