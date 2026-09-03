import { request } from './http';
import type { Room, RoomInput } from '../types';

export function listRooms(token: string): Promise<Room[]> {
  return request<Room[]>('/rooms', token);
}

export function createRoom(token: string, data: RoomInput): Promise<Room> {
  return request<Room>('/rooms', token, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateRoom(token: string, id: string, data: Partial<RoomInput>): Promise<Room> {
  return request<Room>(`/rooms/${id}`, token, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function deleteRoom(token: string, id: string): Promise<void> {
  return request<void>(`/rooms/${id}`, token, { method: 'DELETE' });
}
