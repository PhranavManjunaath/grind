from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .database import init_db
from .routers import analytics, food, skills, workouts
from .routers import settings as settings_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
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
def health() -> dict[str, str]:
    return {"status": "ok"}
