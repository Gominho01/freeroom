import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../config/prisma.js";
import { app } from "../index.js";
import { sendDueReminders } from "../services/booking.service.js";
import { createUser, resetDatabase } from "./helpers.js";

// These integration tests hit a real Postgres via Prisma (DATABASE_URL).
// They require `docker compose up -d && npm run prisma:migrate` locally.
// The dev mailer never touches the network (jsonTransport), so no SMTP
// setup is needed to run these.

async function createRoom(adminToken: string) {
  const response = await request(app)
    .post("/rooms")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ name: "Room", nickname: "The Fridge", capacity: 4, amenities: [] });
  return response.body;
}

describe("notifications", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await resetDatabase();
    await prisma.$disconnect();
  });

  it("notifies the booker when a booking is created", async () => {
    const admin = await createUser("ADMIN");
    const user = await createUser("USER");
    const room = await createRoom(admin.token);

    await request(app)
      .post("/bookings")
      .set("Authorization", `Bearer ${user.token}`)
      .send({ roomId: room.id, startTime: "2030-01-01T10:00:00.000Z", endTime: "2030-01-01T11:00:00.000Z" });

    const response = await request(app).get("/notifications").set("Authorization", `Bearer ${user.token}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toMatchObject({ type: "BOOKING_CONFIRMED", read: false });
    expect(response.body[0].message).toContain("The Fridge");
  });

  it("sends a single notification for a whole recurring series, not one per occurrence", async () => {
    const admin = await createUser("ADMIN");
    const user = await createUser("USER");
    const room = await createRoom(admin.token);

    await request(app)
      .post("/bookings")
      .set("Authorization", `Bearer ${user.token}`)
      .send({
        roomId: room.id,
        startTime: "2030-01-07T10:00:00.000Z",
        endTime: "2030-01-07T11:00:00.000Z",
        recurrence: { occurrences: 4 },
      });

    const response = await request(app).get("/notifications").set("Authorization", `Bearer ${user.token}`);

    expect(response.body).toHaveLength(1);
    expect(response.body[0].message).toContain("weekly");
  });

  it("does not notify another user about someone else's booking", async () => {
    const admin = await createUser("ADMIN");
    const user = await createUser("USER");
    const otherUser = await createUser("USER");
    const room = await createRoom(admin.token);

    await request(app)
      .post("/bookings")
      .set("Authorization", `Bearer ${user.token}`)
      .send({ roomId: room.id, startTime: "2030-01-01T10:00:00.000Z", endTime: "2030-01-01T11:00:00.000Z" });

    const response = await request(app).get("/notifications").set("Authorization", `Bearer ${otherUser.token}`);

    expect(response.body).toHaveLength(0);
  });

  it("marks every unread notification as read", async () => {
    const admin = await createUser("ADMIN");
    const user = await createUser("USER");
    const room = await createRoom(admin.token);

    await request(app)
      .post("/bookings")
      .set("Authorization", `Bearer ${user.token}`)
      .send({ roomId: room.id, startTime: "2030-01-01T10:00:00.000Z", endTime: "2030-01-01T11:00:00.000Z" });

    const markRead = await request(app).post("/notifications/read").set("Authorization", `Bearer ${user.token}`);
    expect(markRead.status).toBe(204);

    const response = await request(app).get("/notifications").set("Authorization", `Bearer ${user.token}`);
    expect(response.body.every((n: { read: boolean }) => n.read)).toBe(true);
  });

  describe("booking reminders", () => {
    it("notifies the booker once their booking is starting soon, and only once", async () => {
      const admin = await createUser("ADMIN");
      const user = await createUser("USER");
      const room = await createRoom(admin.token);

      const booking = await prisma.booking.create({
        data: {
          roomId: room.id,
          userId: user.user.id,
          startTime: new Date(Date.now() + 5 * 60 * 1000),
          endTime: new Date(Date.now() + 65 * 60 * 1000),
        },
      });

      await sendDueReminders();
      await sendDueReminders(); // a second tick must not double-send

      const response = await request(app).get("/notifications").set("Authorization", `Bearer ${user.token}`);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].type).toBe("BOOKING_REMINDER");

      const updated = await prisma.booking.findUnique({ where: { id: booking.id } });
      expect(updated?.reminderSentAt).not.toBeNull();
    });

    it("ignores bookings that start further out than the reminder window", async () => {
      const admin = await createUser("ADMIN");
      const user = await createUser("USER");
      const room = await createRoom(admin.token);

      await prisma.booking.create({
        data: {
          roomId: room.id,
          userId: user.user.id,
          startTime: new Date(Date.now() + 60 * 60 * 1000),
          endTime: new Date(Date.now() + 90 * 60 * 1000),
        },
      });

      await sendDueReminders();

      const response = await request(app).get("/notifications").set("Authorization", `Bearer ${user.token}`);
      expect(response.body).toHaveLength(0);
    });
  });
});
