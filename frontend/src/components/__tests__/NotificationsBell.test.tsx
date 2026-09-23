import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Notification } from '../../types';

const listNotifications = vi.fn();
const markAllNotificationsRead = vi.fn();

vi.mock('../../services/notifications', () => ({
  listNotifications: (...args: unknown[]) => listNotifications(...args),
  markAllNotificationsRead: (...args: unknown[]) => markAllNotificationsRead(...args),
}));

vi.mock('../../store/auth', () => ({
  useAuthStore: (selector: (state: { token: string }) => unknown) => selector({ token: 'test-token' }),
}));

import { NotificationsBell } from '../NotificationsBell';

function renderWithClient() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NotificationsBell />
    </QueryClientProvider>,
  );
}

const notifications: Notification[] = [
  { id: 'n1', type: 'BOOKING_CONFIRMED', message: 'Booked The Fridge.', read: false, createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'n2', type: 'BOOKING_REMINDER', message: 'The Fridge starts soon.', read: true, createdAt: '2026-01-01T00:00:00.000Z' },
];

describe('NotificationsBell', () => {
  beforeEach(() => {
    listNotifications.mockReset();
    markAllNotificationsRead.mockReset();
  });

  it('shows the unread count on the bell', async () => {
    listNotifications.mockResolvedValue(notifications);

    renderWithClient();

    await waitFor(() => expect(screen.getByText('1')).toBeInTheDocument());
  });

  it('opens a panel listing every notification when clicked', async () => {
    listNotifications.mockResolvedValue(notifications);

    renderWithClient();

    fireEvent.click(screen.getByRole('button', { name: /notifications/i }));

    await waitFor(() => expect(screen.getByText('Booked The Fridge.')).toBeInTheDocument());
    expect(screen.getByText('The Fridge starts soon.')).toBeInTheDocument();
  });

  it('marks everything read', async () => {
    listNotifications.mockResolvedValue(notifications);
    markAllNotificationsRead.mockResolvedValue(undefined);

    renderWithClient();

    fireEvent.click(screen.getByRole('button', { name: /notifications/i }));
    await waitFor(() => expect(screen.getByText('Booked The Fridge.')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /mark all read/i }));

    await waitFor(() => expect(markAllNotificationsRead).toHaveBeenCalledWith('test-token'));
  });

  it('shows an empty state when there are no notifications', async () => {
    listNotifications.mockResolvedValue([]);

    renderWithClient();

    fireEvent.click(screen.getByRole('button', { name: /notifications/i }));

    await waitFor(() => expect(screen.getByText(/nothing yet/i)).toBeInTheDocument());
  });
});
