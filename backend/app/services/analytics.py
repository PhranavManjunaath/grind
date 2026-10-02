from collections import defaultdict

from ..models import FoodEntry, SkillEntry, WorkoutExerciseEntry, WorkoutWeekLog
from ..schemas import (
    DailyFoodTotal,
    FoodWeekSummary,
    SkillWeekSummary,
    WorkoutWeekSummary,
)
from .nutrition import daily_totals
from .overload import volume as exercise_volume


def summarize_workouts(
    week_logs: list[WorkoutWeekLog],
    exercises_by_log: dict[int, list[WorkoutExerciseEntry]],
    trend_by_exercise: dict[str, str],
) -> WorkoutWeekSummary:
    total_sets = 0
    exercise_names: set[str] = set()
    volume_by_exercise: dict[str, float] = defaultdict(float)

    for log in week_logs:
        for exercise in exercises_by_log.get(log.id or -1, []):
            total_sets += exercise.sets
            exercise_names.add(exercise.exercise_name)
            volume_by_exercise[exercise.exercise_name] += exercise_volume(exercise)

    improving = sorted(n for n in exercise_names if trend_by_exercise.get(n) == "improving")
    stable = sorted(n for n in exercise_names if trend_by_exercise.get(n) == "stable")
    declining = sorted(n for n in exercise_names if trend_by_exercise.get(n) == "declining")

    return WorkoutWeekSummary(
        days_logged=len(week_logs),
        total_sets=total_sets,
        exercises_trained=sorted(exercise_names),
        volume_by_exercise={k: round(v, 2) for k, v in volume_by_exercise.items()},
        improving=improving,
        stable=stable,
        declining=declining,
    )


def summarize_food(entries: list[FoodEntry]) -> FoodWeekSummary:
    totals: list[DailyFoodTotal] = daily_totals(entries)
    total_calories = round(sum(t.calories for t in totals), 2)
    days_logged = len(totals)

    def avg(attr: str) -> float | None:
        if not totals:
            return None
        return round(sum(getattr(t, attr) for t in totals) / days_logged, 2)

    highest = max(totals, key=lambda t: t.calories) if totals else None
    lowest = min(totals, key=lambda t: t.calories) if totals else None

    return FoodWeekSummary(
        days_logged=days_logged,
        total_calories=total_calories,
        average_daily_calories=avg("calories"),
        average_protein=avg("protein"),
        average_carbs=avg("carbs"),
        average_fat=avg("fat"),
        highest_calorie_day=highest,
        lowest_calorie_day=lowest,
        daily_totals=totals,
    )


def summarize_skills(
    entries: list[SkillEntry], improved: set[str]
) -> SkillWeekSummary:
    total_hours = round(sum(e.hours_spent for e in entries), 2)
    average_confidence = (
        round(sum(e.confidence for e in entries) / len(entries), 2) if entries else None
    )
    skills_worked_on = sorted({e.skill_name for e in entries})
    return SkillWeekSummary(
        entries_logged=len(entries),
        skills_worked_on=skills_worked_on,
        total_hours=total_hours,
        average_confidence=average_confidence,
        improved_confidence=sorted(improved),
    )
