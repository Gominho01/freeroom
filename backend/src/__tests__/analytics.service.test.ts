import { describe, expect, it } from "vitest";
import { aggregateLeaderboard, type LeaderboardBooking } from "../services/analytics.service.js";

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
