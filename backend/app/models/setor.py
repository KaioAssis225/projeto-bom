from __future__ import annotations

from sqlalchemy import Boolean, String, UniqueConstraint, text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import TimestampMixin, UUIDPrimaryKeyMixin


class Setor(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "setor"
    __table_args__ = (
        UniqueConstraint("name", name="uq_setor_name"),
    )

    name: Mapped[str] = mapped_column(String(50), nullable=False)
    active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default=text("true"),
    )
