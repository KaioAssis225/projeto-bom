"""add_requisitor_and_requisicoes

Revision ID: 20260602_0020
Revises: 20260528_0019
Create Date: 2026-06-02
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "20260602_0020"
down_revision = "20260528_0019"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add REQUISITOR to existing enum (before VIEWER)
    op.execute(sa.text("ALTER TYPE nivel_enum ADD VALUE IF NOT EXISTS 'REQUISITOR' BEFORE 'VIEWER'"))

    # requisicoes table
    op.create_table(
        "requisicoes",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("group_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="PENDENTE"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["group_id"], ["material_group.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    # requisicao_itens table
    op.create_table(
        "requisicao_itens",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("requisicao_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("item_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("quantidade", sa.Numeric(18, 6), nullable=False),
        sa.Column("unidade_key", sa.String(10), nullable=False),  # "UOM1" or "UOM2"
        sa.Column("notes", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["requisicao_id"], ["requisicoes.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["item_id"], ["item.id"]),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("requisicao_itens")
    op.drop_table("requisicoes")
    # Note: cannot easily remove enum values in PostgreSQL
