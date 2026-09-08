import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Booking, Room } from '../../types';

const listBookings = vi.fn();
const cancelBooking = vi.fn();

vi.mock('../../services/bookings', () => ({
  listBookings: (...args: unknown[]) => listBookings(...args),
  cancelBooking: (...args: unknown[]) => cancelBooking(...args),
}));

vi.mock('../../store/auth', () => ({
  useAuthStore: (selector: (state: { token: string }) => unknown) => selector({ token: 'test-token' }),
}));

import { MyBookingsModal } from '../MyBookingsModal';

const rooms: Room[] = [
  {
    id: 'room-1',
    name: 'Conference Room A',
    nickname: 'The Fridge',
    quirks: [],
    capacity: 8,
    amenities: [],
    createdAt: '2026-01-01T00:00:00.000Z',
  },
];

const booking: Booking = {
  id: 'b1',
  roomId: 'room-1',
  userId: 'u1',
  startTime: '2026-01-05T10:00:00.000Z',
  endTime: '2026-01-05T11:00:00.000Z',
  createdAt: '2026-01-01T00:00:00.000Z',
};

function renderWithClient() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MyBookingsModal rooms={rooms} onClose={vi.fn()} />
    </QueryClientProvider>,
  );
}

describe('MyBookingsModal', () => {
  beforeEach(() => {
    listBookings.mockReset();
    cancelBooking.mockReset();
  });

  it('shows the room nickname for each booking', async () => {
    listBookings.mockResolvedValue([booking]);

    renderWithClient();

    await waitFor(() => expect(screen.getByText('The Fridge')).toBeInTheDocument());
    expect(listBookings).toHaveBeenCalledWith('test-token');
  });

  it('shows an empty state when there are no bookings', async () => {
    listBookings.mockResolvedValue([]);

    renderWithClient();

    await waitFor(() => expect(screen.getByText(/no bookings yet/i)).toBeInTheDocument());
  });

  it('cancels a booking', async () => {
    listBookings.mockResolvedValue([booking]);
    cancelBooking.mockResolvedValue(undefined);

    renderWithClient();

    await waitFor(() => expect(screen.getByText('The Fridge')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    await waitFor(() => expect(cancelBooking).toHaveBeenCalledWith('test-token', 'b1'));
  });
});
