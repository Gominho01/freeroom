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
    user: { findUnique: vi.fn() },
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
    recurrenceId: null,
    reminderSentAt: null,
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

describe("world map", () => {
  const USERS: Record<string, { id: string; name: string; avatarSeed: string }> = {
    watcher: { id: "watcher", name: "Watcher", avatarSeed: "watcher-seed" },
    u1: { id: "u1", name: "Ada", avatarSeed: "ada-seed" },
    u2: { id: "u2", name: "Bob", avatarSeed: "bob-seed" },
    u3: { id: "u3", name: "Cy", avatarSeed: "cy-seed" },
    u4: { id: "u4", name: "Dee", avatarSeed: "dee-seed" },
  };

  beforeAll(() => {
    // Shared across every test in this file's lifetime, so look the user up
    // by the id the socket authenticated with instead of a single fixed
    // return value — both the watcher and the subject under test join the
    // same world channel and each needs their own identity.
    vi.mocked(prisma.user.findUnique).mockImplementation(
      (async (args: { where: { id: string } }) => USERS[args.where.id] ?? null) as unknown as typeof prisma.user.findUnique,
    );
  });

  async function connectWatcher(token: string) {
    const watcher = await connectClient(makeToken(token));
    watcher.emit("world:join");
    await waitFor(watcher, "world:players");
    return watcher;
  }

  it("sends the joiner a players snapshot and tells everyone else they joined", async () => {
    const watcher = await connectWatcher("watcher");
    const joiner = await connectClient(makeToken("u1"));

    const joinedEvent = waitFor<{ id: string; name: string }>(watcher, "world:player-joined");
    const snapshotEvent = waitFor<Array<{ id: string }>>(joiner, "world:players");

    joiner.emit("world:join");

    await expect(snapshotEvent).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "u1", name: "Ada", avatarSeed: "ada-seed" })]),
    );
    await expect(joinedEvent).resolves.toMatchObject({ id: "u1", name: "Ada" });

    watcher.close();
    joiner.close();
  });

  it("broadcasts a moved player's new position to everyone else, not back to themselves", async () => {
    const watcher = await connectWatcher("watcher");
    const mover = await connectClient(makeToken("u2"));

    const joined = waitFor(watcher, "world:player-joined");
    mover.emit("world:join");
    await joined;

    let echoedToSelf = false;
    mover.once("world:player-moved", () => {
      echoedToSelf = true;
    });
    const movedEvent = waitFor<{ id: string; x: number; y: number }>(watcher, "world:player-moved");

    mover.emit("world:move", { x: 120, y: 80 });

    await expect(movedEvent).resolves.toEqual({ id: "u2", x: 120, y: 80 });
    expect(echoedToSelf).toBe(false);

    watcher.close();
    mover.close();
  });

  it("ignores a malformed move payload instead of broadcasting garbage", async () => {
    const watcher = await connectWatcher("watcher");
    const mover = await connectClient(makeToken("u3"));

    const joined = waitFor(watcher, "world:player-joined");
    mover.emit("world:join");
    await joined;

    let broadcast = false;
    watcher.once("world:player-moved", () => {
      broadcast = true;
    });
    mover.emit("world:move", { x: "not-a-number" });
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(broadcast).toBe(false);

    watcher.close();
    mover.close();
  });

  it("tells everyone else a player left when they disconnect", async () => {
    const watcher = await connectWatcher("watcher");
    const leaver = await connectClient(makeToken("u4"));

    const joined = waitFor(watcher, "world:player-joined");
    leaver.emit("world:join");
    await joined;

    const leftEvent = waitFor<{ id: string }>(watcher, "world:player-left");
    leaver.close();

    await expect(leftEvent).resolves.toEqual({ id: "u4" });

    watcher.close();
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
