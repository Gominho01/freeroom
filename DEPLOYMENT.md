# Deploying FreeRoom

Three separate services, all with a free tier:

- **Database** — [Neon](https://neon.tech) or [Supabase](https://supabase.com). Either gives you a managed Postgres and a `DATABASE_URL` in about a minute.
- **Backend** — [Render](https://render.com). The API keeps a Socket.io connection open per client, so it needs a long-lived process — that rules out a serverless platform like Vercel for this half.
- **Frontend** — [Vercel](https://vercel.com). A static Vite build, which is exactly what Vercel is built for.

## 1. Database

1. Create a Neon or Supabase project.
2. Copy the connection string it gives you — that's your `DATABASE_URL`. Make sure it requires SSL (`?sslmode=require`), which both providers do by default.
3. From your machine, with that URL in `backend/.env` temporarily, run:
   ```
   cd backend
   DATABASE_URL="<paste it here>" npx prisma db push
   ```
   This creates the schema. (This project doesn't use `prisma migrate` — see the note in the backend's own README/CLAUDE notes — `db push` is the right command here, not `migrate deploy`.)

## 2. Backend (Render)

This repo has a `render.yaml` at the root, so Render can set most of it up for you:

1. Push this repo to GitHub if it isn't already there.
2. In Render, **New > Blueprint**, point it at the repo. It reads `render.yaml` and creates a `freeroom-backend` web service rooted at `backend/`.
3. Render will ask for the env vars marked `sync: false` — fill in:
   - `DATABASE_URL` — from step 1.
   - `JWT_SECRET` — a real random value, e.g. `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. There's no fallback for this one on purpose — the server refuses to start without it.
   - `CORS_ORIGIN` — leave blank for now, you'll set it in step 4.
4. Deploy. Once it's live, note the URL Render gives you (something like `https://freeroom-backend.onrender.com`) — the frontend needs it next.

No Blueprint? You can create the Web Service by hand instead: root directory `backend`, build command `npm install && npm run build`, start command `npm start`, health check path `/health`, same env vars as above.

## 3. Frontend (Vercel)

1. Import the repo into Vercel.
2. Set the project's root directory to `frontend`.
3. Add one env var: `VITE_API_URL` = the Render URL from step 2.
4. Deploy. Vercel gives you a URL like `https://freeroom.vercel.app`.

## 4. Wire it together

Go back to the Render service and set `CORS_ORIGIN` to the Vercel URL from step 3 (comma-separate more than one if you also want a preview-deploy URL allowed, e.g. `https://freeroom.vercel.app,https://freeroom-git-develop.vercel.app`). Redeploy the backend so it picks up the new value.

Without this, the browser will block the frontend from talking to the API — `CORS_ORIGIN` unset only means "allow anything," which is what local dev relies on, not what you want once this is public.

## Verifying it worked

- `https://<your-render-url>/health` returns `{"status":"ok"}`.
- `https://<your-render-url>/docs` shows the Swagger UI.
- The Vercel URL loads the login screen and registering/logging in actually reaches the backend (check the Network tab if it doesn't — a CORS error here almost always means step 4 wasn't done yet).
