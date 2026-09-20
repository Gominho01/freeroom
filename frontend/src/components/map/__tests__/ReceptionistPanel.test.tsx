import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Occupant, Room } from '../../../types';
import { ReceptionistPanel } from '../ReceptionistPanel';

const rooms: Room[] = [
  {
    id: 'room-1',
    name: 'Conference Room A',
    nickname: 'The Fridge',
    quirks: [],
    capacity: 4,
    amenities: [],
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'room-2',
    name: 'Conference Room B',
    nickname: 'The Aquarium',
    quirks: [],
    capacity: 4,
    amenities: [],
    createdAt: '2026-01-01T00:00:00.000Z',
  },
];

const busyOccupant: Occupant = {
  bookingId: 'b1',
  endsAt: '2030-01-01T11:00:00.000Z',
  user: { id: 'u1', name: 'Bob', avatarSeed: 'bob-seed' },
};

describe('ReceptionistPanel', () => {
  it('lists every room with its free/busy status', () => {
    render(
      <ReceptionistPanel
        rooms={rooms}
        occupants={{ 'room-1': null, 'room-2': busyOccupant }}
        onBook={vi.fn()}
        onMyBookings={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText('The Fridge')).toBeInTheDocument();
    expect(screen.getByText('Free')).toBeInTheDocument();
    expect(screen.getByText(/with bob until/i)).toBeInTheDocument();
  });

  it('calls onBook with the right room', () => {
    const onBook = vi.fn();
    render(
      <ReceptionistPanel rooms={rooms} occupants={{}} onBook={onBook} onMyBookings={vi.fn()} onClose={vi.fn()} />,
    );

    fireEvent.click(screen.getAllByRole('button', { name: /book/i })[1]!);
    expect(onBook).toHaveBeenCalledWith(rooms[1]);
  });

  it('calls onMyBookings and onClose', () => {
    const onMyBookings = vi.fn();
    const onClose = vi.fn();
    render(
      <ReceptionistPanel
        rooms={rooms}
        occupants={{}}
        onBook={vi.fn()}
        onMyBookings={onMyBookings}
        onClose={onClose}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /my bookings/i }));
    expect(onMyBookings).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /^close$/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
