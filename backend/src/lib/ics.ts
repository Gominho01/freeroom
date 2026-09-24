/** Minimal, dependency-free RFC 5545 (iCalendar) writer — one VEVENT per
 * call is all a single booking export needs, so a full library would be
 * more surface area than the feature warrants. */

function formatIcsDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

/** RFC 5545 requires folding lines longer than 75 octets, continued on the
 * next line with a leading space. */
function foldLine(line: string): string {
  const maxLen = 75;
  if (line.length <= maxLen) return line;

  const chunks: string[] = [];
  let rest = line;
  let first = true;
  while (rest.length > 0) {
    const size = first ? maxLen : maxLen - 1;
    chunks.push((first ? "" : " ") + rest.slice(0, size));
    rest = rest.slice(size);
    first = false;
  }
  return chunks.join("\r\n");
}

export interface IcsEventInput {
  uid: string;
  summary: string;
  location?: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  timestamp?: Date;
}

/** Builds a complete, single-event .ics file as a string (CRLF line
 * endings, per spec). */
export function buildBookingIcs(event: IcsEventInput): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//FreeRoom//Booking Export//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${event.uid}@freeroom`,
    `DTSTAMP:${formatIcsDate(event.timestamp ?? new Date())}`,
    `DTSTART:${formatIcsDate(event.startTime)}`,
    `DTEND:${formatIcsDate(event.endTime)}`,
    `SUMMARY:${escapeIcsText(event.summary)}`,
    ...(event.location ? [`LOCATION:${escapeIcsText(event.location)}`] : []),
    ...(event.description ? [`DESCRIPTION:${escapeIcsText(event.description)}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return lines.map(foldLine).join("\r\n") + "\r\n";
}
