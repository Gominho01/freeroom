import type { Server, Socket } from "socket.io";
import { prisma } from "../config/prisma.js";
import { verifyToken } from "../lib/jwt.js";
import { getCurrentOccupant } from "../services/occupancy.service.js";

const POLL_INTERVAL_MS = 10_000;
const ROOM_PREFIX = "room:";
const WORLD_CHANNEL = "world";
const WORLD_SPAWN = { x: 420, y: 300 };

function roomChannel(roomId: string): string {
  return `${ROOM_PREFIX}${roomId}`;
}

export interface WorldPlayer {
  id: string;
  name: string;
  avatarSeed: string;
  x: number;
  y: number;
}

/**
 * One polling tick: recomputes the current occupant for every room that has
 * at least one watcher, and only broadcasts to that room's channel when the
 * occupant actually changed since the last tick. Stateless and restart-safe
 * — a per-booking setTimeout would be more precise, but would need
 * re-scheduling on every create/cancel and on server restart.
 */
export async function pollRoomOccupancy(io: Server, lastKnown: Map<string, string | null>): Promise<void> {
  const watchedChannels = [...io.sockets.adapter.rooms.keys()].filter((name) => name.startsWith(ROOM_PREFIX));

  for (const channel of watchedChannels) {
    const roomId = channel.slice(ROOM_PREFIX.length);
    const occupant = await getCurrentOccupant(roomId);
    const occupantKey = occupant?.bookingId ?? null;

    if (lastKnown.get(roomId) !== occupantKey) {
      lastKnown.set(roomId, occupantKey);
      io.to(channel).emit("room:occupant", { roomId, occupant });
    }
  }
}

export function registerSocketHandlers(io: Server): void {
  const lastKnown = new Map<string, string | null>();
  const worldPlayers = new Map<string, WorldPlayer>();

  // Reject the handshake outright if the JWT is missing/invalid — occupancy
  // data is only exposed to authenticated users, same as the REST API.
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) {
      next(new Error("unauthorized"));
      return;
    }
    try {
      socket.data.userId = verifyToken(token).id;
      next();
    } catch {
      next(new Error("unauthorized"));
    }
  });

  io.on("connection", (socket: Socket) => {
    // World map — a lightweight, in-memory-only presence channel: avatar
    // positions aren't booking data, so nothing here touches Postgres beyond
    // reading the joiner's own profile once.
    socket.on("world:join", async () => {
      const user = await prisma.user.findUnique({
        where: { id: socket.data.userId as string },
        select: { id: true, name: true, avatarSeed: true },
      });
      if (!user) return;

      const player: WorldPlayer = { ...user, ...WORLD_SPAWN };
      worldPlayers.set(socket.id, player);
      socket.join(WORLD_CHANNEL);

      socket.emit("world:players", [...worldPlayers.values()]);
      socket.to(WORLD_CHANNEL).emit("world:player-joined", player);
    });

    socket.on("world:move", (rawPosition: unknown) => {
      const player = worldPlayers.get(socket.id);
      if (!player) return;

      const position = rawPosition as { x?: unknown; y?: unknown } | null;
      if (typeof position?.x !== "number" || typeof position?.y !== "number") return;

      player.x = position.x;
      player.y = position.y;
      socket.to(WORLD_CHANNEL).emit("world:player-moved", { id: player.id, x: player.x, y: player.y });
    });

    socket.on("disconnect", () => {
      const player = worldPlayers.get(socket.id);
      if (!player) return;

      worldPlayers.delete(socket.id);
      socket.to(WORLD_CHANNEL).emit("world:player-left", { id: player.id });
    });

    socket.on("room:watch", async (rawRoomId: unknown) => {
      if (typeof rawRoomId !== "string" || !rawRoomId) {
        socket.emit("error", { message: "Invalid roomId" });
        return;
      }

      socket.join(roomChannel(rawRoomId));

      // The joiner gets the current state right away, instead of waiting up
      // to POLL_INTERVAL_MS for the next tick.
      const occupant = await getCurrentOccupant(rawRoomId);
      lastKnown.set(rawRoomId, occupant?.bookingId ?? null);
      socket.emit("room:occupant", { roomId: rawRoomId, occupant });
    });

    socket.on("room:unwatch", (rawRoomId: unknown) => {
      if (typeof rawRoomId === "string") {
        socket.leave(roomChannel(rawRoomId));
      }
    });
  });

  setInterval(() => {
    pollRoomOccupancy(io, lastKnown).catch((err) => console.error("pollRoomOccupancy failed", err));
  }, POLL_INTERVAL_MS);
}
