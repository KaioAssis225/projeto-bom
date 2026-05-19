"""add controla_estoque to material_group

Revision ID: 20260519_0012
Revises: 20260514_0011
Create Date: 2026-05-19
"""
from alembic import op

revision = "20260519_0012"
down_revision = "20260514_0011"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        ALTER TABLE material_group
        ADD COLUMN IF NOT EXISTS controla_estoque BOOLEAN NOT NULL DEFAULT FALSE
    """)
    op.execute("""
        UPDATE material_group SET controla_estoque = TRUE WHERE code = 'ALU'
    """)


def downgrade() -> None:
    op.execute("ALTER TABLE material_group DROP COLUMN IF EXISTS controla_estoque")
