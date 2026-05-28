"""reset_default_admin

Revision ID: 20260527_0017
Revises: 20260527_0016
Create Date: 2026-05-27
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260527_0017"
down_revision = "20260527_0016"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Remove stale default admin so startup seed recreates it with correct PEPPER hash
    op.execute(
        sa.text("DELETE FROM users WHERE email IN ('admin@bom.local', 'admin@bomapp.com')")
    )


def downgrade() -> None:
    pass
