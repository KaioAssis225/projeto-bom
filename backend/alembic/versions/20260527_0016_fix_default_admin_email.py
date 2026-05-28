"""fix_default_admin_email

Revision ID: 20260527_0016
Revises: 20260526_0015
Create Date: 2026-05-27
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "20260527_0016"
down_revision = "20260526_0015"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        sa.text(
            "UPDATE users SET email = 'admin@bomapp.com' WHERE email = 'admin@bom.local'"
        )
    )


def downgrade() -> None:
    op.execute(
        sa.text(
            "UPDATE users SET email = 'admin@bom.local' WHERE email = 'admin@bomapp.com'"
        )
    )
