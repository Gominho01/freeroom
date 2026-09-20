import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LeaderboardEntry } from '../../types';

const getLeaderboard = vi.fn();

vi.mock('../../services/analytics', () => ({
  getLeaderboard: (...args: unknown[]) => getLeaderboard(...args),
}));

vi.mock('../../store/auth', () => ({
  useAuthStore: (selector: (state: { token: string }) => unknown) => selector({ token: 'test-token' }),
}));

import { LeaderboardModal } from '../LeaderboardModal';

function renderWithClient() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <LeaderboardModal onClose={vi.fn()} />
    </QueryClientProvider>,
  );
}

describe('LeaderboardModal', () => {
  beforeEach(() => {
    getLeaderboard.mockReset();
  });

  it('ranks rooms with a medal per position and shows the booked duration', async () => {
    const entries: LeaderboardEntry[] = [
      { roomId: 'room-1', name: 'Room A', nickname: 'The Fridge', bookingCount: 3, totalMinutes: 150 },
      { roomId: 'room-2', name: 'Room B', nickname: 'The Aquarium', bookingCount: 1, totalMinutes: 45 },
    ];
    getLeaderboard.mockResolvedValue(entries);

    renderWithClient();

    await waitFor(() => expect(screen.getByText('The Fridge')).toBeInTheDocument());
    expect(screen.getByText('🥇')).toBeInTheDocument();
    expect(screen.getByText('🥈')).toBeInTheDocument();
    expect(screen.getByText('2h 30m')).toBeInTheDocument();
    expect(screen.getByText('45m')).toBeInTheDocument();
    expect(getLeaderboard).toHaveBeenCalledWith('test-token');
  });

  it('shows an empty state when no room has been booked this month', async () => {
    getLeaderboard.mockResolvedValue([]);

    renderWithClient();

    await waitFor(() => expect(screen.getByText(/no bookings yet this month/i)).toBeInTheDocument());
  });
});
