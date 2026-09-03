import { request } from './http';
import type { AuthResponse } from '../types';

export function registerRequest(
  email: string,
  password: string,
  name: string,
  avatarSeed?: string,
): Promise<AuthResponse> {
  return request<AuthResponse>('/auth/register', undefined, {
    method: 'POST',
    body: JSON.stringify({ email, password, name, avatarSeed }),
  });
}

export function loginRequest(email: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>('/auth/login', undefined, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}
