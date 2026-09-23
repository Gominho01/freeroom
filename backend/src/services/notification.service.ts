import type { NotificationType } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { sendEmail } from "../lib/mailer.js";

export interface NotifyParams {
  userId: string;
  type: NotificationType;
  message: string;
  email: { subject: string; text: string };
}

/**
 * Records an in-app notification and fires the matching email together —
 * callers never create one without the other, so the two can't drift out
 * of sync with each other.
 */
export async function notify(params: NotifyParams): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: params.userId }, select: { email: true } });
  if (!user) return;

  await prisma.notification.create({
    data: { userId: params.userId, type: params.type, message: params.message },
  });

  await sendEmail({ to: user.email, subject: params.email.subject, text: params.email.text });
}

export function listNotifications(userId: string) {
  return prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  await prisma.notification.updateMany({ where: { userId, read: false }, data: { read: true } });
}
