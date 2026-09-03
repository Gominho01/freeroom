import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../config/prisma.js";
import { app } from "../index.js";
import { createUser, resetDatabase } from "./helpers.js";

// These integration tests hit a real Postgres via Prisma (DATABASE_URL).
// They require `docker compose up -d && npm run prisma:migrate` locally.

async function createRoom(adminToken: string, overrides: Partial<{ name: string; capacity: number }> = {}) {
  const response = await request(app)
    .post("/rooms")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({
      name: overrides.name ?? "Room",
      nickname: overrides.name ?? "Room",
      capacity: overrides.capacity ?? 4,
      amenities: [],
    });
  return response.body;
}

describe("Bookings", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await resetDatabase();
    await prisma.$disconnect();
  });

  it("creates a booking for the authenticated user", async () => {
    const admin = await createUser("ADMIN");
    const user = await createUser("USER");
    const room = await createRoom(admin.token);

    const response = await request(app)
      .post("/bookings")
      .set("Authorization", `Bearer ${user.token}`)
      .send({
        roomId: room.id,
        startTime: "2026-09-01T10:00:00.000Z",
        endTime: "2026-09-01T11:00:00.000Z",
      });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ roomId: room.id, userId: user.user.id });
  });

  it("rejects a booking where endTime is not after startTime", async () => {
    const admin = await createUser("ADMIN");
    const user = await createUser("USER");
    const room = await createRoom(admin.token);

    const response = await request(app)
      .post("/bookings")
      .set("Authorization", `Bearer ${user.token}`)
      .send({
        roomId: room.id,
        startTime: "2026-09-01T11:00:00.000Z",
        endTime: "2026-09-01T10:00:00.000Z",
      });

    expect(response.status).toBe(400);
  });

  it("rejects an overlapping booking for the same room with 409", async () => {
    const admin = await createUser("ADMIN");
    const user = await createUser("USER");
    const room = await createRoom(admin.token);

    await request(app)
      .post("/bookings")
      .set("Authorization", `Bearer ${user.token}`)
      .send({
        roomId: room.id,
        startTime: "2026-09-01T10:00:00.000Z",
        endTime: "2026-09-01T11:00:00.000Z",
      });

    const conflicting = await request(app)
      .post("/bookings")
      .set("Authorization", `Bearer ${user.token}`)
      .send({
        roomId: room.id,
        startTime: "2026-09-01T10:30:00.000Z",
        endTime: "2026-09-01T11:30:00.000Z",
      });

    expect(conflicting.status).toBe(409);
    expect(conflicting.body.error).toBeDefined();
  });

  it("allows non-overlapping (back-to-back) bookings on the same room", async () => {
    const admin = await createUser("ADMIN");
    const user = await createUser("USER");
    const room = await createRoom(admin.token);

    const first = await request(app)
      .post("/bookings")
      .set("Authorization", `Bearer ${user.token}`)
      .send({
        roomId: room.id,
        startTime: "2026-09-01T10:00:00.000Z",
        endTime: "2026-09-01T11:00:00.000Z",
      });
    expect(first.status).toBe(201);

    const second = await request(app)
      .post("/bookings")
      .set("Authorization", `Bearer ${user.token}`)
      .send({
        roomId: room.id,
        startTime: "2026-09-01T11:00:00.000Z",
        endTime: "2026-09-01T12:00:00.000Z",
      });
    expect(second.status).toBe(201);
  });

  it("returns 404 when booking a room that does not exist", async () => {
    const user = await createUser("USER");

    const response = await request(app)
      .post("/bookings")
      .set("Authorization", `Bearer ${user.token}`)
      .send({
        roomId: "does-not-exist",
        startTime: "2026-09-01T10:00:00.000Z",
        endTime: "2026-09-01T11:00:00.000Z",
      });

    expect(response.status).toBe(404);
  });

  it("only lets non-admin users see their own bookings, even when filtering by another userId", async () => {
    const admin = await createUser("ADMIN");
    const userA = await createUser("USER");
    const userB = await createUser("USER");
    const room = await createRoom(admin.token);

    await request(app)
      .post("/bookings")
      .set("Authorization", `Bearer ${userA.token}`)
      .send({
        roomId: room.id,
        startTime: "2026-09-01T10:00:00.000Z",
        endTime: "2026-09-01T11:00:00.000Z",
      });

    await request(app)
      .post("/bookings")
      .set("Authorization", `Bearer ${userB.token}`)
      .send({
        roomId: room.id,
        startTime: "2026-09-01T12:00:00.000Z",
        endTime: "2026-09-01T13:00:00.000Z",
      });

    const asUserATryingToSeeUserB = await request(app)
      .get(`/bookings?userId=${userB.user.id}`)
      .set("Authorization", `Bearer ${userA.token}`);
    expect(asUserATryingToSeeUserB.status).toBe(200);
    expect(asUserATryingToSeeUserB.body).toHaveLength(1);
    expect(asUserATryingToSeeUserB.body[0].userId).toBe(userA.user.id);

    const asAdminFilteringByUserB = await request(app)
      .get(`/bookings?userId=${userB.user.id}`)
      .set("Authorization", `Bearer ${admin.token}`);
    expect(asAdminFilteringByUserB.status).toBe(200);
    expect(asAdminFilteringByUserB.body).toHaveLength(1);
    expect(asAdminFilteringByUserB.body[0].userId).toBe(userB.user.id);

    const asAdminSeeingAll = await request(app).get("/bookings").set("Authorization", `Bearer ${admin.token}`);
    expect(asAdminSeeingAll.status).toBe(200);
    expect(asAdminSeeingAll.body).toHaveLength(2);
  });

  it("filters bookings by roomId", async () => {
    const admin = await createUser("ADMIN");
    const user = await createUser("USER");
    const roomOne = await createRoom(admin.token, { name: "Room One" });
    const roomTwo = await createRoom(admin.token, { name: "Room Two" });

    await request(app)
      .post("/bookings")
      .set("Authorization", `Bearer ${user.token}`)
      .send({
        roomId: roomOne.id,
        startTime: "2026-09-01T10:00:00.000Z",
        endTime: "2026-09-01T11:00:00.000Z",
      });

    await request(app)
      .post("/bookings")
      .set("Authorization", `Bearer ${user.token}`)
      .send({
        roomId: roomTwo.id,
        startTime: "2026-09-01T10:00:00.000Z",
        endTime: "2026-09-01T11:00:00.000Z",
      });

    const response = await request(app)
      .get(`/bookings?roomId=${roomOne.id}`)
      .set("Authorization", `Bearer ${user.token}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].roomId).toBe(roomOne.id);
  });

  it("lets the owner cancel their booking, forbids a stranger, allows an admin", async () => {
    const admin = await createUser("ADMIN");
    const owner = await createUser("USER");
    const stranger = await createUser("USER");
    const room = await createRoom(admin.token);

    const booking = await request(app)
      .post("/bookings")
      .set("Authorization", `Bearer ${owner.token}`)
      .send({
        roomId: room.id,
        startTime: "2026-09-01T10:00:00.000Z",
        endTime: "2026-09-01T11:00:00.000Z",
      });

    const forbidden = await request(app)
      .delete(`/bookings/${booking.body.id}`)
      .set("Authorization", `Bearer ${stranger.token}`);
    expect(forbidden.status).toBe(403);

    const ownerCancel = await request(app)
      .delete(`/bookings/${booking.body.id}`)
      .set("Authorization", `Bearer ${owner.token}`);
    expect(ownerCancel.status).toBe(204);

    const secondBooking = await request(app)
      .post("/bookings")
      .set("Authorization", `Bearer ${owner.token}`)
      .send({
        roomId: room.id,
        startTime: "2026-09-01T10:00:00.000Z",
        endTime: "2026-09-01T11:00:00.000Z",
      });

    const adminCancel = await request(app)
      .delete(`/bookings/${secondBooking.body.id}`)
      .set("Authorization", `Bearer ${admin.token}`);
    expect(adminCancel.status).toBe(204);
  });

  it("returns 404 when cancelling a booking that does not exist", async () => {
    const user = await createUser("USER");

    const response = await request(app)
      .delete("/bookings/does-not-exist")
      .set("Authorization", `Bearer ${user.token}`);

    expect(response.status).toBe(404);
  });
});
