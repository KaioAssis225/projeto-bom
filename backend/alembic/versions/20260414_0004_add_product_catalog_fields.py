"""add_product_catalog_fields

Revision ID: 20260414_0004
Revises: 20260326_0003
Create Date: 2026-04-14 00:04:00
"""
from __future__ import annotations

from alembic import op


# revision identifiers, used by Alembic.
revision = "20260414_0004"
down_revision = "20260326_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE item ADD COLUMN IF NOT EXISTS catalogo VARCHAR(120)")
    op.execute("ALTER TABLE item ADD COLUMN IF NOT EXISTS linha    VARCHAR(120)")
    op.execute("ALTER TABLE item ADD COLUMN IF NOT EXISTS designer VARCHAR(120)")


def downgrade() -> None:
    op.execute("ALTER TABLE item DROP COLUMN IF EXISTS designer")
    op.execute("ALTER TABLE item DROP COLUMN IF EXISTS linha")
    op.execute("ALTER TABLE item DROP COLUMN IF EXISTS catalogo")
