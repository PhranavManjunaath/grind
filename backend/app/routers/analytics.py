from fastapi import APIRouter, Depends, Query
from sqlmodel import Session, select

from .. import schemas
from ..database import get_session
from ..models import FoodEntry, SkillEntry, WorkoutExerciseEntry, WorkoutWeekLog
from ..services.analytics import summarize_food, summarize_skills, summarize_workouts
from ..services.overload import build_progress_points, classify_trend
from ..services.weeks import current_week_number, date_range_for_week

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/week/{week_number}", response_model=schemas.AnalyticsWeekSummary)
def week_summary(
    week_number: int, db: Session = Depends(get_session)
) -> schemas.AnalyticsWeekSummary:
    start, end = date_range_for_week(db, week_number)

    # ---- Workouts ----
    logs = db.exec(
        select(WorkoutWeekLog).where(WorkoutWeekLog.week_number == week_number)
    ).all()
    log_ids = [log.id for log in logs if log.id is not None]
    exercises_by_log: dict[int, list[WorkoutExerciseEntry]] = {lid: [] for lid in log_ids}
    exercise_names: set[str] = set()
    if log_ids:
        exercises = db.exec(
            select(WorkoutExerciseEntry).where(
                WorkoutExerciseEntry.week_log_id.in_(log_ids)
            )
        ).all()
        for exercise in exercises:
            exercises_by_log.setdefault(exercise.week_log_id, []).append(exercise)
            exercise_names.add(exercise.exercise_name)

    trend_by_exercise: dict[str, str] = {}
    for name in exercise_names:
        rows = db.exec(
            select(WorkoutExerciseEntry, WorkoutWeekLog.week_number)
            .join(WorkoutWeekLog)
            .where(WorkoutExerciseEntry.exercise_name == name)
            .where(WorkoutWeekLog.week_number <= week_number)
        ).all()
        history = [(wn, entry) for entry, wn in rows]
        trend_by_exercise[name] = classify_trend(build_progress_points(history))

    workout_summary = summarize_workouts(logs, exercises_by_log, trend_by_exercise)

    # ---- Food ----
    food_entries = db.exec(
        select(FoodEntry).where(FoodEntry.date >= start).where(FoodEntry.date <= end)
    ).all()
    food_summary = summarize_food(food_entries)

    # ---- Skills ----
    skill_entries = db.exec(
        select(SkillEntry).where(SkillEntry.week_number == week_number)
    ).all()
    improved: set[str] = set()
    if week_number > 1:
        prior_entries = db.exec(
            select(SkillEntry).where(SkillEntry.week_number == week_number - 1)
        ).all()
        prior_best: dict[str, int] = {}
        for e in prior_entries:
            prior_best[e.skill_name] = max(prior_best.get(e.skill_name, 0), e.confidence)
        for e in skill_entries:
            if e.skill_name in prior_best and e.confidence > prior_best[e.skill_name]:
                improved.add(e.skill_name)
    skill_summary = summarize_skills(skill_entries, improved)

    return schemas.AnalyticsWeekSummary(
        week_number=week_number,
        range_start=start,
        range_end=end,
        workouts=workout_summary,
        food=food_summary,
        skills=skill_summary,
    )


@router.get("/week/current/number", response_model=dict)
def current_week(db: Session = Depends(get_session)) -> dict:
    return {"week_number": current_week_number(db)}
