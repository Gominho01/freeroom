import type { Role } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { prisma } from "../config/prisma.js";
import { ConflictError, ForbiddenError, NotFoundError } from "../lib/errors.js";
import { notify } from "./notification.service.js";

export interface TimeRange {
  startTime: Date;
  endTime: Date;
}

/** A plain, timezone-independent "Jan 7, 2030, 10:00–11:00" for notification
 * text — not meant to be pretty, just deterministic (UTC, no locale). */
export function formatRange(startTime: Date, endTime: Date): string {
  const date = startTime.toISOString().slice(0, 10);
  const start = startTime.toISOString().slice(11, 16);
  const end = endTime.toISOString().slice(11, 16);
  return `${date}, ${start}–${end}`;
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

  const booking = await prisma.booking.create({
    data: {
      roomId: params.roomId,
      userId: params.userId,
      startTime: params.startTime,
      endTime: params.endTime,
    },
  });

  await notify({
    userId: params.userId,
    type: "BOOKING_CONFIRMED",
    message: `Booked ${room.nickname} for ${formatRange(params.startTime, params.endTime)}.`,
    email: {
      subject: `Booking confirmed: ${room.nickname}`,
      text: `Your booking for ${room.nickname} is confirmed for ${formatRange(params.startTime, params.endTime)}.`,
    },
  });

  return booking;
}

/**
 * Pure, unit-testable: the same time-of-day/duration, one occurrence a week
 * apart, `count` times (including the first).
 */
export function weeklyOccurrences(start: Date, end: Date, count: number): TimeRange[] {
  const durationMs = end.getTime() - start.getTime();
  const weekMs = 7 * 24 * 60 * 60 * 1000;

  return Array.from({ length: count }, (_, i) => ({
    startTime: new Date(start.getTime() + i * weekMs),
    endTime: new Date(start.getTime() + i * weekMs + durationMs),
  }));
}

export interface CreateRecurringBookingParams extends CreateBookingParams {
  occurrences: number;
}

/**
 * Books the same weekly slot `occurrences` times as one series, or rejects
 * the whole series if any single occurrence would conflict — never creates
 * a partial series.
 */
export async function createRecurringBooking(params: CreateRecurringBookingParams) {
  const room = await prisma.room.findUnique({ where: { id: params.roomId } });
  if (!room) {
    throw new NotFoundError("Room not found");
  }

  const candidates = weeklyOccurrences(params.startTime, params.endTime, params.occurrences);

  const roomBookings = await prisma.booking.findMany({
    where: { roomId: params.roomId },
    select: { id: true, startTime: true, endTime: true },
  });

  for (const candidate of candidates) {
    const conflict = findConflict(candidate, roomBookings);
    if (conflict) {
      throw new ConflictError("Room is already booked for one or more occurrences in this series", {
        conflictingBookingId: conflict.id,
        conflictingStartTime: candidate.startTime.toISOString(),
      });
    }
  }

  const recurrenceId = randomUUID();
  const bookings = await prisma.$transaction(
    candidates.map((candidate) =>
      prisma.booking.create({
        data: {
          roomId: params.roomId,
          userId: params.userId,
          startTime: candidate.startTime,
          endTime: candidate.endTime,
          recurrenceId,
        },
      }),
    ),
  );

  // One notification for the whole series, not one per occurrence.
  await notify({
    userId: params.userId,
    type: "BOOKING_CONFIRMED",
    message: `Booked ${room.nickname} weekly, ${params.occurrences} times starting ${formatRange(params.startTime, params.endTime)}.`,
    email: {
      subject: `Booking series confirmed: ${room.nickname}`,
      text: `Your weekly booking for ${room.nickname} is confirmed for ${params.occurrences} occurrences, starting ${formatRange(params.startTime, params.endTime)}.`,
    },
  });

  return bookings;
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

export async function cancelBooking(id: string, requester: { id: string; role: Role }) {
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) {
    throw new NotFoundError("Booking not found");
  }

  if (booking.userId !== requester.id && requester.role !== "ADMIN") {
    throw new ForbiddenError("You can only cancel your own bookings");
  }

  await prisma.booking.delete({ where: { id } });
  return booking;
}

export async function cancelBookingSeries(recurrenceId: string, requester: { id: string; role: Role }) {
  const bookings = await prisma.booking.findMany({ where: { recurrenceId } });
  if (bookings.length === 0) {
    throw new NotFoundError("Booking series not found");
  }

  const isOwner = bookings.every((booking) => booking.userId === requester.id);
  if (!isOwner && requester.role !== "ADMIN") {
    throw new ForbiddenError("You can only cancel your own bookings");
  }

  await prisma.booking.deleteMany({ where: { recurrenceId } });
  return bookings;
}

export const REMINDER_LEAD_TIME_MS = 15 * 60 * 1000;

/**
 * One polling tick: emails+notifies whoever has a booking starting within
 * the next `REMINDER_LEAD_TIME_MS`, once each — `reminderSentAt` is the
 * guard against sending it twice on the next tick.
 */
export async function sendDueReminders(now: Date = new Date()): Promise<void> {
  const dueBookings = await prisma.booking.findMany({
    where: {
      reminderSentAt: null,
      startTime: { gt: now, lte: new Date(now.getTime() + REMINDER_LEAD_TIME_MS) },
    },
    include: { room: true },
  });

  for (const booking of dueBookings) {
    await notify({
      userId: booking.userId,
      type: "BOOKING_REMINDER",
      message: `Reminder: ${booking.room.nickname} starts soon (${formatRange(booking.startTime, booking.endTime)}).`,
      email: {
        subject: `Starting soon: ${booking.room.nickname}`,
        text: `Your booking for ${booking.room.nickname} starts at ${formatRange(booking.startTime, booking.endTime)}.`,
      },
    });

    await prisma.booking.update({ where: { id: booking.id }, data: { reminderSentAt: now } });
  }
}
