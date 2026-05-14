"""add setor table and setor_id to raw_material

Revision ID: 20260514_0010
Revises: 20260512_0009
Create Date: 2026-05-14
"""
from alembic import op

revision = "20260514_0010"
down_revision = "20260512_0009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS setor (
            id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name        VARCHAR(50) NOT NULL,
            active      BOOLEAN NOT NULL DEFAULT true,
            created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
            CONSTRAINT uq_setor_name UNIQUE (name)
        )
        """
    )
    op.execute(
        """
        ALTER TABLE raw_material
            ADD COLUMN IF NOT EXISTS setor_id UUID REFERENCES setor(id)
        """
    )


def downgrade() -> None:
    op.execute("ALTER TABLE raw_material DROP COLUMN IF EXISTS setor_id")
    op.execute("DROP TABLE IF EXISTS setor")
