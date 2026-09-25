import { prisma } from "../config/prisma.js";

export interface CurrentOccupant {
  bookingId: string;
  endsAt: string;
  user: {
    id: string;
    name: string;
    avatarSeed: string;
  };
}

/**
 * The room's occupant is derived entirely from the booking schedule — there
 * is no manual check-in/out. At any given instant, at most one booking can
 * be active per room (the API already rejects overlapping bookings).
 */
export async function getCurrentOccupant(roomId: string, now: Date = new Date()): Promise<CurrentOccupant | null> {
  const booking = await prisma.booking.findFirst({
    where: {
      roomId,
      startTime: { lte: now },
      endTime: { gt: now },
    },
    include: { user: true },
  });

  if (!booking) {
    return null;
  }

  return {
    bookingId: booking.id,
    endsAt: booking.endTime.toISOString(),
    user: {
      id: booking.user.id,
      name: booking.user.name,
      avatarSeed: booking.user.avatarSeed,
    },
  };
}
