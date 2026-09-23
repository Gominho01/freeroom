import type { Request, Response } from "express";
import { UnauthorizedError } from "../lib/errors.js";
import * as notificationService from "../services/notification.service.js";

function requireUser(req: Request) {
  if (!req.user) {
    throw new UnauthorizedError();
  }
  return req.user;
}

export async function list(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const notifications = await notificationService.listNotifications(user.id);
  res.status(200).json(notifications);
}

export async function markAllRead(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  await notificationService.markAllNotificationsRead(user.id);
  res.status(204).send();
}
