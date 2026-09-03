import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Room, User } from '../../types';

const listRooms = vi.fn();

vi.mock('../../services/rooms', () => ({
  listRooms: (...args: unknown[]) => listRooms(...args),
  createRoom: vi.fn(),
  updateRoom: vi.fn(),
  deleteRoom: vi.fn(),
}));

const user: User = {
  id: 'u1',
  email: 'admin@example.com',
  name: 'Ada',
  avatarSeed: 'ada',
  role: 'ADMIN',
  createdAt: '2026-01-01T00:00:00.000Z',
};

vi.mock('../../store/auth', () => ({
  useAuthStore: (selector: (state: { token: string; user: User; logout: () => void }) => unknown) =>
    selector({ token: 'test-token', user, logout: vi.fn() }),
}));

import { RoomsPage } from '../RoomsPage';

function renderWithClient() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <RoomsPage />
    </QueryClientProvider>,
  );
}

describe('RoomsPage', () => {
  beforeEach(() => {
    listRooms.mockReset();
  });

  it('renders the rooms returned by the API', async () => {
    const rooms: Room[] = [
      {
        id: '1',
        name: 'Conference Room A',
        nickname: 'The Fridge',
        quirks: ['Broken AC'],
        capacity: 8,
        amenities: [],
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ];
    listRooms.mockResolvedValue(rooms);

    renderWithClient();

    await waitFor(() => expect(screen.getByText('The Fridge')).toBeInTheDocument());
    expect(listRooms).toHaveBeenCalledWith('test-token');
  });

  it('shows an empty state and the admin-only "New room" button', async () => {
    listRooms.mockResolvedValue([]);

    renderWithClient();

    await waitFor(() => expect(screen.getByText(/no rooms yet/i)).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /new room/i })).toBeInTheDocument();
  });
});
