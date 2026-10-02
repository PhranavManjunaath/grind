# Grind — Habit, Workout, Food & Skills Tracker

A dark, dense personal tracking dashboard. The **Habit Tracker** is the
original app and runs entirely client-side (localStorage) — no backend
required for it. **Workout Log**, **Food & Calorie Log**, **Skills Log**,
and the unified **Analytics** page are backed by a small FastAPI + SQLite
API in [`backend/`](backend/).

## Stack

- Frontend: React 19 + Vite + Tailwind CSS v4 + Recharts + Lucide icons
- Backend: FastAPI + SQLModel (SQLAlchemy) + SQLite
- Persistence: Habit Tracker → browser localStorage. Workout/Food/Skills →
  SQLite file (`backend/grind.db`, created automatically).

## Project structure

```
src/
  components/      Habit Tracker UI (unchanged) + shared Navigation
  pages/           WorkoutLog, FoodLog, SkillsLog, Analytics
  api/client.js    fetch wrapper for the backend API
  utils/           dateUtils, habitAnalytics, storage (Habit Tracker),
                    ui.js (shared Tailwind class constants)
backend/
  app/
    main.py        FastAPI app, CORS, router registration
    config.py      env-based settings (DATABASE_URL, CORS_ORIGINS)
    database.py    SQLModel engine/session, init_db()
    models.py      WorkoutSession, ExerciseEntry, FoodEntry, SavedFood, SkillEntry
    schemas.py     Pydantic request/response schemas
    routers/       workouts.py, food.py, skills.py, analytics.py
    services/      overload.py (progressive-overload rule), nutrition.py,
                    analytics.py (weekly aggregation)
  tests/           pytest suite (CRUD, validation, overload, nutrition, analytics)
```

## Running it

### Frontend

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`. The Habit Tracker tab works immediately
with no backend. Workout/Food/Skills/Analytics will show a connection
error banner until the backend (below) is running.

Copy `.env.example` to `.env` if you need to point the frontend at a
non-default API URL:

```
VITE_API_URL=http://localhost:8000
```

### Backend

```bash
cd backend
python -m venv .venv
source .venv/Scripts/activate   # Windows Git Bash; use .venv\Scripts\activate.bat on cmd
pip install -r requirements.txt
cp .env.example .env            # optional, defaults already work for local dev
uvicorn app.main:app --reload --port 8000
```

The SQLite database (`backend/grind.db`) and all tables are created
automatically on first run via `init_db()` — there's no separate
migration step for a fresh setup. Table creation only adds missing
tables, so it's safe to run on every startup.

API docs (Swagger UI) are available at `http://localhost:8000/docs` once
the server is running.

### Tests

```bash
cd backend
source .venv/Scripts/activate
python -m pytest
```

27 tests cover CRUD for all three domains, input validation (negative
weight/calories, zero reps, out-of-range confidence, etc.), the
progressive-overload suggestion logic (first-time exercise, single
session, full completion, incomplete session, bodyweight exercises,
custom increment), nutrition daily totals (including that unlogged days
are excluded rather than treated as zero), and analytics week-boundary
behavior (empty ranges, cross-domain aggregation, entries outside range).

## API overview

All endpoints are prefixed `/api`. Dates are `YYYY-MM-DD`. List endpoints
return `{ total, limit, offset, items }` and accept `limit`/`offset` plus
domain-specific filters (`start`, `end`, etc.).

- `POST/GET /api/workouts/sessions`, `GET/PATCH/DELETE /api/workouts/sessions/{id}`
- `POST /api/workouts/sessions/{id}/exercises`, `PATCH/DELETE /api/workouts/exercises/{id}`
- `GET /api/workouts/exercises/history?exercise_name=`
- `GET /api/workouts/suggestions?exercise_name=&increment=` — next-session
  weight suggestion (see below)
- `POST/GET /api/food/entries`, `GET/PATCH/DELETE /api/food/entries/{id}`
- `GET /api/food/entries/daily-totals/list?start=&end=`
- `POST/GET /api/food/saved`, `PATCH/DELETE /api/food/saved/{id}`
- `POST/GET /api/skills/entries`, `GET/PATCH/DELETE /api/skills/entries/{id}`
- `GET /api/analytics/weekly?start=&end=` — combined workout/food/skills
  summary for the range (defaults to the last 7 days)
- `GET /api/health`

The Habit Tracker has no API — it is intentionally left as-is on
localStorage. The Analytics page computes habit completion for the
selected range directly from that local data and merges it with the
backend's workout/food/skills summary.

### Progressive-overload suggestion rule

For a given exercise, the suggestion compares your two most recent
logged entries:

- **No history** → no suggestion, explained as such.
- **Only one session logged** → repeat that weight (no increase yet).
- **Bodyweight exercise (weight = 0)** → never suggests a weight change;
  tells you to progress via reps/sets instead.
- **Completed the same or more sets/reps than the session before** →
  suggests a small increase (default: +1.25/+2.5/+5 depending on current
  weight, or pass `?increment=` to override).
- **Fell short of the prior session** → suggests repeating the same
  weight.

It never suggests a decrease, and every response includes a plain-English
`rationale` — it's a heuristic over your own logs, not guaranteed
coaching.

## Configuration

Backend env vars (`backend/.env`, see `backend/.env.example`):

- `DATABASE_URL` — SQLite URL, defaults to `sqlite:///./grind.db`
- `CORS_ORIGINS` — comma-separated list of allowed frontend origins

Frontend env vars (`.env`, see `.env.example`):

- `VITE_API_URL` — backend base URL, defaults to `http://localhost:8000`

No secrets or deployment credentials are hard-coded anywhere in the repo.
