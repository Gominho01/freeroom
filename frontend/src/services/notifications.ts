import { request } from './http';
import type { Notification } from '../types';

export function listNotifications(token: string): Promise<Notification[]> {
  return request<Notification[]>('/notifications', token);
}

export function markAllNotificationsRead(token: string): Promise<void> {
  return request<void>('/notifications/read', token, { method: 'POST' });
}
