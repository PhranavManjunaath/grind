from fastapi import APIRouter, Depends
from sqlmodel import Session

from .. import schemas
from ..database import get_session
from ..models import AppConfig
from ..services.config_service import get_or_create_config

router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get("", response_model=schemas.AppConfigRead)
def read_config(db: Session = Depends(get_session)) -> AppConfig:
    return get_or_create_config(db)


@router.put("", response_model=schemas.AppConfigRead)
def update_config(
    payload: schemas.AppConfigUpdate, db: Session = Depends(get_session)
) -> AppConfig:
    config = get_or_create_config(db)
    updates = payload.model_dump(exclude_unset=True)
    for key, value in updates.items():
        setattr(config, key, value)
    db.add(config)
    db.commit()
    db.refresh(config)
    return config
