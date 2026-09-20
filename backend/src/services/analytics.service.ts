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

export const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
export type DayOfWeek = (typeof DAYS_OF_WEEK)[number];

export interface OccupancyBooking {
  roomId: string;
  startTime: Date;
  endTime: Date;
  room: { name: string; nickname: string };
}

export interface OccupancyEntry {
  roomId: string;
  name: string;
  nickname: string;
  minutesByDay: Record<DayOfWeek, number>;
}

function emptyMinutesByDay(): Record<DayOfWeek, number> {
  return { Sun: 0, Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0 };
}

/**
 * Pure, unit-testable aggregation, same split as `aggregateLeaderboard`: how
 * many minutes has each room been booked for, broken down by day of week —
 * the shape the admin dashboard's chart needs, independent of any single
 * month.
 */
export function aggregateOccupancy(bookings: OccupancyBooking[]): OccupancyEntry[] {
  const byRoom = new Map<string, OccupancyEntry>();

  for (const booking of bookings) {
    const entry = byRoom.get(booking.roomId) ?? {
      roomId: booking.roomId,
      name: booking.room.name,
      nickname: booking.room.nickname,
      minutesByDay: emptyMinutesByDay(),
    };
    const day = DAYS_OF_WEEK[booking.startTime.getDay()] as DayOfWeek;
    entry.minutesByDay[day] += (booking.endTime.getTime() - booking.startTime.getTime()) / 60_000;
    byRoom.set(booking.roomId, entry);
  }

  return [...byRoom.values()];
}

export async function getOccupancyByRoomAndDay(): Promise<OccupancyEntry[]> {
  const bookings = await prisma.booking.findMany({
    select: {
      roomId: true,
      startTime: true,
      endTime: true,
      room: { select: { name: true, nickname: true } },
    },
  });

  return aggregateOccupancy(bookings);
}
