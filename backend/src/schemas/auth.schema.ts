import { z } from "../lib/zod.js";

export const registerBodySchema = z
  .object({
    email: z.email().openapi({ example: "user@example.com" }),
    password: z.string().min(8).openapi({ example: "supersecret" }),
    name: z.string().min(1).openapi({ example: "Jane Doe" }),
  })
  .openapi("RegisterRequest");

export const loginBodySchema = z
  .object({
    email: z.email().openapi({ example: "user@example.com" }),
    password: z.string().min(1).openapi({ example: "supersecret" }),
  })
  .openapi("LoginRequest");

export const userResponseSchema = z
  .object({
    id: z.string(),
    email: z.email(),
    name: z.string(),
    role: z.enum(["ADMIN", "USER"]),
    createdAt: z.string(),
  })
  .openapi("User");

export const authResponseSchema = z
  .object({
    token: z.string(),
    user: userResponseSchema,
  })
  .openapi("AuthResponse");

export type RegisterBody = z.infer<typeof registerBodySchema>;
export type LoginBody = z.infer<typeof loginBodySchema>;
