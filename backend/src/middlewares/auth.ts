import type { NextFunction, Request, Response } from "express";
import type { Role } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { verifyToken } from "../lib/jwt.js";
import { ForbiddenError, UnauthorizedError } from "../lib/errors.js";

export interface AuthUser {
  id: string;
  role: Role;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    throw new UnauthorizedError("Missing or invalid Authorization header");
  }

  const token = header.slice("Bearer ".length);

  let userId: string;
  try {
    userId = verifyToken(token).id;
  } catch {
    throw new UnauthorizedError("Invalid or expired token");
  }

  // The JWT signature alone doesn't prove the account still exists (or
  // still has the role it had when the token was issued) — a deleted user
  // would otherwise surface as a raw DB error on their next write instead
  // of a clean "please log in again".
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true } });
  if (!user) {
    throw new UnauthorizedError("Your session is no longer valid — please log in again");
  }

  req.user = { id: user.id, role: user.role };
  next();
}

export function requireRole(role: Role) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError();
    }

    if (req.user.role !== role) {
      throw new ForbiddenError(`Requires role: ${role}`);
    }

    next();
  };
}
