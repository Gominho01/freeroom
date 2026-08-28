import bcrypt from "bcryptjs";
import type { User } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { signToken } from "../lib/jwt.js";
import { ConflictError, UnauthorizedError } from "../lib/errors.js";
import type { LoginBody, RegisterBody } from "../schemas/auth.schema.js";

const SALT_ROUNDS = 10;

export function toUserResponse(user: User) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
  };
}

export async function registerUser(data: RegisterBody) {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    throw new ConflictError("Email already in use");
  }

  const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);
  const user = await prisma.user.create({
    data: {
      email: data.email,
      password: hashedPassword,
      name: data.name,
    },
  });

  const token = signToken({ id: user.id, role: user.role });
  return { token, user };
}

export async function loginUser(data: LoginBody) {
  const user = await prisma.user.findUnique({ where: { email: data.email } });
  if (!user) {
    throw new UnauthorizedError("Invalid email or password");
  }

  const isValid = await bcrypt.compare(data.password, user.password);
  if (!isValid) {
    throw new UnauthorizedError("Invalid email or password");
  }

  const token = signToken({ id: user.id, role: user.role });
  return { token, user };
}
