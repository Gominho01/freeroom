import { request } from './http';
import type { Booking } from '../types';

export interface BookingFilters {
  roomId?: string;
  userId?: string;
  from?: string;
  to?: string;
}

export function listBookings(token: string, filters: BookingFilters = {}): Promise<Booking[]> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }
  const query = params.toString();
  return request<Booking[]>(`/bookings${query ? `?${query}` : ''}`, token);
}

export function createBooking(
  token: string,
  data: { roomId: string; startTime: string; endTime: string },
): Promise<Booking> {
  return request<Booking>('/bookings', token, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function cancelBooking(token: string, id: string): Promise<void> {
  return request<void>(`/bookings/${id}`, token, { method: 'DELETE' });
}

export interface TimeRange {
  start: Date;
  end: Date;
}

/** Mirrors the backend's overlap check (see booking.service.ts) so the
 * calendar can flag a conflict immediately, without waiting on the 409. */
export function rangesOverlap(a: TimeRange, b: TimeRange): boolean {
  return a.start < b.end && b.start < a.end;
}
