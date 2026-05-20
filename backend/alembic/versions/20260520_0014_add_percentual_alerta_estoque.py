"""add percentual_alerta to raw_material

Revision ID: 20260520_0014
Revises: 20260519_0013
Create Date: 2026-05-20
"""
from __future__ import annotations

from alembic import op

revision = "20260520_0014"
down_revision = "20260519_0013"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        ALTER TABLE raw_material
        ADD COLUMN IF NOT EXISTS percentual_alerta NUMERIC(5,2) NULL
        CONSTRAINT chk_percentual_alerta
            CHECK (percentual_alerta IS NULL OR (percentual_alerta > 0 AND percentual_alerta < 1))
    """)


def downgrade() -> None:
    op.execute("ALTER TABLE raw_material DROP COLUMN IF EXISTS percentual_alerta")
