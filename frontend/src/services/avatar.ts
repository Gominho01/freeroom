const DICEBEAR_URL = 'https://api.dicebear.com/9.x/avataaars/svg';

/** Builds a DiceBear avatar URL from a seed — no upload/storage needed, the
 * same seed always renders the same avatar. */
export function avatarUrl(seed: string): string {
  return `${DICEBEAR_URL}?seed=${encodeURIComponent(seed)}`;
}

export function randomSeed(): string {
  return Math.random().toString(36).slice(2, 10);
}
