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

/** Like `request`, but for a non-JSON file response (e.g. a .ics download) —
 * returns the raw blob plus the filename the server suggested. */
export async function requestFile(path: string, token?: string): Promise<{ blob: Blob; filename: string }> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiRequestError(body.error?.message ?? `Request failed with status ${res.status}`, res.status);
  }

  const match = /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') ?? '');
  return { blob: await res.blob(), filename: match?.[1] ?? 'download' };
}
