from datetime import date as date_type
from datetime import datetime, timezone

from sqlmodel import Field, Relationship, SQLModel


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class WorkoutSession(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    date: date_type = Field(index=True)
    notes: str | None = None
    created_at: datetime = Field(default_factory=_utcnow)
    updated_at: datetime = Field(default_factory=_utcnow)

    exercises: list["ExerciseEntry"] = Relationship(
        back_populates="session",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )


class ExerciseEntry(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    session_id: int = Field(foreign_key="workoutsession.id", index=True)
    exercise_name: str = Field(index=True)
    weight: float = Field(ge=0)
    reps: int = Field(gt=0)
    sets: int = Field(gt=0)
    rest_seconds: int | None = Field(default=None, ge=0)
    notes: str | None = None
    created_at: datetime = Field(default_factory=_utcnow)
    updated_at: datetime = Field(default_factory=_utcnow)

    session: WorkoutSession | None = Relationship(back_populates="exercises")


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


class SkillEntry(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    date: date_type = Field(index=True)
    skill_name: str = Field(index=True)
    time_spent_minutes: float = Field(gt=0)
    confidence: int = Field(ge=1, le=5)
    notes: str | None = None
    created_at: datetime = Field(default_factory=_utcnow)
    updated_at: datetime = Field(default_factory=_utcnow)
