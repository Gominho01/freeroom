import type { Request, Response } from "express";
import { UnauthorizedError } from "../lib/errors.js";
import * as waitlistService from "../services/waitlist.service.js";
import type { JoinWaitlistBody } from "../schemas/waitlist.schema.js";

function requireUser(req: Request) {
  if (!req.user) {
    throw new UnauthorizedError();
  }
  return req.user;
}

export async function join(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const body = req.body as JoinWaitlistBody;

  const entry = await waitlistService.joinWaitlist({
    roomId: body.roomId,
    userId: user.id,
    startTime: new Date(body.startTime),
    endTime: new Date(body.endTime),
  });

  res.status(201).json(entry);
}

export async function list(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const entries = await waitlistService.listWaitlist(user.id);
  res.status(200).json(entries);
}

export async function leave(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  await waitlistService.leaveWaitlist(req.params.id as string, user);
  res.status(204).send();
}
