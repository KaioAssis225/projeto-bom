from __future__ import annotations

from datetime import date, datetime, timezone
from zoneinfo import ZoneInfo

from app.core.config import settings


def get_timezone() -> ZoneInfo:
    return ZoneInfo(settings.APP_TIMEZONE)


def now_sp() -> datetime:
    return datetime.now(get_timezone())


def today_sp() -> date:
    return now_sp().date()


def now_utc_naive() -> datetime:
    """Hora atual em UTC sem tzinfo. Usar para comparar com colunas
    DateTime(timezone=False) onde valores foram persistidos em UTC.
    """
    return datetime.now(timezone.utc).replace(tzinfo=None)


def to_utc_naive(value: datetime) -> datetime:
    """Normaliza datetime para UTC naive. Se vier sem tzinfo, assume que ja
    esta em UTC."""
    if value.tzinfo is None:
        return value
    return value.astimezone(timezone.utc).replace(tzinfo=None)
