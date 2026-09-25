import { describe, expect, it } from "vitest";
import { buildBookingIcs } from "../lib/ics.js";

describe("buildBookingIcs", () => {
  it("builds a well-formed single-event VCALENDAR with CRLF line endings", () => {
    const ics = buildBookingIcs({
      uid: "booking-1",
      summary: "The Fridge — FreeRoom booking",
      location: "Conference Room A",
      startTime: new Date("2030-01-07T10:00:00.000Z"),
      endTime: new Date("2030-01-07T11:00:00.000Z"),
      timestamp: new Date("2030-01-01T00:00:00.000Z"),
    });

    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics).toContain("UID:booking-1@freeroom\r\n");
    expect(ics).toContain("DTSTAMP:20300101T000000Z\r\n");
    expect(ics).toContain("DTSTART:20300107T100000Z\r\n");
    expect(ics).toContain("DTEND:20300107T110000Z\r\n");
    expect(ics).toContain("SUMMARY:The Fridge — FreeRoom booking\r\n");
    expect(ics).toContain("LOCATION:Conference Room A\r\n");
  });

  it("omits LOCATION and DESCRIPTION when not provided", () => {
    const ics = buildBookingIcs({
      uid: "booking-2",
      summary: "Booking",
      startTime: new Date("2030-01-07T10:00:00.000Z"),
      endTime: new Date("2030-01-07T11:00:00.000Z"),
    });

    expect(ics).not.toContain("LOCATION:");
    expect(ics).not.toContain("DESCRIPTION:");
  });

  it("escapes commas, semicolons, and backslashes in text fields", () => {
    const ics = buildBookingIcs({
      uid: "booking-3",
      summary: 'Room "A, B; C\\D"',
      startTime: new Date("2030-01-07T10:00:00.000Z"),
      endTime: new Date("2030-01-07T11:00:00.000Z"),
    });

    expect(ics).toContain('SUMMARY:Room "A\\, B\\; C\\\\D"\r\n');
  });

  it("folds lines longer than 75 octets, continuing with a leading space", () => {
    const longSummary = "A".repeat(100);
    const ics = buildBookingIcs({
      uid: "booking-4",
      summary: longSummary,
      startTime: new Date("2030-01-07T10:00:00.000Z"),
      endTime: new Date("2030-01-07T11:00:00.000Z"),
    });

    const summaryLine = ics.split("\r\n").find((line) => line.startsWith("SUMMARY:"));
    expect(summaryLine?.length).toBeLessThanOrEqual(75);
    expect(ics).toContain("\r\n A");
  });
});
