import { io, type Socket } from 'socket.io-client';
import type { Occupant } from '../types';

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
