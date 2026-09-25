import type { Request, Response } from "express";
import { UnauthorizedError } from "../lib/errors.js";
import { buildBookingIcs } from "../lib/ics.js";
import * as bookingService from "../services/booking.service.js";
import * as waitlistService from "../services/waitlist.service.js";
import type { CreateBookingBody, ListBookingsQuery } from "../schemas/booking.schema.js";

function requireUser(req: Request) {
  if (!req.user) {
    throw new UnauthorizedError();
  }
  return req.user;
}

export async function create(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const body = req.body as CreateBookingBody;

  if (body.recurrence) {
    const bookings = await bookingService.createRecurringBooking({
      roomId: body.roomId,
      userId: user.id,
      startTime: new Date(body.startTime),
      endTime: new Date(body.endTime),
      occurrences: body.recurrence.occurrences,
    });
    res.status(201).json(bookings);
    return;
  }

  const booking = await bookingService.createBooking({
    roomId: body.roomId,
    userId: user.id,
    startTime: new Date(body.startTime),
    endTime: new Date(body.endTime),
  });

  res.status(201).json(booking);
}

export async function list(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const query = req.query as unknown as ListBookingsQuery;

  // Non-admins only ever see their own bookings, regardless of the
  // `userId` filter they may have passed.
  const userId = user.role === "ADMIN" ? query.userId : user.id;

  const bookings = await bookingService.listBookings({
    roomId: query.roomId,
    userId,
    from: query.from ? new Date(query.from) : undefined,
    to: query.to ? new Date(query.to) : undefined,
  });

  res.status(200).json(bookings);
}

export async function exportIcs(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const booking = await bookingService.getBookingForExport(req.params.id as string, user);

  const ics = buildBookingIcs({
    uid: booking.id,
    summary: `${booking.room.nickname} — FreeRoom booking`,
    location: booking.room.name,
    startTime: booking.startTime,
    endTime: booking.endTime,
  });

  const filename = booking.room.nickname.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "booking";
  res.setHeader("Content-Type", "text/calendar; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}.ics"`);
  res.status(200).send(ics);
}

export async function remove(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const booking = await bookingService.cancelBooking(req.params.id as string, user);
  await waitlistService.fulfillWaitlistForFreedSlot(booking.roomId, booking);
  res.status(204).send();
}

export async function removeSeries(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const bookings = await bookingService.cancelBookingSeries(req.params.recurrenceId as string, user);
  for (const booking of bookings) {
    await waitlistService.fulfillWaitlistForFreedSlot(booking.roomId, booking);
  }
  res.status(204).send();
}
