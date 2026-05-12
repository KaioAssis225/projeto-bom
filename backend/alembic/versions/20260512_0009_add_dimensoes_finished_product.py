"""add dimensoes to finished_product

Revision ID: 20260512_0009
Revises: 20260427_0008
Create Date: 2026-05-12
"""
from alembic import op

revision = "20260512_0009"
down_revision = "20260427_0008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE finished_product
            ADD COLUMN IF NOT EXISTS largura_mm     NUMERIC(10, 2) NULL,
            ADD COLUMN IF NOT EXISTS profundidade_mm NUMERIC(10, 2) NULL,
            ADD COLUMN IF NOT EXISTS altura_mm      NUMERIC(10, 2) NULL
        """
    )


def downgrade() -> None:
    op.execute(
        """
        ALTER TABLE finished_product
            DROP COLUMN IF EXISTS largura_mm,
            DROP COLUMN IF EXISTS profundidade_mm,
            DROP COLUMN IF EXISTS altura_mm
        """
    )
