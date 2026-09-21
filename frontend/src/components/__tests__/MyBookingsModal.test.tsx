import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Booking, Room } from '../../types';

const listBookings = vi.fn();
const cancelBooking = vi.fn();
const cancelBookingSeries = vi.fn();

vi.mock('../../services/bookings', () => ({
  listBookings: (...args: unknown[]) => listBookings(...args),
  cancelBooking: (...args: unknown[]) => cancelBooking(...args),
  cancelBookingSeries: (...args: unknown[]) => cancelBookingSeries(...args),
}));

const { authState } = vi.hoisted(() => ({
  authState: {
    token: 'test-token',
    user: { id: 'viewer-1', name: 'Viewer', role: 'USER' as 'USER' | 'ADMIN' },
  },
}));

vi.mock('../../store/auth', () => ({
  useAuthStore: (selector: (state: typeof authState) => unknown) => selector(authState),
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
    cancelBookingSeries.mockReset();
    authState.user = { id: 'viewer-1', name: 'Viewer', role: 'USER' };
  });

  it("shows the room nickname for the viewer's own booking, with no attribution", async () => {
    const booking: Booking = {
      id: 'b1',
      roomId: 'room-1',
      userId: 'viewer-1',
      startTime: '2030-01-05T10:00:00.000Z',
      endTime: '2030-01-05T11:00:00.000Z',
      createdAt: '2026-01-01T00:00:00.000Z',
      user: { id: 'viewer-1', name: 'Viewer' },
    };
    listBookings.mockResolvedValue([booking]);

    renderWithClient();

    await waitFor(() => expect(screen.getByText('The Fridge')).toBeInTheDocument());
    expect(screen.getByRole('heading', { name: 'My bookings' })).toBeInTheDocument();
    expect(screen.queryByText(/booked by/i)).not.toBeInTheDocument();
    // Excludes bookings that have already ended, so it must pass a `from`.
    expect(listBookings).toHaveBeenCalledWith('test-token', { from: expect.any(String) });
  });

  it('asks the backend to exclude bookings that have already ended', async () => {
    listBookings.mockResolvedValue([]);

    renderWithClient();

    await waitFor(() => expect(listBookings).toHaveBeenCalled());
    const [, filters] = listBookings.mock.calls[0] as [string, { from: string }];
    // A generous window rather than an exact match, so the assertion
    // doesn't flake on how long rendering/awaiting actually took.
    expect(Math.abs(new Date(filters.from).getTime() - Date.now())).toBeLessThan(5000);
  });

  it("labels each booking with its owner's name when viewed as admin, except the admin's own", async () => {
    authState.user = { id: 'admin-1', name: 'Ada Admin', role: 'ADMIN' };

    const bookings: Booking[] = [
      {
        id: 'b1',
        roomId: 'room-1',
        userId: 'other-user',
        startTime: '2030-01-05T10:00:00.000Z',
        endTime: '2030-01-05T11:00:00.000Z',
        createdAt: '2026-01-01T00:00:00.000Z',
        user: { id: 'other-user', name: 'Bob' },
      },
      {
        id: 'b2',
        roomId: 'room-1',
        userId: 'admin-1',
        startTime: '2030-01-06T10:00:00.000Z',
        endTime: '2030-01-06T11:00:00.000Z',
        createdAt: '2026-01-01T00:00:00.000Z',
        user: { id: 'admin-1', name: 'Ada Admin' },
      },
    ];
    listBookings.mockResolvedValue(bookings);

    renderWithClient();

    expect(screen.getByRole('heading', { name: 'All bookings' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Booked by Bob')).toBeInTheDocument());
    expect(screen.getAllByText('The Fridge')).toHaveLength(2);
    // Only one attribution line — the admin's own booking gets none.
    expect(screen.getAllByText(/booked by/i)).toHaveLength(1);
  });

  it('shows an empty state when there are no bookings', async () => {
    listBookings.mockResolvedValue([]);

    renderWithClient();

    await waitFor(() => expect(screen.getByText(/no bookings yet/i)).toBeInTheDocument());
  });

  it('cancels a booking', async () => {
    const booking: Booking = {
      id: 'b1',
      roomId: 'room-1',
      userId: 'viewer-1',
      startTime: '2030-01-05T10:00:00.000Z',
      endTime: '2030-01-05T11:00:00.000Z',
      createdAt: '2026-01-01T00:00:00.000Z',
    };
    listBookings.mockResolvedValue([booking]);
    cancelBooking.mockResolvedValue(undefined);

    renderWithClient();

    await waitFor(() => expect(screen.getByText('The Fridge')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    await waitFor(() => expect(cancelBooking).toHaveBeenCalledWith('test-token', 'b1'));
  });

  it('shows a "Weekly series" badge and a series cancel button for a recurring booking', async () => {
    const booking: Booking = {
      id: 'b1',
      roomId: 'room-1',
      userId: 'viewer-1',
      startTime: '2030-01-05T10:00:00.000Z',
      endTime: '2030-01-05T11:00:00.000Z',
      createdAt: '2026-01-01T00:00:00.000Z',
      recurrenceId: 'series-1',
    };
    listBookings.mockResolvedValue([booking]);
    cancelBookingSeries.mockResolvedValue(undefined);

    renderWithClient();

    await waitFor(() => expect(screen.getByText('Weekly series')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /cancel series/i }));

    await waitFor(() => expect(cancelBookingSeries).toHaveBeenCalledWith('test-token', 'series-1'));
  });

  it('does not show the series badge or cancel-series button for a one-off booking', async () => {
    const booking: Booking = {
      id: 'b1',
      roomId: 'room-1',
      userId: 'viewer-1',
      startTime: '2030-01-05T10:00:00.000Z',
      endTime: '2030-01-05T11:00:00.000Z',
      createdAt: '2026-01-01T00:00:00.000Z',
    };
    listBookings.mockResolvedValue([booking]);

    renderWithClient();

    await waitFor(() => expect(screen.getByText('The Fridge')).toBeInTheDocument());
    expect(screen.queryByText('Weekly series')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /cancel series/i })).not.toBeInTheDocument();
  });
});
