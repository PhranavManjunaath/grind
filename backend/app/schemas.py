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


# ---------- Workout: split template ----------


class SplitDayBase(BaseModel):
    weekday: int = Field(ge=0, le=6, description="0=Monday .. 6=Sunday")
    label: str = Field(min_length=1, max_length=200)
    order: int = 0

    @field_validator("label")
    @classmethod
    def strip_label(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("label cannot be blank")
        return v


class SplitDayCreate(SplitDayBase):
    pass


class SplitDayUpdate(BaseModel):
    weekday: int | None = Field(default=None, ge=0, le=6)
    label: str | None = Field(default=None, min_length=1, max_length=200)
    order: int | None = None


class SplitDayRead(SplitDayBase, ORMModel):
    id: int
    created_at: datetime
    updated_at: datetime


class WorkoutSplitUpdate(BaseModel):
    days: list[SplitDayCreate]


# ---------- Workout: weekly performance ----------


class ExerciseBase(BaseModel):
    exercise_name: str = Field(min_length=1, max_length=120)
    weight: float = Field(ge=0)
    reps: int = Field(ge=0)
    sets: int = Field(ge=0)
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
    reps: int | None = Field(default=None, ge=0)
    sets: int | None = Field(default=None, ge=0)
    notes: str | None = Field(default=None, max_length=2000)


class ExerciseRead(ExerciseBase, ORMModel):
    id: int
    week_log_id: int
    created_at: datetime
    updated_at: datetime


class WeekLogCreate(BaseModel):
    week_number: int = Field(ge=1)
    split_day_id: int
    notes: str | None = Field(default=None, max_length=2000)
    exercises: list[ExerciseCreate] = Field(default_factory=list)


class WeekLogUpdate(BaseModel):
    notes: str | None = Field(default=None, max_length=2000)


class WeekLogRead(ORMModel):
    id: int
    week_number: int
    split_day_id: int
    notes: str | None
    created_at: datetime
    updated_at: datetime
    exercises: list[ExerciseRead] = Field(default_factory=list)


class WorkoutWeekView(BaseModel):
    """A full week's worth of logs, one entry per split day that has a log."""

    week_number: int
    range_start: date_type
    range_end: date_type
    days: list[WeekLogRead]


class ProgressPoint(BaseModel):
    week_number: int
    weight: float
    reps: int
    sets: int
    volume: float


class NextWeightSuggestion(BaseModel):
    exercise_name: str
    has_history: bool
    last_week_number: int | None = None
    last_weight: float | None = None
    last_reps: int | None = None
    last_sets: int | None = None
    suggested_weight: float | None = None
    increment: float | None = None
    rationale: str


class ExerciseProgress(BaseModel):
    exercise_name: str
    history: list[ProgressPoint]
    trend: str  # "improving" | "stable" | "declining" | "insufficient_data"
    basic_suggestion: NextWeightSuggestion


# ---------- AI Coach ----------


class AIExerciseRecommendation(BaseModel):
    exercise: str
    recommended_weight: float | None
    target_reps: str
    target_sets: int | None
    recommendation: str
    reason: str
    available: bool = True


class AIWeeklySummary(BaseModel):
    improved: list[str] = Field(default_factory=list)
    stable: list[str] = Field(default_factory=list)
    declined: list[str] = Field(default_factory=list)
    ready_for_progression: list[str] = Field(default_factory=list)
    maintain_weight: list[str] = Field(default_factory=list)
    needs_attention: list[str] = Field(default_factory=list)
    focus_next_week: str = ""
    safety_note: str = (
        "This is an informational suggestion based on your own logged data, "
        "not a substitute for your own judgment, a coach, or safe lifting practices."
    )
    available: bool = True
    message: str | None = None


# ---------- Settings ----------


class AppConfigRead(BaseModel):
    week_anchor_date: date_type
    rep_range_low: int
    rep_range_high: int
    weight_increment: float


class AppConfigUpdate(BaseModel):
    rep_range_low: int | None = Field(default=None, ge=1)
    rep_range_high: int | None = Field(default=None, ge=1)
    weight_increment: float | None = Field(default=None, ge=0)


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


# ---------- Skills (week-based) ----------


class SkillEntryBase(BaseModel):
    week_number: int = Field(ge=1)
    skill_name: str = Field(min_length=1, max_length=120)
    category: str | None = Field(default=None, max_length=80)
    hours_spent: float = Field(gt=0)
    progress: str | None = Field(default=None, max_length=200)
    confidence: int = Field(ge=1, le=10)
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
    week_number: int | None = Field(default=None, ge=1)
    skill_name: str | None = Field(default=None, min_length=1, max_length=120)
    category: str | None = Field(default=None, max_length=80)
    hours_spent: float | None = Field(default=None, gt=0)
    progress: str | None = Field(default=None, max_length=200)
    confidence: int | None = Field(default=None, ge=1, le=10)
    notes: str | None = Field(default=None, max_length=2000)


class SkillEntryRead(SkillEntryBase, ORMModel):
    id: int
    created_at: datetime
    updated_at: datetime


class SkillEntryPage(Page):
    items: list[SkillEntryRead]


# ---------- Analytics (week-based) ----------


class WorkoutWeekSummary(BaseModel):
    days_logged: int
    total_sets: int
    exercises_trained: list[str]
    volume_by_exercise: dict[str, float]
    improving: list[str]
    stable: list[str]
    declining: list[str]


class FoodWeekSummary(BaseModel):
    days_logged: int
    total_calories: float
    average_daily_calories: float | None
    average_protein: float | None
    average_carbs: float | None
    average_fat: float | None
    highest_calorie_day: DailyFoodTotal | None
    lowest_calorie_day: DailyFoodTotal | None
    daily_totals: list[DailyFoodTotal]


class SkillWeekSummary(BaseModel):
    entries_logged: int
    skills_worked_on: list[str]
    total_hours: float
    average_confidence: float | None
    improved_confidence: list[str]


class AnalyticsWeekSummary(BaseModel):
    week_number: int
    range_start: date_type
    range_end: date_type
    habits_placeholder: bool = Field(
        default=True,
        description="Habit data lives client-side; the frontend merges it in.",
    )
    workouts: WorkoutWeekSummary
    food: FoodWeekSummary
    skills: SkillWeekSummary
