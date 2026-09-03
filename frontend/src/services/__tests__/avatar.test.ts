import { describe, expect, it } from 'vitest';
import { avatarUrl } from '../avatar';

describe('avatarUrl', () => {
  it('builds a DiceBear URL with the given seed', () => {
    expect(avatarUrl('jane-doe')).toBe('https://api.dicebear.com/9.x/avataaars/svg?seed=jane-doe');
  });

  it('encodes special characters in the seed', () => {
    expect(avatarUrl('jane doe & co')).toBe(
      'https://api.dicebear.com/9.x/avataaars/svg?seed=jane%20doe%20%26%20co',
    );
  });
});
