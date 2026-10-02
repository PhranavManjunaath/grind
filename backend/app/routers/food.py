from datetime import date as date_type

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from .. import schemas
from ..database import get_session
from ..models import FoodEntry, SavedFood

router = APIRouter(prefix="/api/food", tags=["food"])


@router.post("/entries", response_model=schemas.FoodEntryRead, status_code=201)
def create_entry(
    payload: schemas.FoodEntryCreate, db: Session = Depends(get_session)
) -> FoodEntry:
    data = payload.model_dump(exclude={"save_as_food"})
    entry = FoodEntry(**data)
    db.add(entry)

    if payload.save_as_food:
        existing = db.exec(
            select(SavedFood).where(SavedFood.name == payload.food_name)
        ).first()
        if existing is None:
            db.add(
                SavedFood(
                    name=payload.food_name,
                    default_calories=payload.calories,
                    default_protein=payload.protein,
                    default_carbs=payload.carbs,
                    default_fat=payload.fat,
                    default_serving=payload.serving,
                )
            )

    db.commit()
    db.refresh(entry)
    return entry


@router.get("/entries", response_model=schemas.FoodEntryPage)
def list_entries(
    start: date_type | None = Query(default=None),
    end: date_type | None = Query(default=None),
    meal: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_session),
) -> schemas.FoodEntryPage:
    query = select(FoodEntry)
    if start is not None:
        query = query.where(FoodEntry.date >= start)
    if end is not None:
        query = query.where(FoodEntry.date <= end)
    if meal is not None:
        query = query.where(FoodEntry.meal == meal)

    total = len(db.exec(query).all())
    items = db.exec(
        query.order_by(FoodEntry.date.desc()).offset(offset).limit(limit)
    ).all()
    return schemas.FoodEntryPage(total=total, limit=limit, offset=offset, items=items)


@router.get("/entries/{entry_id}", response_model=schemas.FoodEntryRead)
def get_entry(entry_id: int, db: Session = Depends(get_session)) -> FoodEntry:
    entry = db.get(FoodEntry, entry_id)
    if entry is None:
        raise HTTPException(status_code=404, detail="Food entry not found")
    return entry


@router.patch("/entries/{entry_id}", response_model=schemas.FoodEntryRead)
def update_entry(
    entry_id: int, payload: schemas.FoodEntryUpdate, db: Session = Depends(get_session)
) -> FoodEntry:
    entry = db.get(FoodEntry, entry_id)
    if entry is None:
        raise HTTPException(status_code=404, detail="Food entry not found")
    updates = payload.model_dump(exclude_unset=True)
    for key, value in updates.items():
        setattr(entry, key, value)
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.delete("/entries/{entry_id}", status_code=204)
def delete_entry(entry_id: int, db: Session = Depends(get_session)) -> None:
    entry = db.get(FoodEntry, entry_id)
    if entry is None:
        raise HTTPException(status_code=404, detail="Food entry not found")
    db.delete(entry)
    db.commit()


@router.get("/entries/daily-totals/list", response_model=list[schemas.DailyFoodTotal])
def daily_totals_endpoint(
    start: date_type | None = Query(default=None),
    end: date_type | None = Query(default=None),
    db: Session = Depends(get_session),
) -> list[schemas.DailyFoodTotal]:
    from ..services.nutrition import daily_totals

    query = select(FoodEntry)
    if start is not None:
        query = query.where(FoodEntry.date >= start)
    if end is not None:
        query = query.where(FoodEntry.date <= end)
    entries = db.exec(query).all()
    return daily_totals(entries)


# ---------- Saved foods ----------


@router.post("/saved", response_model=schemas.SavedFoodRead, status_code=201)
def create_saved_food(
    payload: schemas.SavedFoodCreate, db: Session = Depends(get_session)
) -> SavedFood:
    saved = SavedFood(**payload.model_dump())
    db.add(saved)
    db.commit()
    db.refresh(saved)
    return saved


@router.get("/saved", response_model=list[schemas.SavedFoodRead])
def list_saved_foods(db: Session = Depends(get_session)) -> list[SavedFood]:
    return db.exec(select(SavedFood).order_by(SavedFood.name)).all()


@router.patch("/saved/{saved_id}", response_model=schemas.SavedFoodRead)
def update_saved_food(
    saved_id: int, payload: schemas.SavedFoodUpdate, db: Session = Depends(get_session)
) -> SavedFood:
    saved = db.get(SavedFood, saved_id)
    if saved is None:
        raise HTTPException(status_code=404, detail="Saved food not found")
    updates = payload.model_dump(exclude_unset=True)
    for key, value in updates.items():
        setattr(saved, key, value)
    db.add(saved)
    db.commit()
    db.refresh(saved)
    return saved


@router.delete("/saved/{saved_id}", status_code=204)
def delete_saved_food(saved_id: int, db: Session = Depends(get_session)) -> None:
    saved = db.get(SavedFood, saved_id)
    if saved is None:
        raise HTTPException(status_code=404, detail="Saved food not found")
    db.delete(saved)
    db.commit()
