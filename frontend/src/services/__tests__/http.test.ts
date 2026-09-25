import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiRequestError, request } from '../http';

function mockFetchOnce(status: number, body: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(body),
    }),
  );
}

describe('request', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('throws the server-provided message, not the raw error object', async () => {
    mockFetchOnce(409, { error: { message: 'This time overlaps an existing booking.' } });

    await expect(request('/bookings')).rejects.toThrow('This time overlaps an existing booking.');
  });

  it('falls back to a generic message when the error body has no message', async () => {
    mockFetchOnce(500, {});

    await expect(request('/bookings')).rejects.toThrow('Request failed with status 500');
  });

  it('falls back to a generic message when the body is not valid JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error('not json')),
      }),
    );

    await expect(request('/bookings')).rejects.toThrow('Request failed with status 500');
  });

  it('carries the HTTP status on the thrown error, so callers can branch on it', async () => {
    mockFetchOnce(409, { error: { message: 'This time overlaps an existing booking.' } });

    try {
      await request('/bookings');
      expect.unreachable('request should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiRequestError);
      expect((err as ApiRequestError).status).toBe(409);
    }
  });
});
