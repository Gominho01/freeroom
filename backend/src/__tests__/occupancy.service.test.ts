import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../config/prisma.js";
import { getCurrentOccupant } from "../services/occupancy.service.js";
import { resetDatabase } from "./helpers.js";

// These hit a real Postgres via Prisma (DATABASE_URL), same as the other
// integration suites — no manual check-in exists, so the only way to
// exercise this is by seeding a booking directly.

describe("getCurrentOccupant", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await resetDatabase();
    await prisma.$disconnect();
  });

  it("returns null when the room has no booking at all", async () => {
    const room = await prisma.room.create({
      data: { name: "Room A", nickname: "The Fridge", capacity: 4, amenities: [] },
    });

    const occupant = await getCurrentOccupant(room.id, new Date("2030-01-01T10:00:00.000Z"));

    expect(occupant).toBeNull();
  });

  it("returns the user of the currently active booking", async () => {
    const user = await prisma.user.create({
      data: { email: "ada@example.com", password: "hashed", name: "Ada", avatarSeed: "ada-seed" },
    });
    const room = await prisma.room.create({
      data: { name: "Room A", nickname: "The Fridge", capacity: 4, amenities: [] },
    });
    const booking = await prisma.booking.create({
      data: {
        roomId: room.id,
        userId: user.id,
        startTime: new Date("2030-01-01T10:00:00.000Z"),
        endTime: new Date("2030-01-01T11:00:00.000Z"),
      },
    });

    const occupant = await getCurrentOccupant(room.id, new Date("2030-01-01T10:30:00.000Z"));

    expect(occupant).toMatchObject({
      bookingId: booking.id,
      endsAt: booking.endTime.toISOString(),
      user: { id: user.id, name: "Ada", avatarSeed: "ada-seed" },
    });
  });

  it("ignores bookings that haven't started yet or have already ended", async () => {
    const user = await prisma.user.create({
      data: { email: "bob@example.com", password: "hashed", name: "Bob", avatarSeed: "bob-seed" },
    });
    const room = await prisma.room.create({
      data: { name: "Room B", nickname: "The Aquarium", capacity: 4, amenities: [] },
    });
    await prisma.booking.create({
      data: {
        roomId: room.id,
        userId: user.id,
        startTime: new Date("2030-01-01T10:00:00.000Z"),
        endTime: new Date("2030-01-01T11:00:00.000Z"),
      },
    });

    const before = await getCurrentOccupant(room.id, new Date("2030-01-01T09:59:00.000Z"));
    const after = await getCurrentOccupant(room.id, new Date("2030-01-01T11:00:00.000Z"));

    expect(before).toBeNull();
    expect(after).toBeNull();
  });
});
