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
