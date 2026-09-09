import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { cancelBooking, listBookings } from '../services/bookings';
import { useAuthStore } from '../store/auth';
import type { Room } from '../types';

interface MyBookingsModalProps {
  rooms: Room[];
  onClose: () => void;
}

export function MyBookingsModal({ rooms, onClose }: MyBookingsModalProps) {
  const token = useAuthStore((s) => s.token)!;
  const currentUser = useAuthStore((s) => s.user)!;
  const isAdmin = currentUser.role === 'ADMIN';
  const queryClient = useQueryClient();

  // The backend ignores any userId filter for non-admins and always scopes
  // the result to the requester, so an unfiltered call is already "mine".
  const bookingsQuery = useQuery({
    queryKey: ['my-bookings'],
    queryFn: () => listBookings(token),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => cancelBooking(token, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-bookings'] }),
  });

  function roomLabel(roomId: string): string {
    return rooms.find((r) => r.id === roomId)?.nickname ?? 'Unknown room';
  }

  const bookings = bookingsQuery.data ?? [];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>{isAdmin ? 'All bookings' : 'My bookings'}</h2>

        {bookingsQuery.isLoading && <p className="rooms-status">Loading…</p>}
        {bookings.length === 0 && !bookingsQuery.isLoading && (
          <p className="rooms-status">{isAdmin ? 'No bookings yet.' : 'You have no bookings yet.'}</p>
        )}

        <ul className="my-bookings-list">
          {bookings.map((booking) => (
            <li key={booking.id}>
              <div>
                <p className="my-bookings-room">{roomLabel(booking.roomId)}</p>
                <p className="my-bookings-time">
                  {format(new Date(booking.startTime), 'MMM d, HH:mm')} –{' '}
                  {format(new Date(booking.endTime), 'HH:mm')}
                </p>
                {isAdmin && booking.userId !== currentUser.id && (
                  <p className="my-bookings-owner">Booked by {booking.user?.name ?? 'unknown user'}</p>
                )}
              </div>
              <button
                type="button"
                className="link-button danger-link"
                onClick={() => cancelMutation.mutate(booking.id)}
              >
                Cancel
              </button>
            </li>
          ))}
        </ul>

        <div className="modal-actions">
          <button type="button" className="link-button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
