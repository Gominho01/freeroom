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
