"""add_product_catalog_fields

Revision ID: 20260414_0004
Revises: 20260326_0003
Create Date: 2026-04-14 00:04:00
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision = "20260414_0004"
down_revision = "20260326_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("item", sa.Column("catalogo", sa.String(120), nullable=True))
    op.add_column("item", sa.Column("linha", sa.String(120), nullable=True))
    op.add_column("item", sa.Column("designer", sa.String(120), nullable=True))


def downgrade() -> None:
    op.drop_column("item", "designer")
    op.drop_column("item", "linha")
    op.drop_column("item", "catalogo")
