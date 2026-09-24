import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Room, WorldPlayer } from '../../../types';

const watchRoom = vi.fn();
const joinWorld = vi.fn();
const sendWorldMove = vi.fn();

vi.mock('../../../services/socket', () => ({
  watchRoom: (...args: unknown[]) => watchRoom(...args),
  joinWorld: (...args: unknown[]) => joinWorld(...args),
  sendWorldMove: (...args: unknown[]) => sendWorldMove(...args),
}));

const { authState } = vi.hoisted(() => ({
  authState: {
    token: 'test-token',
    user: { id: 'me', name: 'Ada', avatarSeed: 'ada-seed', role: 'USER' as const },
  },
}));

vi.mock('../../../store/auth', () => ({
  useAuthStore: (selector: (state: typeof authState) => unknown) => selector(authState),
}));

import { WorldMap } from '../WorldMap';

const rooms: Room[] = [
  {
    id: 'room-1',
    name: 'Conference Room A',
    nickname: 'The Fridge',
    quirks: [],
    capacity: 4,
    amenities: [],
    photos: [],
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'room-2',
    name: 'Conference Room B',
    nickname: 'The Aquarium',
    quirks: [],
    capacity: 4,
    amenities: [],
    photos: [],
    createdAt: '2026-01-01T00:00:00.000Z',
  },
];

function renderWithClient(children: React.ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>);
}

describe('WorldMap', () => {
  beforeEach(() => {
    watchRoom.mockReset();
    joinWorld.mockReset();
    sendWorldMove.mockReset();
    watchRoom.mockReturnValue(vi.fn());
    joinWorld.mockReturnValue(vi.fn());
  });

  it('renders every room as a building, plus the front desk', () => {
    renderWithClient(<WorldMap rooms={rooms} isAdmin={false} onCreateRoom={vi.fn()} />);

    expect(screen.getByText('The Fridge')).toBeInTheDocument();
    expect(screen.getByText('The Aquarium')).toBeInTheDocument();
    expect(screen.getByText('Front desk')).toBeInTheDocument();
  });

  it("renders the current user's own avatar", () => {
    renderWithClient(<WorldMap rooms={rooms} isAdmin={false} onCreateRoom={vi.fn()} />);

    expect(screen.getByText('Ada')).toBeInTheDocument();
  });

  it('joins the shared world channel on mount and leaves it on unmount', () => {
    const leave = vi.fn();
    joinWorld.mockReturnValue(leave);

    const { unmount } = renderWithClient(<WorldMap rooms={rooms} isAdmin={false} onCreateRoom={vi.fn()} />);
    expect(joinWorld).toHaveBeenCalledWith('test-token', expect.objectContaining({ onPlayers: expect.any(Function) }));

    unmount();
    expect(leave).toHaveBeenCalled();
  });

  it('watches every room for live occupancy, same as the card view', () => {
    renderWithClient(<WorldMap rooms={rooms} isAdmin={false} onCreateRoom={vi.fn()} />);

    expect(watchRoom).toHaveBeenCalledWith('test-token', 'room-1', expect.any(Function));
    expect(watchRoom).toHaveBeenCalledWith('test-token', 'room-2', expect.any(Function));
  });

  it('shows another connected player from the world snapshot', async () => {
    joinWorld.mockImplementation((_token: string, handlers: { onPlayers: (p: WorldPlayer[]) => void }) => {
      handlers.onPlayers([{ id: 'other', name: 'Bob', avatarSeed: 'bob-seed', x: 100, y: 100 }]);
      return vi.fn();
    });

    renderWithClient(<WorldMap rooms={rooms} isAdmin={false} onCreateRoom={vi.fn()} />);

    await waitFor(() => expect(screen.getByText('Bob')).toBeInTheDocument());
  });

  it("excludes the viewer's own id from the rendered player snapshot", async () => {
    joinWorld.mockImplementation((_token: string, handlers: { onPlayers: (p: WorldPlayer[]) => void }) => {
      handlers.onPlayers([
        { id: 'me', name: 'Ada', avatarSeed: 'ada-seed', x: 50, y: 50 },
        { id: 'other', name: 'Bob', avatarSeed: 'bob-seed', x: 100, y: 100 },
      ]);
      return vi.fn();
    });

    renderWithClient(<WorldMap rooms={rooms} isAdmin={false} onCreateRoom={vi.fn()} />);

    await waitFor(() => expect(screen.getByText('Bob')).toBeInTheDocument());
    // Only one "Ada" — the viewer's own avatar — not a duplicate from the snapshot.
    expect(screen.getAllByText('Ada')).toHaveLength(1);
  });

  it('shows a create-room placeholder square for an admin on an empty map', () => {
    const { container } = renderWithClient(<WorldMap rooms={[]} isAdmin onCreateRoom={vi.fn()} />);

    // Not a click target — like every other door on the map, it's reached by
    // walking up and pressing E, so this only checks it renders.
    expect(container.querySelector('.world-building-placeholder')).not.toBeNull();
    expect(screen.queryByText(/no rooms yet/i)).not.toBeInTheDocument();
  });

  it('shows a plain empty-state message on an empty map for a non-admin', () => {
    const { container } = renderWithClient(<WorldMap rooms={[]} isAdmin={false} onCreateRoom={vi.fn()} />);

    expect(screen.getByText(/no rooms yet/i)).toBeInTheDocument();
    expect(container.querySelector('.world-building-placeholder')).toBeNull();
  });

  it('shows no empty-map placeholder once there are rooms', () => {
    const { container } = renderWithClient(<WorldMap rooms={rooms} isAdmin onCreateRoom={vi.fn()} />);

    expect(container.querySelector('.world-building-placeholder')).toBeNull();
    expect(screen.queryByText(/no rooms yet/i)).not.toBeInTheDocument();
  });
});
