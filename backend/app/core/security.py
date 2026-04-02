from datetime import UTC, datetime, timedelta
from typing import Any


def create_access_token(_: dict[str, Any], expires_delta: timedelta | None = None) -> str:
    """
    Placeholder for future JWT generation.
    """
    _ = datetime.now(UTC)
    _ = expires_delta
    return "jwt-placeholder"

