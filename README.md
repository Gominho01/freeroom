# 🏢 FreeRoom — Meeting Room Booking API

> Status: **ideation** — this README documents the initial idea, feature scope, and technical decisions to serve as a reference as the project evolves.

## 1. Overview

REST API for booking meeting rooms: room registration, booking creation with automatic time-conflict detection, and role-based access control (admin vs. regular user). No frontend — the product here is the API itself, documented and tested as if it were going to production.

This project exists to show pure backend maturity: validation, authorization, integration tests with real coverage, and OpenAPI documentation — things a "pretty on screen" full-stack project usually doesn't showcase as well.

## 2. Features

### MVP (phase 1)

1. **Room CRUD** — name, capacity, amenities (projector, TV, etc.). Only admins can create/edit/delete.
2. **Create booking with conflict detection** — when booking a room for a time slot, the API rejects it if it overlaps with an existing booking for the same room (interval-overlap logic, the same family of problem as merge/interval-scheduling exercises).
3. **Filtered listing** — list bookings by room, by period, by user.
4. **Auth + role-based authorization** — JWT with two roles: `admin` (manages rooms) and `user` (only books/cancels their own bookings).

### Phase 2 (stretch goal)

1. **Email notifications** — booking confirmation and reminder close to the time, via Nodemailer (or a simple queue).
2. **Recurring bookings** — "every Monday at 10am for 4 weeks", reusing the same per-occurrence conflict-detection logic.
3. **Rate limiting** — limit requests per user/IP on creation routes, to simulate a public API scenario.

## 3. Stack

| Layer | Technology | Where it's used |
|---|---|---|
| Backend | Node + TypeScript + Express | All business logic and REST routes |
| Validation | Zod | Validate all input (room, booking, user) |
| Auth | JWT + role-based authorization middleware | Login and admin/user access control |
| Database | PostgreSQL + Prisma | Rooms, bookings, users |
| Documentation | OpenAPI/Swagger (`zod-to-openapi`) | `/docs` with a browsable Swagger UI, generated from the Zod schemas |
| Tests | Vitest + Supertest | End-to-end integration tests for the routes, including conflict cases |
| Local infra | Docker Compose | Containerized Postgres, single-command startup |
| CI/CD | GitHub Actions | Lint + tests with coverage + build on every push/PR |
| Deploy | Render or Railway | Needs an always-on server (not serverless), simple to set up |

## 4. Architecture

```
[Client (Swagger UI / Postman / Insomnia)] --(REST)--> [Node + Express API]
                                                              |-- Postgres (Prisma) — rooms, bookings, users
                                                              |-- Auth/role authorization middleware
                                                              |-- /docs — Swagger UI generated from the Zod schemas
```

No frontend in the MVP — the consumption interface is the Swagger documentation, which also serves as proof that the API is well specified.

## 5. Suggested roadmap

1. **Phase 0** — setup: Express + TS scaffold, local Postgres via Docker, Prisma schema (Room, Booking, User).
2. **Phase 1** — MVP: room CRUD, booking creation with conflict detection, auth + roles, integration tests covering conflict cases.
3. **Phase 2** — real deploy on Render/Railway + managed Postgres, published Swagger.
4. **Phase 3 (stretch)** — email notifications, recurring bookings, rate limiting.

## 6. Project structure (phase 0 — scaffold only, no logic)

```
freeroom/
├── docker-compose.yml         # local Postgres
├── .github/workflows/ci.yml   # lint + test (with coverage) + build
├── prisma/schema.prisma       # no models yet
└── src/
    ├── index.ts                # Express wiring
    ├── routes/  controllers/  services/  middlewares/  config/  lib/
    ├── docs/                   # OpenAPI generation from the Zod schemas
    └── __tests__/              # integration tests (Vitest + Supertest)
```

Run in dev:

```
docker compose up -d          # start Postgres
npm run dev                   # API at http://localhost:3333
# Swagger UI at http://localhost:3333/docs
```

## 7. Open decisions

- Conflict detection: reject the booking outright, or suggest the nearest free slots as part of the error response?
- Should recurring bookings already be modeled as individual records (simpler to test) or as a rule + on-demand generation?
