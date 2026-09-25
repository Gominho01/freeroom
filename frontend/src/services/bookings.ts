import { request, requestFile } from './http';
import type { Booking, WaitlistEntry } from '../types';

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

/** Books the same weekly slot `occurrences` times as one series; the whole
 * series is rejected if any single occurrence would conflict. */
export function createRecurringBooking(
  token: string,
  data: { roomId: string; startTime: string; endTime: string; occurrences: number },
): Promise<Booking[]> {
  const { occurrences, ...rest } = data;
  return request<Booking[]>('/bookings', token, {
    method: 'POST',
    body: JSON.stringify({ ...rest, recurrence: { occurrences } }),
  });
}

/** The booking as a single-event .ics file, for importing into a calendar
 * app — the blob's filename comes from the server's Content-Disposition. */
export function fetchBookingIcs(token: string, id: string): Promise<{ blob: Blob; filename: string }> {
  return requestFile(`/bookings/${id}/ics`, token);
}

export function cancelBooking(token: string, id: string): Promise<void> {
  return request<void>(`/bookings/${id}`, token, { method: 'DELETE' });
}

export function cancelBookingSeries(token: string, recurrenceId: string): Promise<void> {
  return request<void>(`/bookings/series/${recurrenceId}`, token, { method: 'DELETE' });
}

export function joinWaitlist(
  token: string,
  data: { roomId: string; startTime: string; endTime: string },
): Promise<WaitlistEntry> {
  return request<WaitlistEntry>('/bookings/waitlist', token, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function listWaitlist(token: string): Promise<WaitlistEntry[]> {
  return request<WaitlistEntry[]>('/bookings/waitlist', token);
}

export function leaveWaitlist(token: string, id: string): Promise<void> {
  return request<void>(`/bookings/waitlist/${id}`, token, { method: 'DELETE' });
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
