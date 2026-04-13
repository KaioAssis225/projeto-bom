"""add_supplier_and_item_fields

Revision ID: 20260326_0003
Revises: 20260326_0002
Create Date: 2026-03-26 00:03:00
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = "20260326_0003"
down_revision = "20260326_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Criar tabela supplier
    op.create_table(
        "supplier",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("code", sa.String(length=50), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code", name="uq_supplier_code"),
    )

    # 2. Trigger de updated_at para supplier (reutiliza função set_updated_at já existente)
    op.execute(
        """
        CREATE TRIGGER trg_supplier_updated_at
        BEFORE UPDATE ON supplier
        FOR EACH ROW
        EXECUTE FUNCTION set_updated_at();
        """
    )

    # 3. Adicionar colunas na tabela item
    op.add_column("item", sa.Column("peso_liquido", sa.Numeric(18, 6), nullable=True))
    op.add_column(
        "item",
        sa.Column(
            "unidade_conversao_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("unit_of_measure.id"),
            nullable=True,
        ),
    )
    op.add_column(
        "item",
        sa.Column(
            "supplier_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("supplier.id"),
            nullable=True,
        ),
    )


def downgrade() -> None:
    # Remover FK explicitamente antes de dropar a coluna
    op.drop_constraint("item_supplier_id_fkey", "item", type_="foreignkey")
    op.drop_column("item", "supplier_id")
    op.drop_constraint("item_unidade_conversao_id_fkey", "item", type_="foreignkey")
    op.drop_column("item", "unidade_conversao_id")
    op.drop_column("item", "peso_liquido")

    op.execute("DROP TRIGGER IF EXISTS trg_supplier_updated_at ON supplier;")
    op.drop_table("supplier")
