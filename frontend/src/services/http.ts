const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3333';

/** Carries the HTTP status alongside the server's own message, so callers
 * can react to a specific status (e.g. offering a waitlist on a 409)
 * instead of matching on message text. */
export class ApiRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
  }
}

export async function request<T>(path: string, token?: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiRequestError(body.error?.message ?? `Request failed with status ${res.status}`, res.status);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}
