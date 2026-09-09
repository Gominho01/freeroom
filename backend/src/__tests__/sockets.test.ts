import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import jwt from "jsonwebtoken";
import { Server } from "socket.io";
import { io as ioClient, type Socket as ClientSocket } from "socket.io-client";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { env } from "../config/env.js";

// Exercises the socket layer over a real, in-process Socket.io server/client
// pair on a local port, with Prisma mocked (no live DB needed here — the
// real query logic in occupancy.service.ts is covered by
// occupancy.service.test.ts against the actual test database).
vi.mock("../config/prisma.js", () => ({
  prisma: {
    booking: { findFirst: vi.fn() },
  },
}));

const { prisma } = await import("../config/prisma.js");
const { registerSocketHandlers, pollRoomOccupancy } = await import("../sockets/index.js");

let httpServer: ReturnType<typeof createServer>;
let io: Server;
let port: number;

function makeToken(id: string) {
  return jwt.sign({ id, role: "USER" }, env.jwtSecret);
}

function connectClient(token?: string): Promise<ClientSocket> {
  return new Promise((resolve, reject) => {
    const socket = ioClient(`http://localhost:${port}`, {
      auth: token ? { token } : {},
      transports: ["websocket"],
      reconnection: false,
    });
    socket.on("connect", () => resolve(socket));
    socket.on("connect_error", (err: Error) => reject(err));
  });
}

function waitFor<T = unknown>(socket: ClientSocket, event: string): Promise<T> {
  return new Promise((resolve) => socket.once(event, resolve));
}

function mockBooking(overrides: { id: string; userId: string; endTime: Date }) {
  return {
    id: overrides.id,
    roomId: "room-1",
    userId: overrides.userId,
    startTime: new Date(0),
    endTime: overrides.endTime,
    createdAt: new Date(0),
    user: { id: overrides.userId, name: "Ada", avatarSeed: "ada-seed" },
  };
}

beforeAll(async () => {
  httpServer = createServer();
  io = new Server(httpServer);
  registerSocketHandlers(io);
  await new Promise<void>((resolve) => httpServer.listen(0, resolve));
  port = (httpServer.address() as AddressInfo).port;
});

afterAll(() => {
  io.close();
  httpServer.close();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("socket authentication", () => {
  it("rejects connections without a valid JWT", async () => {
    await expect(connectClient()).rejects.toBeTruthy();
  });

  it("accepts connections with a valid JWT", async () => {
    const socket = await connectClient(makeToken("u1"));
    expect(socket.connected).toBe(true);
    socket.close();
  });
});

describe("room:watch", () => {
  it("emits the current occupant right away when joining", async () => {
    vi.mocked(prisma.booking.findFirst).mockResolvedValue(
      mockBooking({ id: "b1", userId: "u1", endTime: new Date("2099-01-01T00:00:00.000Z") }),
    );

    const socket = await connectClient(makeToken("u2"));
    const occupantEvent = waitFor<{ roomId: string; occupant: { bookingId: string } | null }>(
      socket,
      "room:occupant",
    );
    socket.emit("room:watch", "room-1");

    await expect(occupantEvent).resolves.toMatchObject({
      roomId: "room-1",
      occupant: { bookingId: "b1", user: { name: "Ada" } },
    });

    socket.close();
  });

  it("emits a null occupant when the room is free", async () => {
    vi.mocked(prisma.booking.findFirst).mockResolvedValue(null);

    const socket = await connectClient(makeToken("u3"));
    const occupantEvent = waitFor<{ roomId: string; occupant: null }>(socket, "room:occupant");
    socket.emit("room:watch", "room-2");

    await expect(occupantEvent).resolves.toEqual({ roomId: "room-2", occupant: null });

    socket.close();
  });

  it("rejects an invalid roomId", async () => {
    const socket = await connectClient(makeToken("u4"));
    const errorEvent = waitFor<{ message: string }>(socket, "error");
    socket.emit("room:watch", 42);

    await expect(errorEvent).resolves.toEqual({ message: "Invalid roomId" });

    socket.close();
  });
});

describe("pollRoomOccupancy", () => {
  it("broadcasts to watchers only when the occupant changed since the last tick", async () => {
    vi.mocked(prisma.booking.findFirst).mockResolvedValue(
      mockBooking({ id: "b1", userId: "u1", endTime: new Date("2099-01-01T00:00:00.000Z") }),
    );

    const socket = await connectClient(makeToken("u5"));
    const firstOccupant = waitFor(socket, "room:occupant");
    socket.emit("room:watch", "room-3");
    await firstOccupant;

    const lastKnown = new Map<string, string | null>([["room-3", "b1"]]);

    // Same occupant as already known — no broadcast expected.
    let broadcast = false;
    socket.once("room:occupant", () => {
      broadcast = true;
    });
    await pollRoomOccupancy(io, lastKnown);
    expect(broadcast).toBe(false);

    // Occupant changes — this tick should broadcast the update.
    vi.mocked(prisma.booking.findFirst).mockResolvedValue(
      mockBooking({ id: "b2", userId: "u6", endTime: new Date("2099-01-01T01:00:00.000Z") }),
    );
    const changedEvent = waitFor<{ occupant: { bookingId: string } }>(socket, "room:occupant");
    await pollRoomOccupancy(io, lastKnown);

    await expect(changedEvent).resolves.toMatchObject({ occupant: { bookingId: "b2" } });

    socket.close();
  });
});
