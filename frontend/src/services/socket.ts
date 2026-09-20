import { io, type Socket } from 'socket.io-client';
import type { Occupant, WorldPlayer } from '../types';

const SOCKET_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3333';

export interface OccupantPayload {
  roomId: string;
  occupant: Occupant | null;
}

let socket: Socket | null = null;

function getSocket(token: string): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, { auth: { token }, transports: ['websocket'] });
  }
  return socket;
}

/** Watches a room's live occupant (derived from the booking schedule, no
 * manual check-in). Returns an unsubscribe function for cleanup. */
export function watchRoom(token: string, roomId: string, onOccupant: (payload: OccupantPayload) => void): () => void {
  const activeSocket = getSocket(token);

  function handleOccupant(payload: OccupantPayload) {
    if (payload.roomId === roomId) {
      onOccupant(payload);
    }
  }

  activeSocket.on('room:occupant', handleOccupant);
  activeSocket.emit('room:watch', roomId);

  return () => {
    activeSocket.off('room:occupant', handleOccupant);
    activeSocket.emit('room:unwatch', roomId);
  };
}

export interface WorldHandlers {
  onPlayers: (players: WorldPlayer[]) => void;
  onPlayerJoined: (player: WorldPlayer) => void;
  onPlayerMoved: (payload: { id: string; x: number; y: number }) => void;
  onPlayerLeft: (payload: { id: string }) => void;
}

/** Joins the shared world map — every connected user's avatar position is
 * broadcast to everyone else, in memory only (see backend/sockets). Returns
 * an unsubscribe function for cleanup. */
export function joinWorld(token: string, handlers: WorldHandlers): () => void {
  const activeSocket = getSocket(token);

  activeSocket.on('world:players', handlers.onPlayers);
  activeSocket.on('world:player-joined', handlers.onPlayerJoined);
  activeSocket.on('world:player-moved', handlers.onPlayerMoved);
  activeSocket.on('world:player-left', handlers.onPlayerLeft);
  activeSocket.emit('world:join');

  return () => {
    activeSocket.off('world:players', handlers.onPlayers);
    activeSocket.off('world:player-joined', handlers.onPlayerJoined);
    activeSocket.off('world:player-moved', handlers.onPlayerMoved);
    activeSocket.off('world:player-left', handlers.onPlayerLeft);
  };
}

export function sendWorldMove(token: string, x: number, y: number): void {
  getSocket(token).emit('world:move', { x, y });
}
