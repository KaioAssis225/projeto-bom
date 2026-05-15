"""add estoque_aluminio (estoque_minimo + estoque_movimento)

Revision ID: 20260514_0011
Revises: 20260514_0010
Create Date: 2026-05-14
"""
from alembic import op

revision = "20260514_0011"
down_revision = "20260514_0010"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE raw_material
            ADD COLUMN IF NOT EXISTS estoque_minimo NUMERIC(18,6) NULL
        """
    )
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS estoque_movimento (
            id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            item_id     UUID NOT NULL REFERENCES item(id) ON DELETE CASCADE,
            tipo        VARCHAR(10) NOT NULL CHECK (tipo IN ('entrada', 'saida')),
            quantidade  NUMERIC(18,6) NOT NULL CHECK (quantidade > 0),
            solicitante VARCHAR(120),
            created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_estoque_movimento_item_created
            ON estoque_movimento (item_id, created_at DESC)
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_estoque_movimento_item_created")
    op.execute("DROP TABLE IF EXISTS estoque_movimento")
    op.execute("ALTER TABLE raw_material DROP COLUMN IF EXISTS estoque_minimo")
