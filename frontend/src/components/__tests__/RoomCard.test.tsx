import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { OccupantPayload } from '../../services/socket';
import type { Room } from '../../types';

const watchRoom = vi.fn();

vi.mock('../../services/socket', () => ({
  watchRoom: (...args: unknown[]) => watchRoom(...args),
}));

vi.mock('../../store/auth', () => ({
  useAuthStore: (selector: (state: { token: string }) => unknown) => selector({ token: 'test-token' }),
}));

import { RoomCard } from '../RoomCard';

const room: Room = {
  id: '1',
  name: 'Conference Room A',
  nickname: 'The Fridge',
  quirks: ['Broken AC', 'Weak Wi-Fi'],
  capacity: 8,
  amenities: ['projector', 'tv'],
  photos: [],
  createdAt: '2026-01-01T00:00:00.000Z',
};

describe('RoomCard', () => {
  beforeEach(() => {
    watchRoom.mockReset();
    watchRoom.mockReturnValue(vi.fn());
  });

  it('renders the room profile', () => {
    render(
      <RoomCard room={room} isAdmin={false} onBook={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} onViewPhotos={vi.fn()} />,
    );

    expect(screen.getByText('The Fridge')).toBeInTheDocument();
    expect(screen.getByText('Conference Room A')).toBeInTheDocument();
    expect(screen.getByText('Broken AC')).toBeInTheDocument();
    expect(screen.getByText('8 seats')).toBeInTheDocument();
  });

  it('hides admin actions for a regular user', () => {
    render(
      <RoomCard room={room} isAdmin={false} onBook={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} onViewPhotos={vi.fn()} />,
    );
    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
  });

  it('lets an admin edit and delete the room', () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(
      <RoomCard room={room} isAdmin onBook={vi.fn()} onEdit={onEdit} onDelete={onDelete} onViewPhotos={vi.fn()} />,
    );

    fireEvent.click(screen.getByRole('button', { name: /edit/i }));
    expect(onEdit).toHaveBeenCalledWith(room);

    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    expect(onDelete).toHaveBeenCalledWith(room);
  });

  it('lets any user book the room', () => {
    const onBook = vi.fn();
    render(
      <RoomCard room={room} isAdmin={false} onBook={onBook} onEdit={vi.fn()} onDelete={vi.fn()} onViewPhotos={vi.fn()} />,
    );

    fireEvent.click(screen.getByRole('button', { name: /book/i }));
    expect(onBook).toHaveBeenCalledWith(room);
  });

  it('only shows a Photos action when the room has photos', () => {
    const onViewPhotos = vi.fn();
    const { rerender } = render(
      <RoomCard room={room} isAdmin={false} onBook={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} onViewPhotos={onViewPhotos} />,
    );
    expect(screen.queryByRole('button', { name: /photos/i })).not.toBeInTheDocument();

    const roomWithPhotos = { ...room, photos: ['https://images.example.com/a.jpg'] };
    rerender(
      <RoomCard
        room={roomWithPhotos}
        isAdmin={false}
        onBook={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onViewPhotos={onViewPhotos}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /photos/i }));
    expect(onViewPhotos).toHaveBeenCalledWith(roomWithPhotos);
  });

  it('watches its own room and shows the current occupant', async () => {
    let emit!: (payload: OccupantPayload) => void;
    watchRoom.mockImplementation((_token: string, roomId: string, onOccupant: (p: OccupantPayload) => void) => {
      expect(roomId).toBe(room.id);
      emit = onOccupant;
      return vi.fn();
    });

    render(
      <RoomCard room={room} isAdmin={false} onBook={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} onViewPhotos={vi.fn()} />,
    );

    expect(screen.getByLabelText(/room is free/i)).toBeInTheDocument();

    emit({
      roomId: room.id,
      occupant: {
        bookingId: 'b1',
        endsAt: '2030-01-01T11:00:00.000Z',
        user: { id: 'u1', name: 'Ada', avatarSeed: 'ada-seed' },
      },
    });

    await waitFor(() => expect(screen.getByRole('img')).toBeInTheDocument());
    expect(screen.queryByLabelText(/room is free/i)).not.toBeInTheDocument();
  });
});
