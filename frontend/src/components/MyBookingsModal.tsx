import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useState } from 'react';
import { useDialogA11y } from '../hooks/useDialogA11y';
import {
  cancelBooking,
  cancelBookingSeries,
  fetchBookingIcs,
  leaveWaitlist,
  listBookings,
  listWaitlist,
} from '../services/bookings';
import { useAuthStore } from '../store/auth';
import type { Room } from '../types';

interface MyBookingsModalProps {
  rooms: Room[];
  onClose: () => void;
}

export function MyBookingsModal({ rooms, onClose }: MyBookingsModalProps) {
  const { ref, titleId } = useDialogA11y<HTMLDivElement>(onClose);
  const token = useAuthStore((s) => s.token)!;
  const currentUser = useAuthStore((s) => s.user)!;
  const isAdmin = currentUser.role === 'ADMIN';
  const queryClient = useQueryClient();
  const [downloadError, setDownloadError] = useState<string | null>(null);

  // The backend ignores any userId filter for non-admins and always scopes
  // the result to the requester, so an unfiltered call is already "mine".
  // `from` excludes bookings that have already ended — nothing left to
  // cancel there, and without it the list only grows forever.
  const bookingsQuery = useQuery({
    queryKey: ['my-bookings'],
    queryFn: () => listBookings(token, { from: new Date().toISOString() }),
  });

  // Cancelling can free a slot someone (including the canceller) is
  // waitlisted for, which removes their entry and sends them a
  // notification — so both queries need to be refreshed alongside bookings.
  function invalidateAfterCancel() {
    queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
    queryClient.invalidateQueries({ queryKey: ['waitlist'] });
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  }

  const cancelMutation = useMutation({
    mutationFn: (id: string) => cancelBooking(token, id),
    onSuccess: invalidateAfterCancel,
  });

  const cancelSeriesMutation = useMutation({
    mutationFn: (recurrenceId: string) => cancelBookingSeries(token, recurrenceId),
    onSuccess: invalidateAfterCancel,
  });

  const waitlistQuery = useQuery({
    queryKey: ['waitlist'],
    queryFn: () => listWaitlist(token),
  });

  const leaveWaitlistMutation = useMutation({
    mutationFn: (id: string) => leaveWaitlist(token, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['waitlist'] }),
  });

  async function handleAddToCalendar(id: string) {
    setDownloadError(null);
    try {
      const { blob, filename } = await fetchBookingIcs(token, id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : 'Could not download the calendar file');
    }
  }

  function roomLabel(roomId: string): string {
    return rooms.find((r) => r.id === roomId)?.nickname ?? 'Unknown room';
  }

  const bookings = bookingsQuery.data ?? [];
  const waitlistEntries = waitlistQuery.data ?? [];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        ref={ref}
        className="modal-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={titleId}>{isAdmin ? 'All bookings' : 'My bookings'}</h2>

        {downloadError && <p className="auth-error">{downloadError}</p>}

        {bookingsQuery.isLoading && <p className="rooms-status">Loading…</p>}
        {bookings.length === 0 && !bookingsQuery.isLoading && (
          <p className="rooms-status">{isAdmin ? 'No bookings yet.' : 'You have no bookings yet.'}</p>
        )}

        <ul className="my-bookings-list">
          {bookings.map((booking) => (
            <li key={booking.id}>
              <div>
                <p className="my-bookings-room">
                  {roomLabel(booking.roomId)}
                  {booking.recurrenceId && <span className="my-bookings-recurring">Weekly series</span>}
                </p>
                <p className="my-bookings-time">
                  {format(new Date(booking.startTime), 'MMM d, HH:mm')} –{' '}
                  {format(new Date(booking.endTime), 'HH:mm')}
                </p>
                {isAdmin && booking.userId !== currentUser.id && (
                  <p className="my-bookings-owner">Booked by {booking.user?.name ?? 'unknown user'}</p>
                )}
              </div>
              <div className="my-bookings-actions">
                <button type="button" className="link-button" onClick={() => handleAddToCalendar(booking.id)}>
                  Add to calendar
                </button>
                <button
                  type="button"
                  className="link-button danger-link"
                  onClick={() => cancelMutation.mutate(booking.id)}
                >
                  Cancel
                </button>
                {booking.recurrenceId && (
                  <button
                    type="button"
                    className="link-button danger-link"
                    onClick={() => cancelSeriesMutation.mutate(booking.recurrenceId!)}
                  >
                    Cancel series
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>

        {waitlistEntries.length > 0 && (
          <>
            <h3 className="my-bookings-section-title">My waitlist</h3>
            <ul className="my-bookings-list">
              {waitlistEntries.map((entry) => (
                <li key={entry.id}>
                  <div>
                    <p className="my-bookings-room">{entry.room?.nickname ?? roomLabel(entry.roomId)}</p>
                    <p className="my-bookings-time">
                      {format(new Date(entry.startTime), 'MMM d, HH:mm')} –{' '}
                      {format(new Date(entry.endTime), 'HH:mm')}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="link-button danger-link"
                    onClick={() => leaveWaitlistMutation.mutate(entry.id)}
                  >
                    Leave
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}

        <div className="modal-actions">
          <button type="button" className="link-button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
