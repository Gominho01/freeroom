export interface User {
  id: string;
  email: string;
  name: string;
  avatarSeed: string;
  role: 'ADMIN' | 'USER';
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Room {
  id: string;
  name: string;
  nickname: string;
  quirks: string[];
  capacity: number;
  amenities: string[];
  createdAt: string;
}

export interface RoomInput {
  name: string;
  nickname: string;
  quirks: string[];
  capacity: number;
  amenities: string[];
}

export interface Booking {
  id: string;
  roomId: string;
  userId: string;
  startTime: string;
  endTime: string;
  createdAt: string;
  // Set on every occurrence of a recurring booking, sharing one value per
  // series — null/absent for a one-off.
  recurrenceId?: string | null;
  // Only populated by GET /bookings, where an admin can see every user's
  // bookings at once.
  user?: { id: string; name: string };
}

export interface Occupant {
  bookingId: string;
  endsAt: string;
  user: {
    id: string;
    name: string;
    avatarSeed: string;
  };
}

export interface LeaderboardEntry {
  roomId: string;
  name: string;
  nickname: string;
  bookingCount: number;
  totalMinutes: number;
}

export type DayOfWeek = 'Sun' | 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat';

export interface OccupancyEntry {
  roomId: string;
  name: string;
  nickname: string;
  minutesByDay: Record<DayOfWeek, number>;
}

export interface WorldPlayer {
  id: string;
  name: string;
  avatarSeed: string;
  x: number;
  y: number;
}

export type NotificationType = 'BOOKING_CONFIRMED' | 'BOOKING_REMINDER' | 'WAITLIST_AVAILABLE';

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface WaitlistEntry {
  id: string;
  roomId: string;
  userId: string;
  startTime: string;
  endTime: string;
  createdAt: string;
  room?: { id: string; nickname: string };
}
