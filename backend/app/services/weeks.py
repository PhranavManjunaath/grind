"""Shared week numbering used by Workout, Skills, and Analytics.

Weeks are Monday-Sunday, numbered sequentially (1, 2, 3, ...) relative to
a single anchor date stored once in AppConfig (the Monday of "Week 1").
This gives every module the same "Week 1/2/3" labels while still letting
Analytics map a week back to real calendar dates.
"""

from datetime import date as date_type
from datetime import timedelta

from sqlmodel import Session

from .config_service import get_or_create_config


def _monday_of(d: date_type) -> date_type:
    return d - timedelta(days=d.weekday())


def get_or_create_anchor(db: Session) -> date_type:
    return get_or_create_config(db).week_anchor_date


def week_number_for_date(db: Session, d: date_type) -> int:
    anchor = get_or_create_anchor(db)
    return ((_monday_of(d) - anchor).days // 7) + 1


def date_range_for_week(db: Session, week_number: int) -> tuple[date_type, date_type]:
    anchor = get_or_create_anchor(db)
    start = anchor + timedelta(days=(week_number - 1) * 7)
    end = start + timedelta(days=6)
    return start, end


def current_week_number(db: Session) -> int:
    return week_number_for_date(db, date_type.today())
