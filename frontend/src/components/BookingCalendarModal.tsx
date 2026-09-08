import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addDays, format, isSameDay, startOfDay } from 'date-fns';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { createBooking, listBookings, rangesOverlap } from '../services/bookings';
import { useAuthStore } from '../store/auth';
import type { Booking, Room } from '../types';

const DAYS_AHEAD = 7;

function upcomingDays(): Date[] {
  const today = startOfDay(new Date());
  return Array.from({ length: DAYS_AHEAD }, (_, i) => addDays(today, i));
}

/** Formats "now" for a datetime-local input's `min` attribute, so the
 * browser's own picker already blocks past dates/times. */
function nowForInput(): string {
  return format(new Date(), "yyyy-MM-dd'T'HH:mm");
}

interface BookingCalendarModalProps {
  room: Room;
  onClose: () => void;
}

export function BookingCalendarModal({ room, onClose }: BookingCalendarModalProps) {
  const token = useAuthStore((s) => s.token)!;
  const queryClient = useQueryClient();
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [conflictError, setConflictError] = useState<string | null>(null);

  const bookingsQuery = useQuery({
    queryKey: ['bookings', room.id],
    queryFn: () => listBookings(token, { roomId: room.id }),
  });

  const createMutation = useMutation({
    mutationFn: (data: { roomId: string; startTime: string; endTime: string }) => createBooking(token, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings', room.id] });
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
      setStart('');
      setEnd('');
      setConflictError(null);
    },
    onError: (err: Error) => setConflictError(err.message),
  });

  const bookings = bookingsQuery.data ?? [];

  function bookingsOn(day: Date): Booking[] {
    return bookings
      .filter((booking) => isSameDay(new Date(booking.startTime), day))
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  function overlapsExisting(candidate: { start: Date; end: Date }): boolean {
    return bookings.some((booking) =>
      rangesOverlap(candidate, { start: new Date(booking.startTime), end: new Date(booking.endTime) }),
    );
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!start || !end) return;

    const range = { start: new Date(start), end: new Date(end) };
    if (range.start.getTime() <= Date.now()) {
      setConflictError('Start time must be in the future.');
      return;
    }
    if (range.end <= range.start) {
      setConflictError('End time must be after the start time.');
      return;
    }

    // Reflects the conflict immediately from what's already loaded, instead
    // of waiting on the 409 the server would return for the same overlap.
    if (overlapsExisting(range)) {
      setConflictError('This time overlaps an existing booking.');
      return;
    }

    setConflictError(null);
    createMutation.mutate({
      roomId: room.id,
      startTime: range.start.toISOString(),
      endTime: range.end.toISOString(),
    });
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content calendar-modal" onClick={(e) => e.stopPropagation()}>
        <h2>{room.nickname}</h2>
        <p className="calendar-hint">Booked times over the next {DAYS_AHEAD} days:</p>

        {bookingsQuery.isLoading && <p className="rooms-status">Loading…</p>}

        <div className="booking-days">
          {upcomingDays().map((day) => {
            const dayBookings = bookingsOn(day);
            return (
              <div key={day.toISOString()} className="booking-day">
                <p className="booking-day-label">{format(day, 'EEE, MMM d')}</p>
                {dayBookings.length === 0 ? (
                  <p className="booking-day-free">Free</p>
                ) : (
                  <div className="booking-day-slots">
                    {dayBookings.map((booking) => (
                      <span key={booking.id} className="booking-slot">
                        {format(new Date(booking.startTime), 'HH:mm')}–{format(new Date(booking.endTime), 'HH:mm')}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <form className="booking-form" onSubmit={handleSubmit}>
          <label>
            Starts
            <input
              type="datetime-local"
              value={start}
              min={nowForInput()}
              onChange={(e) => setStart(e.target.value)}
              required
            />
          </label>
          <label>
            Ends
            <input
              type="datetime-local"
              value={end}
              min={start || nowForInput()}
              onChange={(e) => setEnd(e.target.value)}
              required
            />
          </label>

          {conflictError && <p className="auth-error">{conflictError}</p>}

          <div className="modal-actions">
            <button type="button" className="link-button" onClick={onClose}>
              Close
            </button>
            <button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Booking…' : 'Book room'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
