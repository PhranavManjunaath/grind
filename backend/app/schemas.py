from datetime import date as date_type
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


# ---------- shared ----------


class ORMModel(BaseModel):
    """Base for schemas built directly from SQLModel/ORM instances."""

    model_config = ConfigDict(from_attributes=True)


class Page(BaseModel):
    total: int
    limit: int
    offset: int


# ---------- Workout ----------


class ExerciseBase(BaseModel):
    exercise_name: str = Field(min_length=1, max_length=120)
    weight: float = Field(ge=0)
    reps: int = Field(gt=0)
    sets: int = Field(gt=0)
    rest_seconds: int | None = Field(default=None, ge=0)
    notes: str | None = Field(default=None, max_length=2000)

    @field_validator("exercise_name")
    @classmethod
    def strip_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("exercise_name cannot be blank")
        return v


class ExerciseCreate(ExerciseBase):
    pass


class ExerciseUpdate(BaseModel):
    exercise_name: str | None = Field(default=None, min_length=1, max_length=120)
    weight: float | None = Field(default=None, ge=0)
    reps: int | None = Field(default=None, gt=0)
    sets: int | None = Field(default=None, gt=0)
    rest_seconds: int | None = Field(default=None, ge=0)
    notes: str | None = Field(default=None, max_length=2000)


class ExerciseRead(ExerciseBase, ORMModel):
    id: int
    session_id: int
    created_at: datetime
    updated_at: datetime


class WorkoutSessionCreate(BaseModel):
    date: date_type
    notes: str | None = Field(default=None, max_length=2000)
    exercises: list[ExerciseCreate] = Field(default_factory=list)


class WorkoutSessionUpdate(BaseModel):
    date: date_type | None = None
    notes: str | None = Field(default=None, max_length=2000)


class WorkoutSessionRead(ORMModel):
    id: int
    date: date_type
    notes: str | None
    created_at: datetime
    updated_at: datetime
    exercises: list[ExerciseRead] = Field(default_factory=list)


class WorkoutSessionPage(Page):
    items: list[WorkoutSessionRead]


class NextWeightSuggestion(BaseModel):
    exercise_name: str
    has_history: bool
    last_session_date: date_type | None = None
    last_weight: float | None = None
    last_reps: int | None = None
    last_sets: int | None = None
    suggested_weight: float | None = None
    increment: float | None = None
    rationale: str


# ---------- Food ----------


class FoodEntryBase(BaseModel):
    date: date_type
    food_name: str = Field(min_length=1, max_length=120)
    calories: float = Field(ge=0)
    protein: float | None = Field(default=None, ge=0)
    carbs: float | None = Field(default=None, ge=0)
    fat: float | None = Field(default=None, ge=0)
    serving: str | None = Field(default=None, max_length=120)
    meal: str | None = Field(default=None, max_length=40)
    notes: str | None = Field(default=None, max_length=2000)

    @field_validator("food_name")
    @classmethod
    def strip_food_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("food_name cannot be blank")
        return v


class FoodEntryCreate(FoodEntryBase):
    save_as_food: bool = False
    saved_food_id: int | None = None


class FoodEntryUpdate(BaseModel):
    date: date_type | None = None
    food_name: str | None = Field(default=None, min_length=1, max_length=120)
    calories: float | None = Field(default=None, ge=0)
    protein: float | None = Field(default=None, ge=0)
    carbs: float | None = Field(default=None, ge=0)
    fat: float | None = Field(default=None, ge=0)
    serving: str | None = Field(default=None, max_length=120)
    meal: str | None = Field(default=None, max_length=40)
    notes: str | None = Field(default=None, max_length=2000)


class FoodEntryRead(FoodEntryBase, ORMModel):
    id: int
    saved_food_id: int | None
    created_at: datetime
    updated_at: datetime


class FoodEntryPage(Page):
    items: list[FoodEntryRead]


class SavedFoodBase(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    default_calories: float | None = Field(default=None, ge=0)
    default_protein: float | None = Field(default=None, ge=0)
    default_carbs: float | None = Field(default=None, ge=0)
    default_fat: float | None = Field(default=None, ge=0)
    default_serving: str | None = Field(default=None, max_length=120)

    @field_validator("name")
    @classmethod
    def strip_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("name cannot be blank")
        return v


class SavedFoodCreate(SavedFoodBase):
    pass


class SavedFoodUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    default_calories: float | None = Field(default=None, ge=0)
    default_protein: float | None = Field(default=None, ge=0)
    default_carbs: float | None = Field(default=None, ge=0)
    default_fat: float | None = Field(default=None, ge=0)
    default_serving: str | None = Field(default=None, max_length=120)


class SavedFoodRead(SavedFoodBase, ORMModel):
    id: int
    created_at: datetime
    updated_at: datetime


class DailyFoodTotal(BaseModel):
    date: date_type
    calories: float
    protein: float
    carbs: float
    fat: float
    entry_count: int


# ---------- Skills ----------


class SkillEntryBase(BaseModel):
    date: date_type
    skill_name: str = Field(min_length=1, max_length=120)
    time_spent_minutes: float = Field(gt=0)
    confidence: int = Field(ge=1, le=5)
    notes: str | None = Field(default=None, max_length=2000)

    @field_validator("skill_name")
    @classmethod
    def strip_skill_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("skill_name cannot be blank")
        return v


class SkillEntryCreate(SkillEntryBase):
    pass


class SkillEntryUpdate(BaseModel):
    date: date_type | None = None
    skill_name: str | None = Field(default=None, min_length=1, max_length=120)
    time_spent_minutes: float | None = Field(default=None, gt=0)
    confidence: int | None = Field(default=None, ge=1, le=5)
    notes: str | None = Field(default=None, max_length=2000)


class SkillEntryRead(SkillEntryBase, ORMModel):
    id: int
    created_at: datetime
    updated_at: datetime


class SkillEntryPage(Page):
    items: list[SkillEntryRead]


# ---------- Analytics ----------


class WorkoutWeekSummary(BaseModel):
    sessions_logged: int
    total_sets: int
    exercises_trained: list[str]
    volume_by_exercise: dict[str, float]


class FoodWeekSummary(BaseModel):
    days_logged: int
    total_calories: float
    average_daily_calories: float | None
    daily_totals: list[DailyFoodTotal]


class SkillWeekSummary(BaseModel):
    entries_logged: int
    total_minutes: float
    average_confidence: float | None
    by_skill: dict[str, float]


class AnalyticsWeekSummary(BaseModel):
    range_start: date_type
    range_end: date_type
    workouts: WorkoutWeekSummary
    food: FoodWeekSummary
    skills: SkillWeekSummary
