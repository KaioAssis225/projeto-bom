from __future__ import annotations

from datetime import date, datetime
from zoneinfo import ZoneInfo

from app.core.config import settings


def get_timezone() -> ZoneInfo:
    return ZoneInfo(settings.APP_TIMEZONE)


def now_sp() -> datetime:
    return datetime.now(get_timezone())


def today_sp() -> date:
    return now_sp().date()
