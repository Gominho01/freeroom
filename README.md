# SalaLivre — Meeting Room Booking System

**Status:** 🚧 Planning / not yet implemented

## Overview

SalaLivre is a meeting room booking system: room catalog, availability calendar, conflict-safe scheduling, and role-based access control.

Beyond the standard CRUD-plus-calendar booking app, each room has a "profile" — a nickname and a couple of known quirks (the room with a broken AC, the one with weak Wi-Fi) — and the room's live view shows the avatar of whoever currently holds the active booking, switching automatically as the schedule progresses. The occupant display is driven entirely by the schedule, not by manual check-in — there is no presence detection to manage, no connect/disconnect logic, and no "I've arrived" button. If a booking says a room is occupied from 1:00 to 1:30 PM, that's what the room shows.

## Features

### MVP

- **User profile with avatar** — users pick an avatar (seed-based generation via DiceBear) on signup, no file upload/storage required.
- **Room catalog with profile** — name, capacity, amenities (projector, TV, etc.), plus an admin-defined nickname/trait shown as the room's identity in the UI.
- **Availability calendar** — weekly view per room (`react-big-calendar`); booked slots appear blocked, clicking an open slot opens the booking form.
- **Conflict detection** — the API rejects overlapping bookings for the same room (interval-overlap logic); the frontend reflects this immediately, without waiting on a server error.
- **Live room view** — shows the avatar of whoever's booking is active right now, computed from the schedule. When one booking ends and the next begins back-to-back, the current occupant's avatar exits and the next one enters through a short door animation, visible in real time to anyone with that room's screen open. An empty room (no active booking) shows its own idle state.
- **My bookings** — list of the user's own bookings with date-range filtering, and cancellation.
- **Auth + role-based access** — login; admin dashboard (manages rooms and profiles) vs. regular user area (books/cancels their own bookings only).

### Roadmap / stretch goals

- **Usage leaderboard** — a lighthearted "busiest room this month" board (ranks rooms, not people).
- **Email notifications** — booking confirmation and reminders via Nodemailer, matching the app's tone of voice.
- **Recurring bookings** — e.g. "every Monday at 10am for 4 weeks," reusing the same conflict-detection logic per occurrence.
- **Rate limiting** — per-user/IP limits on booking-creation routes.

## Design Direction

The signature animated moment is the **occupant handoff at the room door** — that's where the app spends its one piece of visual boldness. Everything else (calendar, forms, booking confirmation) stays quiet and functional; confirming a booking gets simple, direct feedback rather than competing for attention with the door animation.

- **Palette:** a neutral, readable base (slate `#2B2D31`, off-white `#FAF9F6`) with a single vivid accent used on room profiles and the door animation (e.g. warm coral `#FF6B4A` or lime `#B8E23D` — pick one, not both).
- **Typography:** a display face with some personality for room nicknames, paired with a neutral utility face (Inter or similar) for tables, forms, and the calendar.
- **Microcopy:** written in the room's voice — "Sala Geladeira now hosting Ana until 3pm. Bring a jacket." rather than "Occupied."
- **Empty state:** an unoccupied room gets its own calm illustration (closed door, light off) rather than a blank space.

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React + TypeScript (Vite, SPA) | Calendar, room profiles, live room view, dashboards |
| Calendar | `react-big-calendar` (or FullCalendar) | Weekly/monthly booking view per room |
| Avatars | DiceBear (seed-based generation) | User avatars without upload/storage |
| Animation | Framer Motion | The door handoff — the app's one orchestrated animation |
| Real-time | Socket.io (client + server) | Broadcasts the current occupant of each room to anyone with that screen open |
| Transition scheduling | `node-cron` (per-minute check) or per-booking `setTimeout` | Triggers the occupant-switch event at each booking's start/end time |
| State/cache | React Query | Caches reads (rooms, bookings) and revalidates after booking/cancelling |
| Backend | Node + TypeScript + Express | Business logic and REST routes |
| Validation | Zod | Validates all input (room, booking, user, room profile) |
| Auth | JWT + role-based authorization middleware | Login and admin/user access control |
| Database | PostgreSQL + Prisma | Rooms (with profile), bookings, users (with avatar) |
| API docs | OpenAPI/Swagger (`zod-to-openapi` or `swagger-jsdoc`) | `/docs` with Swagger UI, generated from the Zod schemas |
| Testing | Vitest + Testing Library (frontend) · Vitest + Supertest (backend) | Integration tests for booking routes (including conflict handling) and for the current-occupant logic |
| Local infra | Docker Compose | Postgres containerized, one command to start |
| CI/CD | GitHub Actions | Lint + test + build on every push/PR |
| Deploy | Frontend on Vercel · Backend on Render or Railway | Backend needs a long-lived process (Socket.io doesn't fit a serverless model) |

## Architecture

```
[React + TS (SPA) — calendar + live room view + dashboards] --(REST + Socket.io)--> [Node + Express API]
                                                                                          |-- Postgres (Prisma) — rooms (+profile), bookings, users (+avatar)
                                                                                          |-- Scheduler — watches booking start/end times, emits occupant changes
                                                                                          |-- Per-room socket channel (room:<id>) — broadcasts current occupant
                                                                                          |-- Auth/role authorization middleware
                                                                                          |-- /docs — Swagger UI generated from Zod schemas
```

The socket layer here only pushes state that's already fully determined by the schedule — there's no presence tracking or disconnect handling, just a broadcast at each transition.

## Roadmap

1. **Phase 0** — scaffolding: Express + TS setup, Vite + TS setup, Postgres via Docker, Prisma schema (Room + profile, Booking, User + avatar).
2. **Phase 1** — MVP: rooms with profiles, user avatars, availability calendar, conflict-safe booking, live room view with door animation, "my bookings," auth + roles.
3. **Phase 2** — production deploy (frontend on Vercel, backend on Render/Railway) + managed Postgres, Swagger published.
4. **Phase 3 (stretch)** — usage leaderboard, email notifications, recurring bookings, rate limiting.

## Project Structure (scaffold only, no logic yet)

```
salalivre/
├── docker-compose.yml         # local Postgres
├── .github/workflows/ci.yml   # lint + test + build (frontend and backend)
├── backend/
│   ├── prisma/schema.prisma   # no models yet
│   └── src/
│       ├── index.ts           # Express + Socket.io server wiring
│       ├── scheduler/          # booking start/end checks -> occupant-change events
│       ├── sockets/             # room:<id> channel handlers
│       ├── routes/  controllers/  services/  middlewares/  config/
│       ├── docs/               # OpenAPI generation from Zod schemas
│       └── __tests__/          # integration tests (Vitest + Supertest)
└── frontend/
    └── src/
        ├── components/  pages/  hooks/  services/  types/
        ├── calendar/            # availability calendar components
        └── room-live/           # live room view + door handoff animation
```

## Getting Started

```
docker compose up -d           # start Postgres
cd backend  && npm run dev     # API + Socket.io at http://localhost:3333 (Swagger at /docs)
cd frontend && npm run dev     # Vite at http://localhost:5173
```

## Open Questions

- Transition-check granularity: per-minute `node-cron` (simpler) vs. per-booking `setTimeout` (more precise, more state to manage).
- Calendar library: `react-big-calendar` vs. FullCalendar.
- Single accent color: warm coral or lime.
- Whether to label the live occupant display as "Scheduled occupancy" to make clear it reflects the calendar, not detected physical presence.
