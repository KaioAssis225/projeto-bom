"""clear_admin_for_setup

Revision ID: 20260528_0018
Revises: 20260527_0017
Create Date: 2026-05-28
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260528_0018"
down_revision = "20260527_0017"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(sa.text("DELETE FROM users"))


def downgrade() -> None:
    pass
