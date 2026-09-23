import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useState } from 'react';
import { listNotifications, markAllNotificationsRead } from '../services/notifications';
import { useAuthStore } from '../store/auth';

export function NotificationsBell() {
  const token = useAuthStore((s) => s.token)!;
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const notificationsQuery = useQuery({
    queryKey: ['notifications'],
    queryFn: () => listNotifications(token),
    // Reminders and waitlist notifications are triggered by background
    // events the viewer doesn't cause themselves, so polling is the only
    // way the bell picks them up without a manual reload.
    refetchInterval: 30_000,
  });

  const markReadMutation = useMutation({
    mutationFn: () => markAllNotificationsRead(token),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const notifications = notificationsQuery.data ?? [];
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="notifications-bell">
      <button type="button" className="link-button" onClick={() => setOpen((v) => !v)}>
        Notifications{unreadCount > 0 && <span className="notifications-badge">{unreadCount}</span>}
      </button>

      {open && (
        <div className="notifications-panel">
          <div className="notifications-panel-header">
            <h3>Notifications</h3>
            {unreadCount > 0 && (
              <button type="button" className="link-button" onClick={() => markReadMutation.mutate()}>
                Mark all read
              </button>
            )}
          </div>

          {notifications.length === 0 && <p className="rooms-status">Nothing yet.</p>}

          <ul className="notifications-list">
            {notifications.map((notification) => (
              <li key={notification.id} data-read={notification.read ? 'true' : 'false'}>
                <p className="notifications-message">{notification.message}</p>
                <p className="notifications-time">{format(new Date(notification.createdAt), 'MMM d, HH:mm')}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
