from datetime import date as date_type
from datetime import timedelta

from fastapi import APIRouter, Depends, Query
from sqlmodel import Session, select

from .. import schemas
from ..database import get_session
from ..models import ExerciseEntry, FoodEntry, SkillEntry, WorkoutSession
from ..services.analytics import build_week_summary

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/weekly", response_model=schemas.AnalyticsWeekSummary)
def weekly_summary(
    start: date_type | None = Query(
        default=None, description="Defaults to 6 days before `end`."
    ),
    end: date_type | None = Query(default=None, description="Defaults to today."),
    db: Session = Depends(get_session),
) -> schemas.AnalyticsWeekSummary:
    range_end = end or date_type.today()
    range_start = start or (range_end - timedelta(days=6))

    sessions = db.exec(
        select(WorkoutSession)
        .where(WorkoutSession.date >= range_start)
        .where(WorkoutSession.date <= range_end)
    ).all()
    session_ids = [s.id for s in sessions if s.id is not None]
    exercises_by_session: dict[int, list[ExerciseEntry]] = {sid: [] for sid in session_ids}
    if session_ids:
        exercises = db.exec(
            select(ExerciseEntry).where(ExerciseEntry.session_id.in_(session_ids))
        ).all()
        for exercise in exercises:
            exercises_by_session.setdefault(exercise.session_id, []).append(exercise)

    food_entries = db.exec(
        select(FoodEntry)
        .where(FoodEntry.date >= range_start)
        .where(FoodEntry.date <= range_end)
    ).all()

    skill_entries = db.exec(
        select(SkillEntry)
        .where(SkillEntry.date >= range_start)
        .where(SkillEntry.date <= range_end)
    ).all()

    return build_week_summary(
        range_start,
        range_end,
        sessions,
        exercises_by_session,
        food_entries,
        skill_entries,
    )
