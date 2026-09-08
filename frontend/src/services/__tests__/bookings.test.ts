import { describe, expect, it } from 'vitest';
import { rangesOverlap } from '../bookings';

describe('rangesOverlap', () => {
  it('returns true when ranges overlap', () => {
    const a = { start: new Date('2026-01-01T10:00:00Z'), end: new Date('2026-01-01T11:00:00Z') };
    const b = { start: new Date('2026-01-01T10:30:00Z'), end: new Date('2026-01-01T11:30:00Z') };

    expect(rangesOverlap(a, b)).toBe(true);
  });

  it('returns false for back-to-back ranges (touching, not overlapping)', () => {
    const a = { start: new Date('2026-01-01T10:00:00Z'), end: new Date('2026-01-01T11:00:00Z') };
    const b = { start: new Date('2026-01-01T11:00:00Z'), end: new Date('2026-01-01T12:00:00Z') };

    expect(rangesOverlap(a, b)).toBe(false);
  });

  it('returns false for ranges that do not overlap at all', () => {
    const a = { start: new Date('2026-01-01T10:00:00Z'), end: new Date('2026-01-01T11:00:00Z') };
    const b = { start: new Date('2026-01-01T12:00:00Z'), end: new Date('2026-01-01T13:00:00Z') };

    expect(rangesOverlap(a, b)).toBe(false);
  });

  it('returns true when one range fully contains another', () => {
    const a = { start: new Date('2026-01-01T09:00:00Z'), end: new Date('2026-01-01T13:00:00Z') };
    const b = { start: new Date('2026-01-01T10:00:00Z'), end: new Date('2026-01-01T11:00:00Z') };

    expect(rangesOverlap(a, b)).toBe(true);
  });

  it('is symmetric', () => {
    const a = { start: new Date('2026-01-01T10:00:00Z'), end: new Date('2026-01-01T11:00:00Z') };
    const b = { start: new Date('2026-01-01T10:30:00Z'), end: new Date('2026-01-01T11:30:00Z') };

    expect(rangesOverlap(a, b)).toBe(rangesOverlap(b, a));
  });
});
