import { OpenAPIRegistry, OpenApiGeneratorV3 } from "@asteasolutions/zod-to-openapi";
import { z } from "../lib/zod.js";
import { authResponseSchema, loginBodySchema, registerBodySchema } from "../schemas/auth.schema.js";

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
