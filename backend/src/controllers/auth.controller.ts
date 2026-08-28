import type { Request, Response } from "express";
import { loginUser, registerUser, toUserResponse } from "../services/auth.service.js";
import type { LoginBody, RegisterBody } from "../schemas/auth.schema.js";

export async function register(req: Request, res: Response): Promise<void> {
  const body = req.body as RegisterBody;
  const { token, user } = await registerUser(body);
  res.status(201).json({ token, user: toUserResponse(user) });
}

export async function login(req: Request, res: Response): Promise<void> {
  const body = req.body as LoginBody;
  const { token, user } = await loginUser(body);
  res.status(200).json({ token, user: toUserResponse(user) });
}
