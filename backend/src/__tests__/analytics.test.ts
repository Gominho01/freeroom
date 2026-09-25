import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../config/prisma.js";
import { app } from "../index.js";
import { createUser, resetDatabase } from "./helpers.js";

// These integration tests hit a real Postgres via Prisma (DATABASE_URL).
// They require `docker compose up -d && npm run prisma:migrate` locally.

describe("Analytics", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await resetDatabase();
    await prisma.$disconnect();
  });

  it("requires authentication to view the leaderboard", async () => {
    const response = await request(app).get("/analytics/leaderboard");
    expect(response.status).toBe(401);
  });

  it("ranks rooms by minutes booked this month, most-used first", async () => {
    const admin = await createUser("ADMIN");
    const user = await createUser("USER");

    const roomA = await prisma.room.create({
      data: { name: "Room A", nickname: "The Fridge", capacity: 4, amenities: [] },
    });
    const roomB = await prisma.room.create({
      data: { name: "Room B", nickname: "The Aquarium", capacity: 4, amenities: [] },
    });

    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 10, 0, 0);

    await prisma.booking.create({
      data: {
        roomId: roomB.id,
        userId: user.user.id,
        startTime: start,
        endTime: new Date(start.getTime() + 2 * 60 * 60 * 1000),
      },
    });
    await prisma.booking.create({
      data: {
        roomId: roomA.id,
        userId: user.user.id,
        startTime: new Date(start.getTime() + 3 * 60 * 60 * 1000),
        endTime: new Date(start.getTime() + 3.5 * 60 * 60 * 1000),
      },
    });

    const response = await request(app).get("/analytics/leaderboard").set("Authorization", `Bearer ${admin.token}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      expect.objectContaining({ roomId: roomB.id, nickname: "The Aquarium", bookingCount: 1, totalMinutes: 120 }),
      expect.objectContaining({ roomId: roomA.id, nickname: "The Fridge", bookingCount: 1, totalMinutes: 30 }),
    ]);
  });

  it("excludes bookings from previous months", async () => {
    const admin = await createUser("ADMIN");
    const user = await createUser("USER");

    const room = await prisma.room.create({
      data: { name: "Room A", nickname: "The Fridge", capacity: 4, amenities: [] },
    });

    await prisma.booking.create({
      data: {
        roomId: room.id,
        userId: user.user.id,
        startTime: new Date("2020-01-01T10:00:00.000Z"),
        endTime: new Date("2020-01-01T11:00:00.000Z"),
      },
    });

    const response = await request(app).get("/analytics/leaderboard").set("Authorization", `Bearer ${admin.token}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it("requires authentication to view the occupancy dashboard", async () => {
    const response = await request(app).get("/analytics/occupancy");
    expect(response.status).toBe(401);
  });

  it("forbids a regular user from viewing the occupancy dashboard", async () => {
    const user = await createUser("USER");

    const response = await request(app).get("/analytics/occupancy").set("Authorization", `Bearer ${user.token}`);

    expect(response.status).toBe(403);
  });

  it("breaks down booked minutes by day of week for an admin, regardless of month", async () => {
    const admin = await createUser("ADMIN");

    const room = await prisma.room.create({
      data: { name: "Room A", nickname: "The Fridge", capacity: 4, amenities: [] },
    });

    await prisma.booking.create({
      data: {
        roomId: room.id,
        userId: admin.user.id,
        // 2030-01-07 is a Monday.
        startTime: new Date("2030-01-07T10:00:00.000Z"),
        endTime: new Date("2030-01-07T11:00:00.000Z"),
      },
    });

    const response = await request(app).get("/analytics/occupancy").set("Authorization", `Bearer ${admin.token}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      expect.objectContaining({
        roomId: room.id,
        nickname: "The Fridge",
        minutesByDay: expect.objectContaining({ Mon: 60 }),
      }),
    ]);
  });
});
