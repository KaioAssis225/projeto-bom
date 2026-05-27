"""add_auth_tables

Revision ID: 20260526_0015
Revises: 20260520_0014
Create Date: 2026-05-26
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "20260526_0015"
down_revision = "20260520_0014"
branch_labels = None
depends_on = None

# PostgreSQL enum types
area_enum = postgresql.ENUM(
    "CUSTOS", "ESTOQUE", "CADASTRO", "GERAL",
    name="area_enum",
    create_type=False,
)
nivel_enum = postgresql.ENUM(
    "VIEWER", "ESTOQUISTA", "ANALISTA", "GESTOR", "ADMIN",
    name="nivel_enum",
    create_type=False,
)


def upgrade() -> None:
    # Create enum types
    area_enum.create(op.get_bind(), checkfirst=True)
    nivel_enum.create(op.get_bind(), checkfirst=True)

    # --- users ---
    op.create_table(
        "users",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("password_hash", sa.Text(), nullable=False),
        sa.Column("full_name", sa.String(100), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)

    # --- user_roles ---
    op.create_table(
        "user_roles",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "area",
            sa.Enum("CUSTOS", "ESTOQUE", "CADASTRO", "GERAL", name="area_enum"),
            nullable=False,
        ),
        sa.Column(
            "nivel",
            sa.Enum("VIEWER", "ESTOQUISTA", "ANALISTA", "GESTOR", "ADMIN", name="nivel_enum"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    # --- refresh_tokens ---
    op.create_table(
        "refresh_tokens",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("token_hash", sa.Text(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token_hash"),
    )


def downgrade() -> None:
    op.drop_table("refresh_tokens")
    op.drop_table("user_roles")
    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_table("users")

    # Drop enum types
    sa.Enum(name="nivel_enum").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="area_enum").drop(op.get_bind(), checkfirst=True)
