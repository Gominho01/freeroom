import cors from "cors";
import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import swaggerUi from "swagger-ui-express";
import { env } from "./config/env.js";
import { generateOpenApiDocument } from "./docs/openapi.js";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler.js";
import { router } from "./routes/index.js";
import { sendDueReminders } from "./services/booking.service.js";
import { registerSocketHandlers } from "./sockets/index.js";

const REMINDER_POLL_INTERVAL_MS = 60_000;

export const app = express();

const allowedOrigins = env.corsOrigin?.split(",").map((origin) => origin.trim());

// Content-Disposition isn't one of the CORS "safe" response headers, so it's
// invisible to frontend JS (fetch's Content-Disposition read) unless
// explicitly exposed — needed for the .ics download to get its real filename
// instead of the browser's generic fallback.
app.use(
  cors({
    ...(allowedOrigins ? { origin: allowedOrigins } : {}),
    exposedHeaders: ["Content-Disposition"],
  }),
);
app.use(express.json());
app.use(router);
app.use("/docs", swaggerUi.serve, swaggerUi.setup(generateOpenApiDocument()));
app.use(notFoundHandler);
app.use(errorHandler);

// Route tests (health/auth/rooms/bookings) hit `app` directly via supertest
// and don't need a live server or the occupancy poller; the socket layer
// gets its own httpServer + io in sockets.test.ts instead.
if (process.env.NODE_ENV !== "test") {
  const httpServer = createServer(app);
  const io = new Server(httpServer, { cors: { origin: allowedOrigins ?? "*" } });
  registerSocketHandlers(io);

  httpServer.listen(env.port, () => {
    console.log(`FreeRoom API + Socket.io running at http://localhost:${env.port}`);
    console.log(`Swagger UI at http://localhost:${env.port}/docs`);
  });

  setInterval(() => {
    sendDueReminders().catch((err) => console.error("sendDueReminders failed", err));
  }, REMINDER_POLL_INTERVAL_MS);
}
