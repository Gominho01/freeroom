import { OpenAPIRegistry, OpenApiGeneratorV3 } from "@asteasolutions/zod-to-openapi";
import { z } from "../lib/zod.js";
import { authResponseSchema, loginBodySchema, registerBodySchema } from "../schemas/auth.schema.js";
import {
  createRoomBodySchema,
  roomIdParamsSchema,
  roomResponseSchema,
  updateRoomBodySchema,
} from "../schemas/room.schema.js";

const registry = new OpenAPIRegistry();

const bearerAuth = registry.registerComponent("securitySchemes", "bearerAuth", {
  type: "http",
  scheme: "bearer",
  bearerFormat: "JWT",
});

const authenticated = [{ [bearerAuth.name]: [] }];

const errorResponseSchema = registry.register(
  "ErrorResponse",
  z.object({
    error: z.object({
      message: z.string(),
      details: z.unknown().optional(),
    }),
  }),
);

function jsonContent(schema: z.ZodType) {
  return { content: { "application/json": { schema } } };
}

// --- Auth ---

registry.registerPath({
  method: "post",
  path: "/auth/register",
  tags: ["Auth"],
  request: { body: jsonContent(registerBodySchema) },
  responses: {
    201: { description: "User registered", ...jsonContent(authResponseSchema) },
    409: { description: "Email already in use", ...jsonContent(errorResponseSchema) },
  },
});

registry.registerPath({
  method: "post",
  path: "/auth/login",
  tags: ["Auth"],
  request: { body: jsonContent(loginBodySchema) },
  responses: {
    200: { description: "Login successful", ...jsonContent(authResponseSchema) },
    401: { description: "Invalid credentials", ...jsonContent(errorResponseSchema) },
  },
});

// --- Rooms ---

registry.registerPath({
  method: "get",
  path: "/rooms",
  tags: ["Rooms"],
  security: authenticated,
  responses: {
    200: { description: "List of rooms", ...jsonContent(z.array(roomResponseSchema)) },
    401: { description: "Unauthorized", ...jsonContent(errorResponseSchema) },
  },
});

registry.registerPath({
  method: "get",
  path: "/rooms/{id}",
  tags: ["Rooms"],
  security: authenticated,
  request: { params: roomIdParamsSchema },
  responses: {
    200: { description: "Room found", ...jsonContent(roomResponseSchema) },
    404: { description: "Room not found", ...jsonContent(errorResponseSchema) },
  },
});

registry.registerPath({
  method: "post",
  path: "/rooms",
  tags: ["Rooms"],
  security: authenticated,
  request: { body: jsonContent(createRoomBodySchema) },
  responses: {
    201: { description: "Room created", ...jsonContent(roomResponseSchema) },
    400: { description: "Validation error", ...jsonContent(errorResponseSchema) },
    403: { description: "Admin role required", ...jsonContent(errorResponseSchema) },
  },
});

registry.registerPath({
  method: "put",
  path: "/rooms/{id}",
  tags: ["Rooms"],
  security: authenticated,
  request: { params: roomIdParamsSchema, body: jsonContent(updateRoomBodySchema) },
  responses: {
    200: { description: "Room updated", ...jsonContent(roomResponseSchema) },
    403: { description: "Admin role required", ...jsonContent(errorResponseSchema) },
    404: { description: "Room not found", ...jsonContent(errorResponseSchema) },
  },
});

registry.registerPath({
  method: "delete",
  path: "/rooms/{id}",
  tags: ["Rooms"],
  security: authenticated,
  request: { params: roomIdParamsSchema },
  responses: {
    204: { description: "Room deleted" },
    403: { description: "Admin role required", ...jsonContent(errorResponseSchema) },
    404: { description: "Room not found", ...jsonContent(errorResponseSchema) },
  },
});

export function generateOpenApiDocument() {
  const generator = new OpenApiGeneratorV3(registry.definitions);

  return generator.generateDocument({
    openapi: "3.0.0",
    info: {
      title: "FreeRoom API",
      version: "0.1.0",
      description: "Meeting room booking API.",
    },
    servers: [{ url: "/" }],
  });
}
