import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../config/prisma.js";
import { app } from "../index.js";
import { createUser, resetDatabase } from "./helpers.js";

// These integration tests hit a real Postgres via Prisma (DATABASE_URL).
// They require `docker compose up -d && npm run prisma:migrate` locally.

async function createRoom(adminToken: string, overrides: Partial<{ name: string }> = {}) {
  const response = await request(app)
    .post("/rooms")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({
      name: overrides.name ?? "Room",
      nickname: overrides.name ?? "Room",
      capacity: 4,
      amenities: [],
    });
  return response.body;
}

describe("waitlist", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await resetDatabase();
    await prisma.$disconnect();
  });

  it("lets an authenticated user join the waitlist for a room/time range", async () => {
    const admin = await createUser("ADMIN");
    const user = await createUser("USER");
    const room = await createRoom(admin.token);

    const response = await request(app)
      .post("/bookings/waitlist")
      .set("Authorization", `Bearer ${user.token}`)
      .send({ roomId: room.id, startTime: "2030-01-01T10:00:00.000Z", endTime: "2030-01-01T11:00:00.000Z" });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ roomId: room.id, userId: user.user.id });
  });

  it("returns 404 when joining the waitlist for a room that does not exist", async () => {
    const user = await createUser("USER");

    const response = await request(app)
      .post("/bookings/waitlist")
      .set("Authorization", `Bearer ${user.token}`)
      .send({ roomId: "does-not-exist", startTime: "2030-01-01T10:00:00.000Z", endTime: "2030-01-01T11:00:00.000Z" });

    expect(response.status).toBe(404);
  });

  it("only lists the requester's own waitlist entries", async () => {
    const admin = await createUser("ADMIN");
    const userA = await createUser("USER");
    const userB = await createUser("USER");
    const room = await createRoom(admin.token);

    await request(app)
      .post("/bookings/waitlist")
      .set("Authorization", `Bearer ${userA.token}`)
      .send({ roomId: room.id, startTime: "2030-01-01T10:00:00.000Z", endTime: "2030-01-01T11:00:00.000Z" });
    await request(app)
      .post("/bookings/waitlist")
      .set("Authorization", `Bearer ${userB.token}`)
      .send({ roomId: room.id, startTime: "2030-01-02T10:00:00.000Z", endTime: "2030-01-02T11:00:00.000Z" });

    const response = await request(app).get("/bookings/waitlist").set("Authorization", `Bearer ${userA.token}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].userId).toBe(userA.user.id);
  });

  it("lets the entry's owner leave the waitlist, forbids a stranger", async () => {
    const admin = await createUser("ADMIN");
    const owner = await createUser("USER");
    const stranger = await createUser("USER");
    const room = await createRoom(admin.token);

    const joined = await request(app)
      .post("/bookings/waitlist")
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ roomId: room.id, startTime: "2030-01-01T10:00:00.000Z", endTime: "2030-01-01T11:00:00.000Z" });

    const forbidden = await request(app)
      .delete(`/bookings/waitlist/${joined.body.id}`)
      .set("Authorization", `Bearer ${stranger.token}`);
    expect(forbidden.status).toBe(403);

    const left = await request(app)
      .delete(`/bookings/waitlist/${joined.body.id}`)
      .set("Authorization", `Bearer ${owner.token}`);
    expect(left.status).toBe(204);

    const remaining = await request(app).get("/bookings/waitlist").set("Authorization", `Bearer ${owner.token}`);
    expect(remaining.body).toHaveLength(0);
  });

  it("returns 404 when leaving a waitlist entry that does not exist", async () => {
    const user = await createUser("USER");

    const response = await request(app)
      .delete("/bookings/waitlist/does-not-exist")
      .set("Authorization", `Bearer ${user.token}`);

    expect(response.status).toBe(404);
  });

  it("auto-books the freed slot for a waitlisted user, notifies them, and clears the entry", async () => {
    const admin = await createUser("ADMIN");
    const booker = await createUser("USER");
    const waiter = await createUser("USER");
    const room = await createRoom(admin.token);

    const booking = await request(app)
      .post("/bookings")
      .set("Authorization", `Bearer ${booker.token}`)
      .send({ roomId: room.id, startTime: "2030-01-01T10:00:00.000Z", endTime: "2030-01-01T11:00:00.000Z" });

    await request(app)
      .post("/bookings/waitlist")
      .set("Authorization", `Bearer ${waiter.token}`)
      // Overlaps the last half of the booked slot.
      .send({ roomId: room.id, startTime: "2030-01-01T10:30:00.000Z", endTime: "2030-01-01T11:30:00.000Z" });

    const cancel = await request(app)
      .delete(`/bookings/${booking.body.id}`)
      .set("Authorization", `Bearer ${booker.token}`);
    expect(cancel.status).toBe(204);

    const notifications = await request(app)
      .get("/notifications")
      .set("Authorization", `Bearer ${waiter.token}`);
    expect(notifications.body).toHaveLength(1);
    expect(notifications.body[0].type).toBe("WAITLIST_AVAILABLE");

    const remainingWaitlist = await request(app)
      .get("/bookings/waitlist")
      .set("Authorization", `Bearer ${waiter.token}`);
    expect(remainingWaitlist.body).toHaveLength(0);

    const waiterBookings = await request(app).get("/bookings").set("Authorization", `Bearer ${waiter.token}`);
    expect(waiterBookings.body).toHaveLength(1);
    expect(waiterBookings.body[0]).toMatchObject({
      roomId: room.id,
      startTime: "2030-01-01T10:30:00.000Z",
      endTime: "2030-01-01T11:30:00.000Z",
    });
  });

  it("does not auto-book a waitlisted user whose exact range is still covered by another booking", async () => {
    const admin = await createUser("ADMIN");
    const booker = await createUser("USER");
    const blocker = await createUser("USER");
    const waiter = await createUser("USER");
    const room = await createRoom(admin.token);

    const booking = await request(app)
      .post("/bookings")
      .set("Authorization", `Bearer ${booker.token}`)
      .send({ roomId: room.id, startTime: "2030-01-01T10:00:00.000Z", endTime: "2030-01-01T11:00:00.000Z" });

    // Still covers the first half of what the waiter wants, even after the
    // booking above is cancelled.
    await request(app)
      .post("/bookings")
      .set("Authorization", `Bearer ${blocker.token}`)
      .send({ roomId: room.id, startTime: "2030-01-01T11:00:00.000Z", endTime: "2030-01-01T12:00:00.000Z" });

    await request(app)
      .post("/bookings/waitlist")
      .set("Authorization", `Bearer ${waiter.token}`)
      .send({ roomId: room.id, startTime: "2030-01-01T10:30:00.000Z", endTime: "2030-01-01T11:30:00.000Z" });

    await request(app).delete(`/bookings/${booking.body.id}`).set("Authorization", `Bearer ${booker.token}`);

    const notifications = await request(app)
      .get("/notifications")
      .set("Authorization", `Bearer ${waiter.token}`);
    expect(notifications.body).toHaveLength(0);

    const remainingWaitlist = await request(app)
      .get("/bookings/waitlist")
      .set("Authorization", `Bearer ${waiter.token}`);
    expect(remainingWaitlist.body).toHaveLength(1);

    const waiterBookings = await request(app).get("/bookings").set("Authorization", `Bearer ${waiter.token}`);
    expect(waiterBookings.body).toHaveLength(0);
  });

  it("only auto-books the longest-waiting candidate when two waitlisters overlap the same freed slot", async () => {
    const admin = await createUser("ADMIN");
    const booker = await createUser("USER");
    const firstWaiter = await createUser("USER");
    const secondWaiter = await createUser("USER");
    const room = await createRoom(admin.token);

    const booking = await request(app)
      .post("/bookings")
      .set("Authorization", `Bearer ${booker.token}`)
      .send({ roomId: room.id, startTime: "2030-01-01T10:00:00.000Z", endTime: "2030-01-01T11:00:00.000Z" });

    await request(app)
      .post("/bookings/waitlist")
      .set("Authorization", `Bearer ${firstWaiter.token}`)
      .send({ roomId: room.id, startTime: "2030-01-01T10:00:00.000Z", endTime: "2030-01-01T11:00:00.000Z" });
    await request(app)
      .post("/bookings/waitlist")
      .set("Authorization", `Bearer ${secondWaiter.token}`)
      .send({ roomId: room.id, startTime: "2030-01-01T10:00:00.000Z", endTime: "2030-01-01T11:00:00.000Z" });

    await request(app).delete(`/bookings/${booking.body.id}`).set("Authorization", `Bearer ${booker.token}`);

    const firstBookings = await request(app).get("/bookings").set("Authorization", `Bearer ${firstWaiter.token}`);
    expect(firstBookings.body).toHaveLength(1);

    const secondBookings = await request(app).get("/bookings").set("Authorization", `Bearer ${secondWaiter.token}`);
    expect(secondBookings.body).toHaveLength(0);

    const secondWaitlist = await request(app)
      .get("/bookings/waitlist")
      .set("Authorization", `Bearer ${secondWaiter.token}`);
    expect(secondWaitlist.body).toHaveLength(1);
  });

  it("does not notify a waitlisted user whose time range does not overlap the freed slot", async () => {
    const admin = await createUser("ADMIN");
    const booker = await createUser("USER");
    const waiter = await createUser("USER");
    const room = await createRoom(admin.token);

    const booking = await request(app)
      .post("/bookings")
      .set("Authorization", `Bearer ${booker.token}`)
      .send({ roomId: room.id, startTime: "2030-01-01T10:00:00.000Z", endTime: "2030-01-01T11:00:00.000Z" });

    await request(app)
      .post("/bookings/waitlist")
      .set("Authorization", `Bearer ${waiter.token}`)
      // A different, non-overlapping day.
      .send({ roomId: room.id, startTime: "2030-01-02T10:00:00.000Z", endTime: "2030-01-02T11:00:00.000Z" });

    await request(app).delete(`/bookings/${booking.body.id}`).set("Authorization", `Bearer ${booker.token}`);

    const notifications = await request(app)
      .get("/notifications")
      .set("Authorization", `Bearer ${waiter.token}`);
    expect(notifications.body).toHaveLength(0);

    const remainingWaitlist = await request(app)
      .get("/bookings/waitlist")
      .set("Authorization", `Bearer ${waiter.token}`);
    expect(remainingWaitlist.body).toHaveLength(1);
  });

  it("auto-books waitlisted users for every occurrence freed when a recurring series is cancelled", async () => {
    const admin = await createUser("ADMIN");
    const booker = await createUser("USER");
    const waiter = await createUser("USER");
    const room = await createRoom(admin.token);

    await request(app)
      .post("/bookings")
      .set("Authorization", `Bearer ${booker.token}`)
      .send({
        roomId: room.id,
        startTime: "2030-01-07T10:00:00.000Z",
        endTime: "2030-01-07T11:00:00.000Z",
        recurrence: { occurrences: 2 },
      });

    // Waitlisted for the second occurrence only (Jan 14).
    await request(app)
      .post("/bookings/waitlist")
      .set("Authorization", `Bearer ${waiter.token}`)
      .send({ roomId: room.id, startTime: "2030-01-14T10:00:00.000Z", endTime: "2030-01-14T11:00:00.000Z" });

    const allBookings = await request(app).get("/bookings").set("Authorization", `Bearer ${booker.token}`);
    const recurrenceId = allBookings.body[0].recurrenceId;

    const cancel = await request(app)
      .delete(`/bookings/series/${recurrenceId}`)
      .set("Authorization", `Bearer ${booker.token}`);
    expect(cancel.status).toBe(204);

    const notifications = await request(app)
      .get("/notifications")
      .set("Authorization", `Bearer ${waiter.token}`);
    expect(notifications.body).toHaveLength(1);
    expect(notifications.body[0].type).toBe("WAITLIST_AVAILABLE");

    const waiterBookings = await request(app).get("/bookings").set("Authorization", `Bearer ${waiter.token}`);
    expect(waiterBookings.body).toHaveLength(1);
    expect(waiterBookings.body[0]).toMatchObject({
      roomId: room.id,
      startTime: "2030-01-14T10:00:00.000Z",
      endTime: "2030-01-14T11:00:00.000Z",
    });
  });
});
