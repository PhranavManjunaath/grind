from datetime import date, timedelta

from sqlmodel import Session

from ..models import AppConfig


def get_or_create_config(db: Session) -> AppConfig:
    config = db.get(AppConfig, 1)
    if config is None:
        today = date.today()
        anchor = today - timedelta(days=today.weekday())
        config = AppConfig(id=1, week_anchor_date=anchor)
        db.add(config)
        db.commit()
        db.refresh(config)
    return config
