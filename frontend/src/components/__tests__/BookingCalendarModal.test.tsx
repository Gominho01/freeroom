import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiRequestError } from '../../services/http';
import type { Booking, Room } from '../../types';

const listBookings = vi.fn();
const createBooking = vi.fn();
const createRecurringBooking = vi.fn();
const joinWaitlist = vi.fn();

vi.mock('../../services/bookings', async () => {
  const actual = await vi.importActual<typeof import('../../services/bookings')>('../../services/bookings');
  return {
    ...actual,
    listBookings: (...args: unknown[]) => listBookings(...args),
    createBooking: (...args: unknown[]) => createBooking(...args),
    createRecurringBooking: (...args: unknown[]) => createRecurringBooking(...args),
    joinWaitlist: (...args: unknown[]) => joinWaitlist(...args),
  };
});

vi.mock('../../store/auth', () => ({
  useAuthStore: (selector: (state: { token: string }) => unknown) => selector({ token: 'test-token' }),
}));

import { BookingCalendarModal } from '../BookingCalendarModal';

const room: Room = {
  id: 'room-1',
  name: 'Conference Room A',
  nickname: 'The Fridge',
  quirks: [],
  capacity: 8,
  amenities: [],
  createdAt: '2026-01-01T00:00:00.000Z',
};

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('BookingCalendarModal', () => {
  beforeEach(() => {
    listBookings.mockReset();
    createBooking.mockReset();
    createRecurringBooking.mockReset();
    joinWaitlist.mockReset();
  });

  it('lists today as free and shows a booked slot for today', async () => {
    const start = new Date();
    start.setHours(10, 0, 0, 0);
    const end = new Date(start.getTime() + 60 * 60 * 1000);

    const bookings: Booking[] = [
      {
        id: 'b1',
        roomId: room.id,
        userId: 'u1',
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ];
    listBookings.mockResolvedValue(bookings);

    renderWithClient(<BookingCalendarModal room={room} onClose={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'The Fridge' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('10:00–11:00')).toBeInTheDocument());
    // The other 6 upcoming days have no bookings for this room.
    expect(screen.getAllByText('Free')).toHaveLength(6);
    expect(listBookings).toHaveBeenCalledWith('test-token', { roomId: room.id });
  });

  it('calls onClose when the close button is clicked', () => {
    listBookings.mockResolvedValue([]);
    const onClose = vi.fn();

    renderWithClient(<BookingCalendarModal room={room} onClose={onClose} />);

    screen.getByRole('button', { name: /close/i }).click();
    expect(onClose).toHaveBeenCalled();
  });

  it('books the room for the entered start/end time', async () => {
    listBookings.mockResolvedValue([]);
    createBooking.mockResolvedValue({});

    renderWithClient(<BookingCalendarModal room={room} onClose={vi.fn()} />);
    await waitFor(() => expect(listBookings).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText(/starts/i), { target: { value: '2030-01-01T10:00' } });
    fireEvent.change(screen.getByLabelText(/ends/i), { target: { value: '2030-01-01T11:00' } });
    fireEvent.click(screen.getByRole('button', { name: /book room/i }));

    await waitFor(() =>
      expect(createBooking).toHaveBeenCalledWith('test-token', {
        roomId: room.id,
        startTime: new Date('2030-01-01T10:00').toISOString(),
        endTime: new Date('2030-01-01T11:00').toISOString(),
      }),
    );
  });

  it('flags a start time in the past immediately, without calling the API', async () => {
    listBookings.mockResolvedValue([]);

    const { container } = renderWithClient(<BookingCalendarModal room={room} onClose={vi.fn()} />);
    await waitFor(() => expect(listBookings).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText(/starts/i), { target: { value: '2020-01-01T10:00' } });
    fireEvent.change(screen.getByLabelText(/ends/i), { target: { value: '2020-01-01T11:00' } });
    // Submitting the form directly (rather than clicking the button) skips
    // the browser's own `min`-based constraint validation, so this still
    // exercises our in-code guard the same way a stale/tampered value would.
    fireEvent.submit(container.querySelector('.booking-form')!);

    expect(screen.getByText(/start time must be in the future/i)).toBeInTheDocument();
    expect(createBooking).not.toHaveBeenCalled();
  });

  it('flags an overlapping time immediately, without calling the API', async () => {
    // Built from the same "local, no timezone suffix" string a
    // datetime-local input produces, so the comparison below is
    // timezone-independent.
    const existing: Booking = {
      id: 'b1',
      roomId: room.id,
      userId: 'u1',
      startTime: new Date('2030-01-01T10:00').toISOString(),
      endTime: new Date('2030-01-01T11:00').toISOString(),
      createdAt: '2026-01-01T00:00:00.000Z',
    };
    listBookings.mockResolvedValue([existing]);

    renderWithClient(<BookingCalendarModal room={room} onClose={vi.fn()} />);
    await waitFor(() => expect(listBookings).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText(/starts/i), { target: { value: '2030-01-01T10:30' } });
    fireEvent.change(screen.getByLabelText(/ends/i), { target: { value: '2030-01-01T11:30' } });
    fireEvent.click(screen.getByRole('button', { name: /book room/i }));

    expect(screen.getByText(/overlaps an existing booking/i)).toBeInTheDocument();
    expect(createBooking).not.toHaveBeenCalled();
  });

  it('books a weekly series when "Repeat weekly" is checked', async () => {
    listBookings.mockResolvedValue([]);
    createRecurringBooking.mockResolvedValue([{}, {}, {}]);

    renderWithClient(<BookingCalendarModal room={room} onClose={vi.fn()} />);
    await waitFor(() => expect(listBookings).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText(/starts/i), { target: { value: '2030-01-07T10:00' } });
    fireEvent.change(screen.getByLabelText(/ends/i), { target: { value: '2030-01-07T11:00' } });
    fireEvent.click(screen.getByLabelText(/repeat weekly/i));
    fireEvent.change(screen.getByLabelText(/for how many weeks/i), { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: /book series/i }));

    await waitFor(() =>
      expect(createRecurringBooking).toHaveBeenCalledWith('test-token', {
        roomId: room.id,
        startTime: new Date('2030-01-07T10:00').toISOString(),
        endTime: new Date('2030-01-07T11:00').toISOString(),
        occurrences: 3,
      }),
    );
    expect(createBooking).not.toHaveBeenCalled();
  });

  it('rejects an out-of-range occurrence count without calling the API', async () => {
    listBookings.mockResolvedValue([]);

    const { container } = renderWithClient(<BookingCalendarModal room={room} onClose={vi.fn()} />);
    await waitFor(() => expect(listBookings).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText(/starts/i), { target: { value: '2030-01-07T10:00' } });
    fireEvent.change(screen.getByLabelText(/ends/i), { target: { value: '2030-01-07T11:00' } });
    fireEvent.click(screen.getByLabelText(/repeat weekly/i));
    fireEvent.change(screen.getByLabelText(/for how many weeks/i), { target: { value: '1' } });
    // Submitting the form directly skips the browser's own `min`-based
    // constraint validation, same as the past-date test above.
    fireEvent.submit(container.querySelector('.booking-form')!);

    expect(screen.getByText(/repeat for between 2 and 12 weeks/i)).toBeInTheDocument();
    expect(createRecurringBooking).not.toHaveBeenCalled();
  });

  it('offers to join the waitlist when the server rejects with a 409 conflict', async () => {
    listBookings.mockResolvedValue([]);
    createBooking.mockRejectedValue(new ApiRequestError('This time overlaps an existing booking.', 409));

    renderWithClient(<BookingCalendarModal room={room} onClose={vi.fn()} />);
    await waitFor(() => expect(listBookings).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText(/starts/i), { target: { value: '2030-01-01T10:00' } });
    fireEvent.change(screen.getByLabelText(/ends/i), { target: { value: '2030-01-01T11:00' } });
    fireEvent.click(screen.getByRole('button', { name: /book room/i }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /join waitlist for this time/i })).toBeInTheDocument(),
    );
  });

  it('does not offer the waitlist for a non-conflict error', async () => {
    listBookings.mockResolvedValue([]);
    createBooking.mockRejectedValue(new ApiRequestError('Something went wrong.', 500));

    renderWithClient(<BookingCalendarModal room={room} onClose={vi.fn()} />);
    await waitFor(() => expect(listBookings).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText(/starts/i), { target: { value: '2030-01-01T10:00' } });
    fireEvent.change(screen.getByLabelText(/ends/i), { target: { value: '2030-01-01T11:00' } });
    fireEvent.click(screen.getByRole('button', { name: /book room/i }));

    await waitFor(() => expect(screen.getByText(/something went wrong/i)).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /join waitlist for this time/i })).not.toBeInTheDocument();
  });

  it('joins the waitlist and shows a confirmation', async () => {
    listBookings.mockResolvedValue([]);
    createBooking.mockRejectedValue(new ApiRequestError('This time overlaps an existing booking.', 409));
    joinWaitlist.mockResolvedValue({});

    renderWithClient(<BookingCalendarModal room={room} onClose={vi.fn()} />);
    await waitFor(() => expect(listBookings).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText(/starts/i), { target: { value: '2030-01-01T10:00' } });
    fireEvent.change(screen.getByLabelText(/ends/i), { target: { value: '2030-01-01T11:00' } });
    fireEvent.click(screen.getByRole('button', { name: /book room/i }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /join waitlist for this time/i })).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole('button', { name: /join waitlist for this time/i }));

    await waitFor(() =>
      expect(joinWaitlist).toHaveBeenCalledWith('test-token', {
        roomId: room.id,
        startTime: new Date('2030-01-01T10:00').toISOString(),
        endTime: new Date('2030-01-01T11:00').toISOString(),
      }),
    );
    expect(screen.getByText(/added to your waitlist/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /join waitlist for this time/i })).not.toBeInTheDocument();
  });
});
