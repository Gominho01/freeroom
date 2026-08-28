import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../config/prisma.js";
import { app } from "../index.js";
import { resetDatabase } from "./helpers.js";

// These integration tests hit a real Postgres via Prisma (DATABASE_URL).
// They require `docker compose up -d && npm run prisma:migrate` locally.

describe("Auth", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await resetDatabase();
    await prisma.$disconnect();
  });

  it("registers a new user and returns a token", async () => {
    const response = await request(app).post("/auth/register").send({
      email: "alice@example.com",
      password: "password123",
      name: "Alice",
    });

    expect(response.status).toBe(201);
    expect(response.body.token).toBeTypeOf("string");
    expect(response.body.user).toMatchObject({
      email: "alice@example.com",
      name: "Alice",
      role: "USER",
    });
    expect(response.body.user.password).toBeUndefined();
  });

  it("rejects registration with a duplicate email", async () => {
    await request(app).post("/auth/register").send({
      email: "bob@example.com",
      password: "password123",
      name: "Bob",
    });

    const response = await request(app).post("/auth/register").send({
      email: "bob@example.com",
      password: "password123",
      name: "Bob Again",
    });

    expect(response.status).toBe(409);
  });

  it("rejects registration with an invalid payload", async () => {
    const response = await request(app).post("/auth/register").send({
      email: "not-an-email",
      password: "short",
      name: "",
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toBeDefined();
  });

  it("logs in with valid credentials", async () => {
    await request(app).post("/auth/register").send({
      email: "carol@example.com",
      password: "password123",
      name: "Carol",
    });

    const response = await request(app).post("/auth/login").send({
      email: "carol@example.com",
      password: "password123",
    });

    expect(response.status).toBe(200);
    expect(response.body.token).toBeTypeOf("string");
    expect(response.body.user.email).toBe("carol@example.com");
  });

  it("rejects login with invalid credentials", async () => {
    await request(app).post("/auth/register").send({
      email: "dave@example.com",
      password: "password123",
      name: "Dave",
    });

    const response = await request(app).post("/auth/login").send({
      email: "dave@example.com",
      password: "wrong-password",
    });

    expect(response.status).toBe(401);
  });
});
