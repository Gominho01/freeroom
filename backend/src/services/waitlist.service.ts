import type { TimeRange } from "./booking.service.js";
import { findConflict, formatRange, rangesOverlap } from "./booking.service.js";
import { prisma } from "../config/prisma.js";
import { ForbiddenError, NotFoundError } from "../lib/errors.js";
import { notify } from "./notification.service.js";

export interface JoinWaitlistParams {
  roomId: string;
  userId: string;
  startTime: Date;
  endTime: Date;
}

export async function joinWaitlist(params: JoinWaitlistParams) {
  const room = await prisma.room.findUnique({ where: { id: params.roomId } });
  if (!room) {
    throw new NotFoundError("Room not found");
  }

  return prisma.waitlistEntry.create({
    data: {
      roomId: params.roomId,
      userId: params.userId,
      startTime: params.startTime,
      endTime: params.endTime,
    },
  });
}

export function listWaitlist(userId: string) {
  return prisma.waitlistEntry.findMany({
    where: { userId },
    include: { room: { select: { id: true, nickname: true } } },
    orderBy: { createdAt: "asc" },
  });
}

export async function leaveWaitlist(id: string, requester: { id: string; role: string }): Promise<void> {
  const entry = await prisma.waitlistEntry.findUnique({ where: { id } });
  if (!entry) {
    throw new NotFoundError("Waitlist entry not found");
  }

  if (entry.userId !== requester.id && requester.role !== "ADMIN") {
    throw new ForbiddenError("You can only leave your own waitlist entries");
  }

  await prisma.waitlistEntry.delete({ where: { id } });
}

/**
 * Automatically books the slot for whoever's been waiting longest, among
 * everyone waitlisted for a range that overlaps the slot that just freed up
 * (a booking was cancelled) — first come, first served.
 *
 * Each candidate's own exact range is re-checked against the room's current
 * bookings (not just compared to the freed range) before booking it, since
 * the freed range alone doesn't guarantee a candidate's full requested range
 * is clear — another, unrelated booking could still cover part of it. A
 * candidate that doesn't fit is left on the waitlist untouched, to get
 * another chance the next time a relevant slot frees up.
 */
export async function fulfillWaitlistForFreedSlot(roomId: string, range: TimeRange): Promise<void> {
  // Narrowed by roomId only; the exact overlap rule is then applied via the
  // same tested `rangesOverlap` the booking conflict check uses.
  const entries = await prisma.waitlistEntry.findMany({
    where: { roomId },
    include: { room: { select: { nickname: true } } },
    orderBy: { createdAt: "asc" },
  });

  const candidates = entries.filter((entry) => rangesOverlap(entry, range));

  for (const candidate of candidates) {
    // Re-fetched on every iteration: an earlier candidate in this same loop
    // may have just taken part of the freed slot.
    const roomBookings = await prisma.booking.findMany({
      where: { roomId },
      select: { startTime: true, endTime: true },
    });
    if (findConflict(candidate, roomBookings)) continue;

    await prisma.booking.create({
      data: {
        roomId,
        userId: candidate.userId,
        startTime: candidate.startTime,
        endTime: candidate.endTime,
      },
    });
    await prisma.waitlistEntry.delete({ where: { id: candidate.id } });

    await notify({
      userId: candidate.userId,
      type: "WAITLIST_AVAILABLE",
      message: `${candidate.room.nickname} opened up and you're booked for ${formatRange(candidate.startTime, candidate.endTime)}.`,
      email: {
        subject: `Booked from your waitlist: ${candidate.room.nickname}`,
        text: `A slot you were waitlisted for opened up, and we booked it for you: ${candidate.room.nickname}, ${formatRange(candidate.startTime, candidate.endTime)}.`,
      },
    });
  }
}
