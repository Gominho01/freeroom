import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RoomCard } from '../RoomCard';
import type { Room } from '../../types';

const room: Room = {
  id: '1',
  name: 'Conference Room A',
  nickname: 'The Fridge',
  quirks: ['Broken AC', 'Weak Wi-Fi'],
  capacity: 8,
  amenities: ['projector', 'tv'],
  createdAt: '2026-01-01T00:00:00.000Z',
};

describe('RoomCard', () => {
  it('renders the room profile', () => {
    render(<RoomCard room={room} isAdmin={false} onEdit={vi.fn()} onDelete={vi.fn()} />);

    expect(screen.getByText('The Fridge')).toBeInTheDocument();
    expect(screen.getByText('Conference Room A')).toBeInTheDocument();
    expect(screen.getByText('Broken AC')).toBeInTheDocument();
    expect(screen.getByText('8 seats')).toBeInTheDocument();
  });

  it('hides admin actions for a regular user', () => {
    render(<RoomCard room={room} isAdmin={false} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
  });

  it('lets an admin edit and delete the room', () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(<RoomCard room={room} isAdmin onEdit={onEdit} onDelete={onDelete} />);

    fireEvent.click(screen.getByRole('button', { name: /edit/i }));
    expect(onEdit).toHaveBeenCalledWith(room);

    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    expect(onDelete).toHaveBeenCalledWith(room);
  });
});
