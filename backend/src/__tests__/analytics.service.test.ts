import { describe, expect, it } from "vitest";
import {
  aggregateLeaderboard,
  aggregateOccupancy,
  type LeaderboardBooking,
  type OccupancyBooking,
} from "../services/analytics.service.js";

function booking(overrides: Partial<LeaderboardBooking> = {}): LeaderboardBooking {
  return {
    roomId: "room-1",
    startTime: new Date("2030-01-01T10:00:00.000Z"),
    endTime: new Date("2030-01-01T11:00:00.000Z"),
    room: { name: "Room A", nickname: "The Fridge" },
    ...overrides,
  };
}

describe("aggregateLeaderboard", () => {
  it("returns an empty list when there are no bookings", () => {
    expect(aggregateLeaderboard([])).toEqual([]);
  });

  it("sums booked minutes and counts bookings per room", () => {
    const entries = aggregateLeaderboard([
      booking(),
      booking({ startTime: new Date("2030-01-02T10:00:00.000Z"), endTime: new Date("2030-01-02T10:30:00.000Z") }),
    ]);

    expect(entries).toEqual([
      { roomId: "room-1", name: "Room A", nickname: "The Fridge", bookingCount: 2, totalMinutes: 90 },
    ]);
  });

  it("ranks rooms by total booked minutes, most-used first", () => {
    const entries = aggregateLeaderboard([
      booking({
        roomId: "room-1",
        room: { name: "Room A", nickname: "The Fridge" },
        endTime: new Date("2030-01-01T10:30:00.000Z"),
      }),
      booking({
        roomId: "room-2",
        room: { name: "Room B", nickname: "The Aquarium" },
        endTime: new Date("2030-01-01T12:00:00.000Z"),
      }),
    ]);

    expect(entries.map((e) => e.roomId)).toEqual(["room-2", "room-1"]);
  });

  it("breaks a tie in total minutes by booking count", () => {
    const entries = aggregateLeaderboard([
      booking({ roomId: "room-1", room: { name: "Room A", nickname: "The Fridge" } }),
      booking({ roomId: "room-1", room: { name: "Room A", nickname: "The Fridge" } }),
      booking({
        roomId: "room-2",
        room: { name: "Room B", nickname: "The Aquarium" },
        endTime: new Date("2030-01-01T12:00:00.000Z"),
      }),
    ]);

    expect(entries.map((e) => e.roomId)).toEqual(["room-1", "room-2"]);
  });
});

function occupancyBooking(overrides: Partial<OccupancyBooking> = {}): OccupancyBooking {
  return {
    roomId: "room-1",
    // 2030-01-07 is a Monday.
    startTime: new Date("2030-01-07T10:00:00.000Z"),
    endTime: new Date("2030-01-07T11:00:00.000Z"),
    room: { name: "Room A", nickname: "The Fridge" },
    ...overrides,
  };
}

describe("aggregateOccupancy", () => {
  it("returns an empty list when there are no bookings", () => {
    expect(aggregateOccupancy([])).toEqual([]);
  });

  it("buckets booked minutes under the booking's day of week", () => {
    const [entry] = aggregateOccupancy([occupancyBooking()]);

    expect(entry?.minutesByDay).toMatchObject({ Mon: 60, Sun: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0 });
  });

  it("sums multiple bookings on the same day and keeps other days separate", () => {
    const [entry] = aggregateOccupancy([
      occupancyBooking(),
      occupancyBooking({
        startTime: new Date("2030-01-07T14:00:00.000Z"),
        endTime: new Date("2030-01-07T14:30:00.000Z"),
      }),
      // 2030-01-08 is a Tuesday.
      occupancyBooking({
        startTime: new Date("2030-01-08T09:00:00.000Z"),
        endTime: new Date("2030-01-08T10:00:00.000Z"),
      }),
    ]);

    expect(entry?.minutesByDay.Mon).toBe(90);
    expect(entry?.minutesByDay.Tue).toBe(60);
  });

  it("keeps separate entries per room", () => {
    const entries = aggregateOccupancy([
      occupancyBooking({ roomId: "room-1", room: { name: "Room A", nickname: "The Fridge" } }),
      occupancyBooking({ roomId: "room-2", room: { name: "Room B", nickname: "The Aquarium" } }),
    ]);

    expect(entries.map((e) => e.roomId).sort()).toEqual(["room-1", "room-2"]);
  });
});
