"""add_must_change_password

Revision ID: 20260528_0019
Revises: 20260528_0018
Create Date: 2026-05-28
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260528_0019"
down_revision = "20260528_0018"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("must_change_password", sa.Boolean(), nullable=False, server_default="false"),
    )


def downgrade() -> None:
    op.drop_column("users", "must_change_password")
