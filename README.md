# Grind — Habit, Workout, Food & Skills Tracker

A dark, dense personal tracking dashboard with five areas: **Habit
Tracker**, **Workout**, **Food**, **Skills**, and a unified **Analytics**
view. The Habit Tracker is the original app and runs entirely
client-side (localStorage) — no backend required for it. Workout, Food,
Skills, and Analytics are backed by a FastAPI + SQLite API in
[`backend/`](backend/).

## Stack

- Frontend: React 19 + Vite + Tailwind CSS v4 + Recharts + Lucide icons
- Backend: FastAPI + SQLModel (SQLAlchemy) + SQLite
- Persistence: Habit Tracker → browser localStorage. Workout/Food/Skills →
  SQLite file (`backend/grind.db`, created automatically).

## Project structure

```
src/
  components/      Habit Tracker UI (unchanged) + shared Navigation + Settings
  pages/           WorkoutLog, FoodLog, SkillsLog, Analytics
  api/client.js    fetch wrapper for the backend API
  utils/           dateUtils, habitAnalytics, storage (Habit Tracker),
                    ui.js (shared Tailwind class constants)
backend/
  app/
    main.py        FastAPI app, CORS, router registration
    config.py      env-based settings (DATABASE_URL, CORS_ORIGINS)
    database.py    SQLModel engine/session, init_db()
    models.py      AppConfig, WorkoutSplitDay, WorkoutWeekLog,
                    WorkoutExerciseEntry, AIRecommendation, FoodEntry,
                    SavedFood, SkillEntry
    schemas.py     Pydantic request/response schemas
    routers/       workouts.py, food.py, skills.py, analytics.py, settings.py
    services/
      weeks.py          shared Week 1/2/3... numbering (see below)
      config_service.py AppConfig get-or-create (rep range, increment, anchor)
      overload.py       progressive-overload rule + trend classification
      ai_coach.py       AI coach (Claude API), degrades gracefully if unset
      nutrition.py      daily calorie/macro totals
      analytics.py      weekly aggregation across workouts/food/skills
  tests/           38 pytest tests (CRUD, validation, overload, AI fallback,
                    nutrition, analytics, settings, week numbering)
```

## The week system

Workout, Skills, and Analytics all share one "Week 1 / Week 2 / Week 3"
numbering, anchored to a single date stored once in `AppConfig`
(`week_anchor_date`, the Monday of Week 1 — set automatically to the
current week on first use). `services/weeks.py` converts between a week
number and its underlying Monday–Sunday date range, so the UI only ever
shows "Week N" while Analytics can still map a week back to real
calendar dates for the Food/Habit data that's stored by date.

The **Habit Tracker is unaffected by this** — it keeps its own monthly
calendar entirely in localStorage, unchanged. The Analytics page merges
the two by computing habit completion over the selected week's date
range from that local data.

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

**First-time setup**: open Settings in the app and configure your
recurring Workout Split (e.g. Monday = "Chest + Triceps + Shoulders")
before logging workouts — the Workout page shows an empty state with
instructions until a split exists.

### Tests

```bash
cd backend
source .venv/Scripts/activate
python -m pytest
```

38 tests cover CRUD for all domains; input validation (negative
weight/calories, zero reps/hours, out-of-range confidence); the
progressive-overload rule's edge cases (no history, single week,
hitting the rep target, falling short, bodyweight exercises, configurable
rep range/increment, and that it never suggests a decrease across many
declining weeks); the AI coach's graceful degradation when `AI_API_KEY`
is unset; nutrition daily totals (unlogged days excluded, not zeroed);
analytics week-boundary behavior; route-ordering safety (`/food/saved`
vs. `/food/{entry_id}`); and week-number stability.

## API overview

All endpoints are prefixed `/api`. Dates are `YYYY-MM-DD`. List endpoints
return `{ total, limit, offset, items }` and accept `limit`/`offset` plus
domain-specific filters.

**Workout** (week + fixed-split based, not date-based):
- `GET/PUT /api/workout/split` — the recurring weekly template
- `GET /api/workout/weeks/current` — today's week number
- `GET /api/workout/weeks/{week_number}` — that week's logs, one per split day
- `POST /api/workout/weeks`, `PUT /api/workout/weeks/{id}` — create/update a day's log
- `POST /api/workout/weeks/{id}/copy-forward?target_week_number=` — copy a
  week's exercises into another week as a starting point
- `POST /api/workout/weeks/{id}/exercises`, `PUT/DELETE /api/workout/exercises/{id}`
- `GET /api/workout/progress/{exercise_name}` — full history + trend +
  baseline suggestion for one exercise
- `POST /api/workout/ai-recommendation?exercise_name=` — AI coach for one exercise
- `GET /api/workout/ai-weekly-summary?week_number=` — AI coach weekly summary

**Food**: `POST/GET /api/food`, `GET/PUT/DELETE /api/food/{id}`,
`GET /api/food/daily-totals`, `POST/GET /api/food/saved`,
`PUT/DELETE /api/food/saved/{id}`

**Skills** (also week-based): `POST/GET /api/skills`,
`GET/PUT/DELETE /api/skills/{id}` (filter list by `week_number`, `skill_name`)

**Analytics**: `GET /api/analytics/week/{week_number}` — combined
workout/food/skills summary for that week; `GET /api/analytics/week/current/number`

**Settings**: `GET/PUT /api/settings` — rep range and weight increment
used by the progressive-overload engine

`GET /api/health`

The Habit Tracker has no API — it is intentionally left as-is on
localStorage. The Analytics page computes habit completion for the
selected week directly from that local data and merges it with the
backend's workout/food/skills summary.

### Progressive-overload engine

`services/overload.py` is pure, objective math over your own logged
history — the AI coach consumes its output rather than deciding
progression itself. For a given exercise, it looks at your two most
recent logged weeks:

- **No history** → no suggestion, explained as such.
- **Only one week logged** → repeat that weight (no increase yet).
- **Bodyweight exercise (weight = 0)** → never suggests a weight change;
  tells you to progress via reps/sets instead.
- **Hit the top of your configured rep range, or matched/beat the prior
  week's reps and sets** → suggests a small increase (default:
  +1.25/+2.5/+5 depending on current weight, or your configured
  increment from Settings).
- **Fell short of the prior week** → suggests repeating the same weight
  and rebuilding first.

It never suggests a decrease. `trend` classification (`improving` /
`stable` / `declining` / `insufficient_data`) comes from comparing
volume (weight × reps × sets) across the last up to 4 logged weeks.

### AI Coach

`services/ai_coach.py` calls Claude (model configurable via `AI_MODEL`,
default `claude-haiku-4-5-20251001`) using the `AI_API_KEY` environment
variable, sent only from the backend — **the key is never exposed to the
frontend**. The AI is given only the data the overload engine already
computed (history, trend, baseline suggestion) and is instructed never
to invent numbers; it returns structured JSON matching
`AIExerciseRecommendation` / `AIWeeklySummary`.

If `AI_API_KEY` is unset, the request fails, or the response can't be
parsed, every AI endpoint returns `available: false` with a safe message
instead of raising — the Workout page and the objective suggestion
engine keep working with no AI configured at all. This path is covered
by tests; the actual-AI-success path cannot be tested here since no key
is configured in this environment, so it hasn't been exercised live
beyond manual code review.

## Configuration

Backend env vars (`backend/.env`, see `backend/.env.example`):

- `DATABASE_URL` — SQLite URL, defaults to `sqlite:///./grind.db`
- `CORS_ORIGINS` — comma-separated list of allowed frontend origins
- `AI_API_KEY` — optional; enables the AI Coach. Without it, the app
  still works, just without AI recommendations.
- `AI_MODEL` — optional, defaults to `claude-haiku-4-5-20251001`

Frontend env vars (`.env`, see `.env.example`):

- `VITE_API_URL` — backend base URL, defaults to `http://localhost:8000`

No secrets or deployment credentials are hard-coded anywhere in the repo.
