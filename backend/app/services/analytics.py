from collections import defaultdict
from datetime import date as date_type

from ..models import ExerciseEntry, FoodEntry, SkillEntry, WorkoutSession
from ..schemas import (
    AnalyticsWeekSummary,
    FoodWeekSummary,
    SkillWeekSummary,
    WorkoutWeekSummary,
)
from .nutrition import daily_totals


def summarize_workouts(
    sessions: list[WorkoutSession], exercises_by_session: dict[int, list[ExerciseEntry]]
) -> WorkoutWeekSummary:
    total_sets = 0
    exercise_names: set[str] = set()
    volume_by_exercise: dict[str, float] = defaultdict(float)

    for session in sessions:
        for exercise in exercises_by_session.get(session.id or -1, []):
            total_sets += exercise.sets
            exercise_names.add(exercise.exercise_name)
            volume_by_exercise[exercise.exercise_name] += (
                exercise.weight * exercise.reps * exercise.sets
            )

    return WorkoutWeekSummary(
        sessions_logged=len(sessions),
        total_sets=total_sets,
        exercises_trained=sorted(exercise_names),
        volume_by_exercise=dict(volume_by_exercise),
    )


def summarize_food(entries: list[FoodEntry]) -> FoodWeekSummary:
    totals = daily_totals(entries)
    total_calories = round(sum(t.calories for t in totals), 2)
    average = round(total_calories / len(totals), 2) if totals else None
    return FoodWeekSummary(
        days_logged=len(totals),
        total_calories=total_calories,
        average_daily_calories=average,
        daily_totals=totals,
    )


def summarize_skills(entries: list[SkillEntry]) -> SkillWeekSummary:
    total_minutes = round(sum(e.time_spent_minutes for e in entries), 2)
    average_confidence = (
        round(sum(e.confidence for e in entries) / len(entries), 2) if entries else None
    )
    by_skill: dict[str, float] = defaultdict(float)
    for e in entries:
        by_skill[e.skill_name] += e.time_spent_minutes
    return SkillWeekSummary(
        entries_logged=len(entries),
        total_minutes=total_minutes,
        average_confidence=average_confidence,
        by_skill={k: round(v, 2) for k, v in by_skill.items()},
    )


def build_week_summary(
    range_start: date_type,
    range_end: date_type,
    sessions: list[WorkoutSession],
    exercises_by_session: dict[int, list[ExerciseEntry]],
    food_entries: list[FoodEntry],
    skill_entries: list[SkillEntry],
) -> AnalyticsWeekSummary:
    return AnalyticsWeekSummary(
        range_start=range_start,
        range_end=range_end,
        workouts=summarize_workouts(sessions, exercises_by_session),
        food=summarize_food(food_entries),
        skills=summarize_skills(skill_entries),
    )
