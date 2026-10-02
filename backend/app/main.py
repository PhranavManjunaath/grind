import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Response, status
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .database import check_database, describe_target, init_db
from .routers import analytics, food, skills, workouts
from .routers import settings as settings_router

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Startup: DATABASE_URL resolves to %s", describe_target())
    try:
        init_db()
    except Exception:
        # Deliberately not re-raised: the process stays up so that the reason
        # is visible in the deploy logs and /api/health can report it, instead
        # of the container crash-looping with no readable output.
        logger.exception("init_db() failed - tables missing or DB unreachable")
    else:
        logger.info("init_db() succeeded; schema is ready")
    yield


app = FastAPI(
    title="Grind Tracker API",
    description=(
        "Workout, food, and skills tracking for the Grind habit dashboard. "
        "The existing Habit Tracker remains client-side (localStorage) and "
        "is not served by this API."
    ),
    version="0.1.0",
    lifespan=lifespan,
)

settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    # Wildcard and credentials are mutually exclusive per the CORS spec; this
    # API is cookie-less, so dropping credentials is safe.
    allow_credentials=not settings.allow_all_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(workouts.router)
app.include_router(food.router)
app.include_router(skills.router)
app.include_router(analytics.router)
app.include_router(settings_router.router)


@app.get("/api/health")
def health(response: Response) -> dict[str, str]:
    """Liveness plus a real database round-trip.

    Returns 503 when the database is unreachable so the platform surfaces an
    unhealthy service rather than a green one that serves errors.
    """
    ok, detail = check_database()
    if not ok:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {"status": "degraded", "database": detail}
    return {"status": "ok", "database": detail}
