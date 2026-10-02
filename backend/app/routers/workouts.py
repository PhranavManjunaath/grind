from datetime import date as date_type

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from .. import schemas
from ..database import get_session
from ..models import ExerciseEntry, WorkoutSession
from ..services.overload import suggest_next_weight

router = APIRouter(prefix="/api/workouts", tags=["workouts"])


def _get_session_or_404(db: Session, session_id: int) -> WorkoutSession:
    session = db.get(WorkoutSession, session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Workout session not found")
    return session


@router.post("/sessions", response_model=schemas.WorkoutSessionRead, status_code=201)
def create_session(
    payload: schemas.WorkoutSessionCreate, db: Session = Depends(get_session)
) -> WorkoutSession:
    session = WorkoutSession(date=payload.date, notes=payload.notes)
    db.add(session)
    db.flush()

    for exercise in payload.exercises:
        db.add(ExerciseEntry(session_id=session.id, **exercise.model_dump()))

    db.commit()
    db.refresh(session)
    _ = session.exercises  # eager-load before response serialization
    return session


@router.get("/sessions", response_model=schemas.WorkoutSessionPage)
def list_sessions(
    start: date_type | None = Query(default=None),
    end: date_type | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_session),
) -> schemas.WorkoutSessionPage:
    query = select(WorkoutSession)
    if start is not None:
        query = query.where(WorkoutSession.date >= start)
    if end is not None:
        query = query.where(WorkoutSession.date <= end)

    total = len(db.exec(query).all())
    page_items = db.exec(
        query.order_by(WorkoutSession.date.desc()).offset(offset).limit(limit)
    ).all()
    for item in page_items:
        _ = item.exercises

    return schemas.WorkoutSessionPage(
        total=total, limit=limit, offset=offset, items=page_items
    )


@router.get("/sessions/{session_id}", response_model=schemas.WorkoutSessionRead)
def get_session_detail(
    session_id: int, db: Session = Depends(get_session)
) -> WorkoutSession:
    session = _get_session_or_404(db, session_id)
    _ = session.exercises
    return session


@router.patch("/sessions/{session_id}", response_model=schemas.WorkoutSessionRead)
def update_session(
    session_id: int,
    payload: schemas.WorkoutSessionUpdate,
    db: Session = Depends(get_session),
) -> WorkoutSession:
    session = _get_session_or_404(db, session_id)
    updates = payload.model_dump(exclude_unset=True)
    for key, value in updates.items():
        setattr(session, key, value)
    db.add(session)
    db.commit()
    db.refresh(session)
    _ = session.exercises
    return session


@router.delete("/sessions/{session_id}", status_code=204)
def delete_session(session_id: int, db: Session = Depends(get_session)) -> None:
    session = _get_session_or_404(db, session_id)
    db.delete(session)
    db.commit()


@router.post(
    "/sessions/{session_id}/exercises",
    response_model=schemas.ExerciseRead,
    status_code=201,
)
def add_exercise(
    session_id: int,
    payload: schemas.ExerciseCreate,
    db: Session = Depends(get_session),
) -> ExerciseEntry:
    _get_session_or_404(db, session_id)
    exercise = ExerciseEntry(session_id=session_id, **payload.model_dump())
    db.add(exercise)
    db.commit()
    db.refresh(exercise)
    return exercise


@router.patch("/exercises/{exercise_id}", response_model=schemas.ExerciseRead)
def update_exercise(
    exercise_id: int,
    payload: schemas.ExerciseUpdate,
    db: Session = Depends(get_session),
) -> ExerciseEntry:
    exercise = db.get(ExerciseEntry, exercise_id)
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
    exercise = db.get(ExerciseEntry, exercise_id)
    if exercise is None:
        raise HTTPException(status_code=404, detail="Exercise entry not found")
    db.delete(exercise)
    db.commit()


@router.get("/exercises/history", response_model=list[schemas.ExerciseRead])
def exercise_history(
    exercise_name: str = Query(min_length=1),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_session),
) -> list[ExerciseEntry]:
    query = (
        select(ExerciseEntry)
        .join(WorkoutSession)
        .where(ExerciseEntry.exercise_name == exercise_name)
        .order_by(WorkoutSession.date.desc())
        .limit(limit)
    )
    return db.exec(query).all()


@router.get("/suggestions", response_model=schemas.NextWeightSuggestion)
def next_weight_suggestion(
    exercise_name: str = Query(min_length=1),
    increment: float | None = Query(default=None, ge=0),
    db: Session = Depends(get_session),
) -> schemas.NextWeightSuggestion:
    query = (
        select(ExerciseEntry, WorkoutSession.date)
        .join(WorkoutSession)
        .where(ExerciseEntry.exercise_name == exercise_name)
    )
    rows = db.exec(query).all()
    history = [(row_date, entry) for entry, row_date in rows]
    return suggest_next_weight(exercise_name, history, increment_override=increment)
