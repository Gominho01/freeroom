import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../config/prisma.js";
import { app } from "../index.js";
import { createUser, resetDatabase } from "./helpers.js";

describe("authenticate middleware", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await resetDatabase();
    await prisma.$disconnect();
  });

  it("rejects a token whose user has since been deleted from the database", async () => {
    const user = await createUser("USER");
    await prisma.user.delete({ where: { id: user.user.id } });

    const response = await request(app).get("/rooms").set("Authorization", `Bearer ${user.token}`);

    expect(response.status).toBe(401);
    expect(response.body.error.message).toMatch(/log in again/i);
  });

  it("picks up a role change made directly in the database without a fresh login", async () => {
    const user = await createUser("USER");

    const beforePromotion = await request(app)
      .post("/rooms")
      .set("Authorization", `Bearer ${user.token}`)
      .send({ name: "Room", nickname: "Room", capacity: 2, amenities: [] });
    expect(beforePromotion.status).toBe(403);

    await prisma.user.update({ where: { id: user.user.id }, data: { role: "ADMIN" } });

    const afterPromotion = await request(app)
      .post("/rooms")
      .set("Authorization", `Bearer ${user.token}`)
      .send({ name: "Room", nickname: "Room", capacity: 2, amenities: [] });
    expect(afterPromotion.status).toBe(201);
  });
});
