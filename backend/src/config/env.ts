import "dotenv/config";

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 3333),
  databaseUrl: required("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/freeroom"),
  // No fallback: a silently-applied default secret would make every JWT
  // forgeable the moment someone forgets to set this in a real environment.
  jwtSecret: required("JWT_SECRET"),
  // Comma-separated allowed origins for CORS (both the REST API and
  // Socket.io). Unset in local dev, which keeps today's "allow any origin"
  // behavior; set to the deployed frontend's URL(s) in production.
  corsOrigin: process.env.CORS_ORIGIN,
};
