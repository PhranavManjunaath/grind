from datetime import date as date_type

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from .. import schemas
from ..database import get_session
from ..models import SkillEntry

router = APIRouter(prefix="/api/skills", tags=["skills"])


@router.post("/entries", response_model=schemas.SkillEntryRead, status_code=201)
def create_entry(
    payload: schemas.SkillEntryCreate, db: Session = Depends(get_session)
) -> SkillEntry:
    entry = SkillEntry(**payload.model_dump())
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.get("/entries", response_model=schemas.SkillEntryPage)
def list_entries(
    start: date_type | None = Query(default=None),
    end: date_type | None = Query(default=None),
    skill_name: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_session),
) -> schemas.SkillEntryPage:
    query = select(SkillEntry)
    if start is not None:
        query = query.where(SkillEntry.date >= start)
    if end is not None:
        query = query.where(SkillEntry.date <= end)
    if skill_name is not None:
        query = query.where(SkillEntry.skill_name == skill_name)

    total = len(db.exec(query).all())
    items = db.exec(
        query.order_by(SkillEntry.date.desc()).offset(offset).limit(limit)
    ).all()
    return schemas.SkillEntryPage(total=total, limit=limit, offset=offset, items=items)


@router.get("/entries/{entry_id}", response_model=schemas.SkillEntryRead)
def get_entry(entry_id: int, db: Session = Depends(get_session)) -> SkillEntry:
    entry = db.get(SkillEntry, entry_id)
    if entry is None:
        raise HTTPException(status_code=404, detail="Skill entry not found")
    return entry


@router.patch("/entries/{entry_id}", response_model=schemas.SkillEntryRead)
def update_entry(
    entry_id: int, payload: schemas.SkillEntryUpdate, db: Session = Depends(get_session)
) -> SkillEntry:
    entry = db.get(SkillEntry, entry_id)
    if entry is None:
        raise HTTPException(status_code=404, detail="Skill entry not found")
    updates = payload.model_dump(exclude_unset=True)
    for key, value in updates.items():
        setattr(entry, key, value)
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.delete("/entries/{entry_id}", status_code=204)
def delete_entry(entry_id: int, db: Session = Depends(get_session)) -> None:
    entry = db.get(SkillEntry, entry_id)
    if entry is None:
        raise HTTPException(status_code=404, detail="Skill entry not found")
    db.delete(entry)
    db.commit()
