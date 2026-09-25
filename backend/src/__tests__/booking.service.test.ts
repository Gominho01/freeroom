import { describe, expect, it } from "vitest";
import { findConflict, formatRange, rangesOverlap, weeklyOccurrences } from "../services/booking.service.js";

// Pure functions — no database required, these run and pass without a live
// Postgres instance.

describe("rangesOverlap", () => {
  it("returns true when ranges overlap", () => {
    const a = { startTime: new Date("2026-01-01T10:00:00Z"), endTime: new Date("2026-01-01T11:00:00Z") };
    const b = { startTime: new Date("2026-01-01T10:30:00Z"), endTime: new Date("2026-01-01T11:30:00Z") };

    expect(rangesOverlap(a, b)).toBe(true);
  });

  it("returns false for back-to-back ranges (touching, not overlapping)", () => {
    const a = { startTime: new Date("2026-01-01T10:00:00Z"), endTime: new Date("2026-01-01T11:00:00Z") };
    const b = { startTime: new Date("2026-01-01T11:00:00Z"), endTime: new Date("2026-01-01T12:00:00Z") };

    expect(rangesOverlap(a, b)).toBe(false);
  });

  it("returns false for ranges that don't overlap at all", () => {
    const a = { startTime: new Date("2026-01-01T10:00:00Z"), endTime: new Date("2026-01-01T11:00:00Z") };
    const b = { startTime: new Date("2026-01-01T12:00:00Z"), endTime: new Date("2026-01-01T13:00:00Z") };

    expect(rangesOverlap(a, b)).toBe(false);
  });

  it("returns true when one range fully contains another", () => {
    const a = { startTime: new Date("2026-01-01T09:00:00Z"), endTime: new Date("2026-01-01T13:00:00Z") };
    const b = { startTime: new Date("2026-01-01T10:00:00Z"), endTime: new Date("2026-01-01T11:00:00Z") };

    expect(rangesOverlap(a, b)).toBe(true);
  });

  it("is symmetric", () => {
    const a = { startTime: new Date("2026-01-01T10:00:00Z"), endTime: new Date("2026-01-01T11:00:00Z") };
    const b = { startTime: new Date("2026-01-01T10:30:00Z"), endTime: new Date("2026-01-01T11:30:00Z") };

    expect(rangesOverlap(a, b)).toBe(rangesOverlap(b, a));
  });
});

describe("findConflict", () => {
  it("finds the overlapping booking among existing ones", () => {
    const candidate = { startTime: new Date("2026-01-01T10:30:00Z"), endTime: new Date("2026-01-01T11:30:00Z") };
    const existing = [
      { id: "1", startTime: new Date("2026-01-01T08:00:00Z"), endTime: new Date("2026-01-01T09:00:00Z") },
      { id: "2", startTime: new Date("2026-01-01T10:00:00Z"), endTime: new Date("2026-01-01T11:00:00Z") },
    ];

    expect(findConflict(candidate, existing)?.id).toBe("2");
  });

  it("returns undefined when there is no conflict", () => {
    const candidate = { startTime: new Date("2026-01-01T12:00:00Z"), endTime: new Date("2026-01-01T13:00:00Z") };
    const existing = [
      { id: "1", startTime: new Date("2026-01-01T08:00:00Z"), endTime: new Date("2026-01-01T09:00:00Z") },
    ];

    expect(findConflict(candidate, existing)).toBeUndefined();
  });

  it("returns undefined for an empty booking list", () => {
    const candidate = { startTime: new Date("2026-01-01T12:00:00Z"), endTime: new Date("2026-01-01T13:00:00Z") };

    expect(findConflict(candidate, [])).toBeUndefined();
  });
});

describe("weeklyOccurrences", () => {
  it("generates the requested number of occurrences, one week apart", () => {
    const start = new Date("2026-01-05T10:00:00Z"); // a Monday
    const end = new Date("2026-01-05T11:00:00Z");

    const occurrences = weeklyOccurrences(start, end, 3);

    expect(occurrences).toEqual([
      { startTime: new Date("2026-01-05T10:00:00Z"), endTime: new Date("2026-01-05T11:00:00Z") },
      { startTime: new Date("2026-01-12T10:00:00Z"), endTime: new Date("2026-01-12T11:00:00Z") },
      { startTime: new Date("2026-01-19T10:00:00Z"), endTime: new Date("2026-01-19T11:00:00Z") },
    ]);
  });

  it("preserves the original duration on every occurrence", () => {
    const start = new Date("2026-01-05T10:00:00Z");
    const end = new Date("2026-01-05T11:30:00Z");

    const occurrences = weeklyOccurrences(start, end, 4);

    for (const occurrence of occurrences) {
      expect(occurrence.endTime.getTime() - occurrence.startTime.getTime()).toBe(90 * 60 * 1000);
    }
  });

  it("returns a single occurrence when count is 1", () => {
    const start = new Date("2026-01-05T10:00:00Z");
    const end = new Date("2026-01-05T11:00:00Z");

    expect(weeklyOccurrences(start, end, 1)).toEqual([{ startTime: start, endTime: end }]);
  });
});

describe("formatRange", () => {
  it("formats a date and time range in UTC, independent of the local timezone", () => {
    const start = new Date("2030-01-07T10:00:00.000Z");
    const end = new Date("2030-01-07T11:30:00.000Z");

    expect(formatRange(start, end)).toBe("2030-01-07, 10:00–11:30");
  });
});
