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
