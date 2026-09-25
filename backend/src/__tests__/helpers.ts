import type { Role } from "@prisma/client";
import request from "supertest";
import { prisma } from "../config/prisma.js";
import { app } from "../index.js";

let counter = 0;

/**
 * Registers a fresh user through the public API and, for ADMIN, promotes it
 * directly in the database (there is no promote-to-admin endpoint in phase
 * 1) then re-logs in so the returned token carries the ADMIN role.
 */
export async function createUser(role: Role = "USER") {
  counter += 1;
  const email = `user${counter}-${Date.now()}@example.com`;
  const password = "password123";
  const name = `Test User ${counter}`;

  const registerResponse = await request(app).post("/auth/register").send({ email, password, name });

  let token = registerResponse.body.token as string;
  let user = registerResponse.body.user;

  if (role === "ADMIN") {
    await prisma.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
    const loginResponse = await request(app).post("/auth/login").send({ email, password });
    token = loginResponse.body.token;
    user = loginResponse.body.user;
  }

  return { token, user, email, password };
}

export async function resetDatabase(): Promise<void> {
  await prisma.notification.deleteMany();
  await prisma.waitlistEntry.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.room.deleteMany();
  await prisma.user.deleteMany();
}
