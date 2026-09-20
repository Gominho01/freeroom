import { prisma } from "../config/prisma.js";

export interface LeaderboardBooking {
  roomId: string;
  startTime: Date;
  endTime: Date;
  room: { name: string; nickname: string };
}

export interface LeaderboardEntry {
  roomId: string;
  name: string;
  nickname: string;
  bookingCount: number;
  totalMinutes: number;
}

/**
 * Pure, unit-testable aggregation: ranks rooms by total booked minutes this
 * month (falling back to booking count on a tie), same split between pure
 * logic and the Prisma fetch as `booking.service`'s overlap check.
 */
export function aggregateLeaderboard(bookings: LeaderboardBooking[]): LeaderboardEntry[] {
  const byRoom = new Map<string, LeaderboardEntry>();

  for (const booking of bookings) {
    const entry = byRoom.get(booking.roomId) ?? {
      roomId: booking.roomId,
      name: booking.room.name,
      nickname: booking.room.nickname,
      bookingCount: 0,
      totalMinutes: 0,
    };
    entry.bookingCount += 1;
    entry.totalMinutes += (booking.endTime.getTime() - booking.startTime.getTime()) / 60_000;
    byRoom.set(booking.roomId, entry);
  }

  return [...byRoom.values()].sort(
    (a, b) => b.totalMinutes - a.totalMinutes || b.bookingCount - a.bookingCount,
  );
}

function startOfMonth(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export async function getUsageLeaderboard(now: Date = new Date()): Promise<LeaderboardEntry[]> {
  const bookings = await prisma.booking.findMany({
    where: { startTime: { gte: startOfMonth(now) } },
    select: {
      roomId: true,
      startTime: true,
      endTime: true,
      room: { select: { name: true, nickname: true } },
    },
  });

  return aggregateLeaderboard(bookings);
}
