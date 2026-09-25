import type { Request, Response } from "express";
import * as roomService from "../services/room.service.js";
import type { CreateRoomBody, UpdateRoomBody } from "../schemas/room.schema.js";

export async function list(_req: Request, res: Response): Promise<void> {
  const rooms = await roomService.listRooms();
  res.status(200).json(rooms);
}

export async function getById(req: Request, res: Response): Promise<void> {
  const room = await roomService.getRoomById(req.params.id as string);
  res.status(200).json(room);
}

export async function create(req: Request, res: Response): Promise<void> {
  const body = req.body as CreateRoomBody;
  const room = await roomService.createRoom(body);
  res.status(201).json(room);
}

export async function update(req: Request, res: Response): Promise<void> {
  const body = req.body as UpdateRoomBody;
  const room = await roomService.updateRoom(req.params.id as string, body);
  res.status(200).json(room);
}

export async function remove(req: Request, res: Response): Promise<void> {
  await roomService.deleteRoom(req.params.id as string);
  res.status(204).send();
}
