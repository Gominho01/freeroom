import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Room, User } from '../../types';

const listRooms = vi.fn();

vi.mock('../../services/rooms', () => ({
  listRooms: (...args: unknown[]) => listRooms(...args),
  createRoom: vi.fn(),
  updateRoom: vi.fn(),
  deleteRoom: vi.fn(),
}));

// Each RoomCard watches its own room's live occupant; the socket layer
// itself is covered by RoomCard's own tests, so just stub it out here.
vi.mock('../../services/socket', () => ({
  watchRoom: vi.fn(() => vi.fn()),
}));

const adminUser: User = {
  id: 'u1',
  email: 'admin@example.com',
  name: 'Ada',
  avatarSeed: 'ada',
  role: 'ADMIN',
  createdAt: '2026-01-01T00:00:00.000Z',
};

const regularUser: User = { ...adminUser, id: 'u2', role: 'USER' };

let currentUser = adminUser;

vi.mock('../../store/auth', () => ({
  useAuthStore: (selector: (state: { token: string; user: User; logout: () => void }) => unknown) =>
    selector({ token: 'test-token', user: currentUser, logout: vi.fn() }),
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
    currentUser = adminUser;
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
        photos: [],
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ];
    listRooms.mockResolvedValue(rooms);

    renderWithClient();

    await waitFor(() => expect(screen.getByText('The Fridge')).toBeInTheDocument());
    expect(listRooms).toHaveBeenCalledWith('test-token');
  });

  it('shows an admin-only "New room" tile instead of empty-state text when there are no rooms', async () => {
    listRooms.mockResolvedValue([]);

    renderWithClient();

    await waitFor(() => expect(screen.getByRole('button', { name: /new room/i })).toBeInTheDocument());
    expect(screen.queryByText(/no rooms yet/i)).not.toBeInTheDocument();
  });

  it('shows plain empty-state text and no "New room" tile for a regular user', async () => {
    currentUser = regularUser;
    listRooms.mockResolvedValue([]);

    renderWithClient();

    await waitFor(() => expect(screen.getByText(/no rooms yet/i)).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /new room/i })).not.toBeInTheDocument();
  });

  it('lets an admin add a room from the "New room" tile alongside existing rooms', async () => {
    const rooms: Room[] = [
      {
        id: '1',
        name: 'Conference Room A',
        nickname: 'The Fridge',
        quirks: [],
        capacity: 8,
        amenities: [],
        photos: [],
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ];
    listRooms.mockResolvedValue(rooms);

    renderWithClient();

    await waitFor(() => expect(screen.getByText('The Fridge')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /new room/i }));
    expect(screen.getByRole('heading', { name: /^new room$/i })).toBeInTheDocument();
  });
});
