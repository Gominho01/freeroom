import type { Role } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { ConflictError, ForbiddenError, NotFoundError } from "../lib/errors.js";

export interface TimeRange {
  startTime: Date;
  endTime: Date;
}

/**
 * Pure, unit-testable overlap check: two half-open intervals [start, end)
 * overlap when one starts before the other ends, on both sides.
 */
export function rangesOverlap(a: TimeRange, b: TimeRange): boolean {
  return a.startTime < b.endTime && b.startTime < a.endTime;
}

/**
 * Pure, unit-testable conflict check: does `candidate` overlap any of the
 * `existing` bookings for the same room?
 */
export function findConflict<T extends TimeRange>(candidate: TimeRange, existing: T[]): T | undefined {
  return existing.find((booking) => rangesOverlap(candidate, booking));
}

export interface CreateBookingParams {
  roomId: string;
  userId: string;
  startTime: Date;
  endTime: Date;
}

export async function createBooking(params: CreateBookingParams) {
  const room = await prisma.room.findUnique({ where: { id: params.roomId } });
  if (!room) {
    throw new NotFoundError("Room not found");
  }

  // Narrowed by the (roomId, startTime, endTime) index; the exact overlap
  // rule is then applied via the pure `findConflict` function above so the
  // tested logic and the enforced logic never drift apart.
  const roomBookings = await prisma.booking.findMany({
    where: { roomId: params.roomId },
    select: { id: true, startTime: true, endTime: true },
  });

  const conflict = findConflict({ startTime: params.startTime, endTime: params.endTime }, roomBookings);
  if (conflict) {
    throw new ConflictError("Room is already booked for the requested time range", {
      conflictingBookingId: conflict.id,
    });
  }

  return prisma.booking.create({
    data: {
      roomId: params.roomId,
      userId: params.userId,
      startTime: params.startTime,
      endTime: params.endTime,
    },
  });
}

export interface ListBookingsFilters {
  roomId?: string;
  userId?: string;
  from?: Date;
  to?: Date;
}

export function listBookings(filters: ListBookingsFilters) {
  return prisma.booking.findMany({
    where: {
      ...(filters.roomId ? { roomId: filters.roomId } : {}),
      ...(filters.userId ? { userId: filters.userId } : {}),
      ...(filters.from ? { endTime: { gt: filters.from } } : {}),
      ...(filters.to ? { startTime: { lt: filters.to } } : {}),
    },
    // Admins can list every user's bookings (no userId filter); the owner's
    // name rides along so the UI can tell whose booking is whose.
    include: { user: { select: { id: true, name: true } } },
    orderBy: { startTime: "asc" },
  });
}

export async function cancelBooking(id: string, requester: { id: string; role: Role }): Promise<void> {
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) {
    throw new NotFoundError("Booking not found");
  }

  if (booking.userId !== requester.id && requester.role !== "ADMIN") {
    throw new ForbiddenError("You can only cancel your own bookings");
  }

  await prisma.booking.delete({ where: { id } });
}
