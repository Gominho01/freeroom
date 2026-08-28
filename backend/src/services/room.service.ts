import { prisma } from "../config/prisma.js";
import { NotFoundError } from "../lib/errors.js";
import type { CreateRoomBody, UpdateRoomBody } from "../schemas/room.schema.js";

export function listRooms() {
  return prisma.room.findMany({ orderBy: { createdAt: "desc" } });
}

export async function getRoomById(id: string) {
  const room = await prisma.room.findUnique({ where: { id } });
  if (!room) {
    throw new NotFoundError("Room not found");
  }
  return room;
}

export function createRoom(data: CreateRoomBody) {
  return prisma.room.create({
    data: {
      name: data.name,
      capacity: data.capacity,
      amenities: data.amenities,
    },
  });
}

export async function updateRoom(id: string, data: UpdateRoomBody) {
  await getRoomById(id);
  return prisma.room.update({ where: { id }, data });
}

export async function deleteRoom(id: string): Promise<void> {
  await getRoomById(id);
  await prisma.room.delete({ where: { id } });
}
