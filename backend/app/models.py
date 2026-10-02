from datetime import date as date_type
from datetime import datetime, timezone

from sqlmodel import Field, Relationship, SQLModel


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class AppConfig(SQLModel, table=True):
    """Singleton row (id is always 1) holding app-wide settings."""

    id: int | None = Field(default=1, primary_key=True)
    week_anchor_date: date_type
    rep_range_low: int = Field(default=8, ge=1)
    rep_range_high: int = Field(default=12, ge=1)
    weight_increment: float = Field(default=2.5, ge=0)


# ---------- Workout: split template ----------


class WorkoutSplitDay(SQLModel, table=True):
    """One day of the user's fixed recurring weekly split (the template)."""

    id: int | None = Field(default=None, primary_key=True)
    weekday: int = Field(ge=0, le=6, index=True)  # 0=Monday .. 6=Sunday
    label: str  # e.g. "Chest + Triceps + Shoulders"
    order: int = Field(default=0)
    created_at: datetime = Field(default_factory=_utcnow)
    updated_at: datetime = Field(default_factory=_utcnow)


# ---------- Workout: weekly performance ----------


class WorkoutWeekLog(SQLModel, table=True):
    """A specific week's log for one split day, e.g. 'Week 3, Monday'."""

    id: int | None = Field(default=None, primary_key=True)
    week_number: int = Field(index=True, ge=1)
    split_day_id: int = Field(foreign_key="workoutsplitday.id", index=True)
    notes: str | None = None
    created_at: datetime = Field(default_factory=_utcnow)
    updated_at: datetime = Field(default_factory=_utcnow)

    exercises: list["WorkoutExerciseEntry"] = Relationship(
        back_populates="week_log",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )


class WorkoutExerciseEntry(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    week_log_id: int = Field(foreign_key="workoutweeklog.id", index=True)
    exercise_name: str = Field(index=True)
    weight: float = Field(ge=0)
    reps: int = Field(ge=0)
    sets: int = Field(ge=0)
    notes: str | None = None
    created_at: datetime = Field(default_factory=_utcnow)
    updated_at: datetime = Field(default_factory=_utcnow)

    week_log: WorkoutWeekLog | None = Relationship(back_populates="exercises")


class AIRecommendation(SQLModel, table=True):
    """Cached AI coach output, kept for history/audit purposes."""

    id: int | None = Field(default=None, primary_key=True)
    week_number: int = Field(index=True)
    exercise_name: str | None = Field(default=None, index=True)
    kind: str = Field(index=True)  # "exercise" or "weekly_summary"
    payload_json: str  # serialized structured response
    available: bool = Field(default=True)
    created_at: datetime = Field(default_factory=_utcnow)


# ---------- Food ----------


class FoodEntry(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    date: date_type = Field(index=True)
    food_name: str
    calories: float = Field(ge=0)
    protein: float | None = Field(default=None, ge=0)
    carbs: float | None = Field(default=None, ge=0)
    fat: float | None = Field(default=None, ge=0)
    serving: str | None = None
    meal: str | None = Field(default=None, index=True)
    notes: str | None = None
    saved_food_id: int | None = Field(default=None, foreign_key="savedfood.id")
    created_at: datetime = Field(default_factory=_utcnow)
    updated_at: datetime = Field(default_factory=_utcnow)


class SavedFood(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    default_calories: float | None = Field(default=None, ge=0)
    default_protein: float | None = Field(default=None, ge=0)
    default_carbs: float | None = Field(default=None, ge=0)
    default_fat: float | None = Field(default=None, ge=0)
    default_serving: str | None = None
    created_at: datetime = Field(default_factory=_utcnow)
    updated_at: datetime = Field(default_factory=_utcnow)


# ---------- Skills (week-based) ----------


class SkillEntry(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    week_number: int = Field(index=True, ge=1)
    skill_name: str = Field(index=True)
    category: str | None = Field(default=None, index=True)
    hours_spent: float = Field(gt=0)
    progress: str | None = None  # free text, e.g. "Beginner -> Intermediate"
    confidence: int = Field(ge=1, le=10)
    notes: str | None = None
    created_at: datetime = Field(default_factory=_utcnow)
    updated_at: datetime = Field(default_factory=_utcnow)
