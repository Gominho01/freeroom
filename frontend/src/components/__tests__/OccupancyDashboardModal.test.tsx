import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { OccupancyEntry } from '../../types';

const getOccupancy = vi.fn();

vi.mock('../../services/analytics', () => ({
  getOccupancy: (...args: unknown[]) => getOccupancy(...args),
}));

vi.mock('../../store/auth', () => ({
  useAuthStore: (selector: (state: { token: string }) => unknown) => selector({ token: 'test-token' }),
}));

import { OccupancyDashboardModal } from '../OccupancyDashboardModal';

function renderWithClient() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <OccupancyDashboardModal onClose={vi.fn()} />
    </QueryClientProvider>,
  );
}

describe('OccupancyDashboardModal', () => {
  beforeEach(() => {
    getOccupancy.mockReset();
  });

  it('renders a bar per day of week for each room', async () => {
    const entries: OccupancyEntry[] = [
      {
        roomId: 'room-1',
        name: 'Conference Room A',
        nickname: 'The Fridge',
        minutesByDay: { Sun: 0, Mon: 120, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0 },
      },
    ];
    getOccupancy.mockResolvedValue(entries);

    renderWithClient();

    await waitFor(() => expect(screen.getByText('The Fridge')).toBeInTheDocument());
    expect(screen.getByTitle('Mon: 120 min')).toBeInTheDocument();
    expect(getOccupancy).toHaveBeenCalledWith('test-token');
  });

  it('shows an empty state when there are no bookings', async () => {
    getOccupancy.mockResolvedValue([]);

    renderWithClient();

    await waitFor(() => expect(screen.getByText(/no bookings recorded yet/i)).toBeInTheDocument());
  });
});
