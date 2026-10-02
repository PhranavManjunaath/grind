from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from .. import schemas
from ..database import get_session
from ..models import WorkoutExerciseEntry, WorkoutSplitDay, WorkoutWeekLog
from ..services import ai_coach
from ..services.overload import build_progress_points, classify_trend, suggest_next_weight
from ..services.config_service import get_or_create_config
from ..services.weeks import current_week_number, date_range_for_week

router = APIRouter(prefix="/api/workout", tags=["workout"])


# ---------- Split template ----------


@router.get("/split", response_model=list[schemas.SplitDayRead])
def get_split(db: Session = Depends(get_session)) -> list[WorkoutSplitDay]:
    return db.exec(select(WorkoutSplitDay).order_by(WorkoutSplitDay.order)).all()


@router.put("/split", response_model=list[schemas.SplitDayRead])
def update_split(
    payload: schemas.WorkoutSplitUpdate, db: Session = Depends(get_session)
) -> list[WorkoutSplitDay]:
    # Replace the whole split in one call — simplest model for a small,
    # infrequently-edited template, and avoids partial-update ambiguity
    # about which days were removed.
    existing = db.exec(select(WorkoutSplitDay)).all()
    for day in existing:
        db.delete(day)
    db.flush()

    created = []
    for i, day in enumerate(payload.days):
        row = WorkoutSplitDay(weekday=day.weekday, label=day.label, order=i)
        db.add(row)
        created.append(row)

    db.commit()
    for row in created:
        db.refresh(row)
    return created


# ---------- Weekly logs ----------


def _get_log_or_404(db: Session, log_id: int) -> WorkoutWeekLog:
    log = db.get(WorkoutWeekLog, log_id)
    if log is None:
        raise HTTPException(status_code=404, detail="Week log not found")
    return log


@router.get("/weeks/current", response_model=dict)
def get_current_week_number(db: Session = Depends(get_session)) -> dict:
    return {"week_number": current_week_number(db)}


@router.get("/weeks/{week_number}", response_model=schemas.WorkoutWeekView)
def get_week(week_number: int, db: Session = Depends(get_session)) -> schemas.WorkoutWeekView:
    if week_number < 1:
        raise HTTPException(status_code=422, detail="week_number must be >= 1")

    logs = db.exec(
        select(WorkoutWeekLog).where(WorkoutWeekLog.week_number == week_number)
    ).all()
    for log in logs:
        _ = log.exercises

    start, end = date_range_for_week(db, week_number)
    return schemas.WorkoutWeekView(
        week_number=week_number, range_start=start, range_end=end, days=logs
    )


@router.post("/weeks", response_model=schemas.WeekLogRead, status_code=201)
def create_week_log(
    payload: schemas.WeekLogCreate, db: Session = Depends(get_session)
) -> WorkoutWeekLog:
    split_day = db.get(WorkoutSplitDay, payload.split_day_id)
    if split_day is None:
        raise HTTPException(status_code=404, detail="Split day not found")

    existing = db.exec(
        select(WorkoutWeekLog)
        .where(WorkoutWeekLog.week_number == payload.week_number)
        .where(WorkoutWeekLog.split_day_id == payload.split_day_id)
    ).first()
    if existing is not None:
        raise HTTPException(
            status_code=409,
            detail="A log for this week and split day already exists — update it instead.",
        )

    log = WorkoutWeekLog(
        week_number=payload.week_number,
        split_day_id=payload.split_day_id,
        notes=payload.notes,
    )
    db.add(log)
    db.flush()

    for exercise in payload.exercises:
        db.add(WorkoutExerciseEntry(week_log_id=log.id, **exercise.model_dump()))

    db.commit()
    db.refresh(log)
    _ = log.exercises
    return log


@router.put("/weeks/{log_id}", response_model=schemas.WeekLogRead)
def update_week_log(
    log_id: int, payload: schemas.WeekLogUpdate, db: Session = Depends(get_session)
) -> WorkoutWeekLog:
    log = _get_log_or_404(db, log_id)
    updates = payload.model_dump(exclude_unset=True)
    for key, value in updates.items():
        setattr(log, key, value)
    db.add(log)
    db.commit()
    db.refresh(log)
    _ = log.exercises
    return log


@router.post(
    "/weeks/{log_id}/copy-forward",
    response_model=schemas.WeekLogRead,
    status_code=201,
)
def copy_week_forward(
    log_id: int,
    target_week_number: int = Query(ge=1),
    db: Session = Depends(get_session),
) -> WorkoutWeekLog:
    """Copy a week's exercises (names/weights/reps/sets) into a new week
    as a starting point — the user then edits in their new performance."""
    source = _get_log_or_404(db, log_id)
    existing = db.exec(
        select(WorkoutWeekLog)
        .where(WorkoutWeekLog.week_number == target_week_number)
        .where(WorkoutWeekLog.split_day_id == source.split_day_id)
    ).first()
    if existing is not None:
        raise HTTPException(
            status_code=409, detail="Target week already has a log for this day."
        )

    new_log = WorkoutWeekLog(
        week_number=target_week_number, split_day_id=source.split_day_id
    )
    db.add(new_log)
    db.flush()
    for exercise in source.exercises:
        db.add(
            WorkoutExerciseEntry(
                week_log_id=new_log.id,
                exercise_name=exercise.exercise_name,
                weight=exercise.weight,
                reps=exercise.reps,
                sets=exercise.sets,
                notes=exercise.notes,
            )
        )
    db.commit()
    db.refresh(new_log)
    _ = new_log.exercises
    return new_log


# ---------- Exercises ----------


@router.post(
    "/weeks/{log_id}/exercises", response_model=schemas.ExerciseRead, status_code=201
)
def add_exercise(
    log_id: int, payload: schemas.ExerciseCreate, db: Session = Depends(get_session)
) -> WorkoutExerciseEntry:
    _get_log_or_404(db, log_id)
    exercise = WorkoutExerciseEntry(week_log_id=log_id, **payload.model_dump())
    db.add(exercise)
    db.commit()
    db.refresh(exercise)
    return exercise


@router.put("/exercises/{exercise_id}", response_model=schemas.ExerciseRead)
def update_exercise(
    exercise_id: int, payload: schemas.ExerciseUpdate, db: Session = Depends(get_session)
) -> WorkoutExerciseEntry:
    exercise = db.get(WorkoutExerciseEntry, exercise_id)
    if exercise is None:
        raise HTTPException(status_code=404, detail="Exercise entry not found")
    updates = payload.model_dump(exclude_unset=True)
    for key, value in updates.items():
        setattr(exercise, key, value)
    db.add(exercise)
    db.commit()
    db.refresh(exercise)
    return exercise


@router.delete("/exercises/{exercise_id}", status_code=204)
def delete_exercise(exercise_id: int, db: Session = Depends(get_session)) -> None:
    exercise = db.get(WorkoutExerciseEntry, exercise_id)
    if exercise is None:
        raise HTTPException(status_code=404, detail="Exercise entry not found")
    db.delete(exercise)
    db.commit()


# ---------- Progress & suggestions ----------


def _history_for_exercise(db: Session, exercise_name: str) -> list[tuple[int, WorkoutExerciseEntry]]:
    rows = db.exec(
        select(WorkoutExerciseEntry, WorkoutWeekLog.week_number)
        .join(WorkoutWeekLog)
        .where(WorkoutExerciseEntry.exercise_name == exercise_name)
    ).all()
    return [(week_number, entry) for entry, week_number in rows]


@router.get("/progress/{exercise_name}", response_model=schemas.ExerciseProgress)
def exercise_progress(
    exercise_name: str, db: Session = Depends(get_session)
) -> schemas.ExerciseProgress:
    history = _history_for_exercise(db, exercise_name)
    points = build_progress_points(history)
    trend = classify_trend(points)
    config = get_or_create_config(db)
    suggestion = suggest_next_weight(
        exercise_name,
        history,
        rep_range=(config.rep_range_low, config.rep_range_high),
        increment_override=config.weight_increment,
    )
    return schemas.ExerciseProgress(
        exercise_name=exercise_name,
        history=points,
        trend=trend,
        basic_suggestion=suggestion,
    )


@router.post("/ai-recommendation", response_model=schemas.AIExerciseRecommendation)
def ai_recommendation(
    exercise_name: str = Query(min_length=1), db: Session = Depends(get_session)
) -> schemas.AIExerciseRecommendation:
    progress = exercise_progress(exercise_name, db)
    return ai_coach.get_exercise_recommendation(progress)


@router.get("/ai-weekly-summary", response_model=schemas.AIWeeklySummary)
def ai_weekly_summary(
    week_number: int = Query(ge=1), db: Session = Depends(get_session)
) -> schemas.AIWeeklySummary:
    logs = db.exec(
        select(WorkoutWeekLog).where(WorkoutWeekLog.week_number == week_number)
    ).all()
    exercise_names = sorted(
        {ex.exercise_name for log in logs for ex in log.exercises}
    )
    progresses = [exercise_progress(name, db) for name in exercise_names]
    return ai_coach.get_weekly_summary(progresses)
