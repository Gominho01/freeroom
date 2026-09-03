import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../config/prisma.js";
import { app } from "../index.js";
import { createUser, resetDatabase } from "./helpers.js";

// These integration tests hit a real Postgres via Prisma (DATABASE_URL).
// They require `docker compose up -d && npm run prisma:migrate` locally.

describe("Rooms", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await resetDatabase();
    await prisma.$disconnect();
  });

  it("requires authentication to list rooms", async () => {
    const response = await request(app).get("/rooms");
    expect(response.status).toBe(401);
  });

  it("allows an admin to create a room", async () => {
    const admin = await createUser("ADMIN");

    const response = await request(app)
      .post("/rooms")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ name: "Room A", nickname: "The Fridge", quirks: ["Broken AC"], capacity: 4, amenities: ["projector"] });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      name: "Room A",
      nickname: "The Fridge",
      quirks: ["Broken AC"],
      capacity: 4,
      amenities: ["projector"],
    });
  });

  it("forbids a regular user from creating a room", async () => {
    const user = await createUser("USER");

    const response = await request(app)
      .post("/rooms")
      .set("Authorization", `Bearer ${user.token}`)
      .send({ name: "Room B", nickname: "Room B", capacity: 2, amenities: [] });

    expect(response.status).toBe(403);
  });

  it("rejects an invalid room payload", async () => {
    const admin = await createUser("ADMIN");

    const response = await request(app)
      .post("/rooms")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ name: "", capacity: -1 });

    expect(response.status).toBe(400);
  });

  it("lets an authenticated user list and fetch rooms", async () => {
    const admin = await createUser("ADMIN");
    const created = await request(app)
      .post("/rooms")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ name: "Room C", nickname: "Room C", capacity: 6, amenities: ["tv"] });

    const user = await createUser("USER");

    const listResponse = await request(app).get("/rooms").set("Authorization", `Bearer ${user.token}`);
    expect(listResponse.status).toBe(200);
    expect(listResponse.body).toHaveLength(1);

    const getResponse = await request(app)
      .get(`/rooms/${created.body.id}`)
      .set("Authorization", `Bearer ${user.token}`);
    expect(getResponse.status).toBe(200);
    expect(getResponse.body.id).toBe(created.body.id);
  });

  it("returns 404 for a missing room", async () => {
    const user = await createUser("USER");

    const response = await request(app)
      .get("/rooms/does-not-exist")
      .set("Authorization", `Bearer ${user.token}`);

    expect(response.status).toBe(404);
  });

  it("allows an admin to update and delete a room, forbids a regular user", async () => {
    const admin = await createUser("ADMIN");
    const user = await createUser("USER");

    const created = await request(app)
      .post("/rooms")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ name: "Room D", nickname: "Room D", capacity: 3, amenities: [] });

    const forbiddenUpdate = await request(app)
      .put(`/rooms/${created.body.id}`)
      .set("Authorization", `Bearer ${user.token}`)
      .send({ capacity: 10 });
    expect(forbiddenUpdate.status).toBe(403);

    const update = await request(app)
      .put(`/rooms/${created.body.id}`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ capacity: 10 });
    expect(update.status).toBe(200);
    expect(update.body.capacity).toBe(10);

    const forbiddenDelete = await request(app)
      .delete(`/rooms/${created.body.id}`)
      .set("Authorization", `Bearer ${user.token}`);
    expect(forbiddenDelete.status).toBe(403);

    const del = await request(app)
      .delete(`/rooms/${created.body.id}`)
      .set("Authorization", `Bearer ${admin.token}`);
    expect(del.status).toBe(204);
  });
});
