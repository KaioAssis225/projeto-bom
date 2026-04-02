"""initial_schema

Revision ID: 20260326_0001
Revises:
Create Date: 2026-03-26 00:01:00
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = "20260326_0001"
down_revision = None
branch_labels = None
depends_on = None


UPDATED_AT_TABLES = (
    "unit_of_measure",
    "material_group",
    "item",
    "bom",
    "bom_item",
)


def upgrade() -> None:
    op.execute('CREATE EXTENSION IF NOT EXISTS "pgcrypto";')

    item_type_enum = sa.Enum(
        "RAW_MATERIAL",
        "FINISHED_PRODUCT",
        "SEMI_FINISHED",
        "PACKAGING",
        "SERVICE",
        name="item_type_enum",
    )
    calculation_status_enum = sa.Enum(
        "SUCCESS",
        "ERROR",
        "PARTIAL",
        name="calculation_status_enum",
    )
    item_type_enum.create(op.get_bind(), checkfirst=True)
    calculation_status_enum.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "unit_of_measure",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("code", sa.String(length=20), nullable=False),
        sa.Column("description", sa.String(length=100), nullable=False),
        sa.Column("decimal_places", sa.SmallInteger(), server_default=sa.text("2"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code", name="uq_unit_of_measure_code"),
    )

    op.create_table(
        "material_group",
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
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code", name="uq_material_group_code"),
    )

    op.create_table(
        "item",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("code", sa.String(length=60), nullable=False),
        sa.Column("description", sa.String(length=255), nullable=False),
        sa.Column(
            "type",
            postgresql.ENUM(
                "RAW_MATERIAL",
                "FINISHED_PRODUCT",
                "SEMI_FINISHED",
                "PACKAGING",
                "SERVICE",
                name="item_type_enum",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column("unit_of_measure_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("material_group_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint(
            "type <> 'RAW_MATERIAL' OR material_group_id IS NOT NULL",
            name="ck_item_raw_material_requires_group",
        ),
        sa.ForeignKeyConstraint(["material_group_id"], ["material_group.id"]),
        sa.ForeignKeyConstraint(["unit_of_measure_id"], ["unit_of_measure.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code", name="uq_item_code"),
    )

    op.create_table(
        "bom",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("parent_item_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("version_code", sa.String(length=30), server_default=sa.text("'1.0'"), nullable=False),
        sa.Column("description", sa.String(length=255), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("valid_from", sa.Date(), nullable=False),
        sa.Column("valid_to", sa.Date(), nullable=True),
        sa.Column("created_by", sa.String(length=100), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("valid_to IS NULL OR valid_to >= valid_from", name="ck_bom_valid_range"),
        sa.ForeignKeyConstraint(["parent_item_id"], ["item.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("parent_item_id", "version_code", name="uq_bom_parent_version"),
    )

    op.create_table(
        "bom_item",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("bom_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("parent_item_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("child_item_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("line_number", sa.Integer(), nullable=False),
        sa.Column("quantity", sa.Numeric(precision=18, scale=6), nullable=False),
        sa.Column("scrap_percent", sa.Numeric(precision=9, scale=4), server_default=sa.text("0"), nullable=False),
        sa.Column(
            "loss_factor",
            sa.Numeric(precision=18, scale=6),
            sa.Computed("(1 + (scrap_percent / 100::numeric))", persisted=True),
            nullable=False,
        ),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("parent_item_id <> child_item_id", name="ck_bom_item_parent_child_different"),
        sa.CheckConstraint("quantity > 0", name="ck_bom_item_quantity_positive"),
        sa.CheckConstraint(
            "scrap_percent >= 0 AND scrap_percent <= 99.9999",
            name="ck_bom_item_scrap_percent_range",
        ),
        sa.ForeignKeyConstraint(["bom_id"], ["bom.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["child_item_id"], ["item.id"]),
        sa.ForeignKeyConstraint(["parent_item_id"], ["item.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("bom_id", "line_number", name="uq_bom_item_line_number"),
        sa.UniqueConstraint(
            "bom_id",
            "parent_item_id",
            "child_item_id",
            name="uq_bom_item_parent_child",
        ),
    )

    op.create_table(
        "item_price_history",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("item_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("price_value", sa.Numeric(precision=18, scale=6), nullable=False),
        sa.Column("valid_from", sa.DateTime(timezone=False), nullable=False),
        sa.Column("valid_to", sa.DateTime(timezone=False), nullable=True),
        sa.Column("is_current", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("changed_reason", sa.String(length=255), nullable=False),
        sa.Column("created_by", sa.String(length=100), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("price_value >= 0", name="ck_item_price_history_non_negative"),
        sa.ForeignKeyConstraint(["item_id"], ["item.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "uq_item_price_history_current_item",
        "item_price_history",
        ["item_id"],
        unique=True,
        postgresql_where=sa.text("is_current = true"),
    )

    op.create_table(
        "calculation_execution_log",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("requested_by", sa.String(length=100), nullable=False),
        sa.Column("root_item_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("material_group_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("simulation_reference", sa.String(length=100), nullable=True),
        sa.Column("request_payload", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("generated_file_name", sa.String(length=255), nullable=True),
        sa.Column(
            "status",
            postgresql.ENUM(
                "SUCCESS",
                "ERROR",
                "PARTIAL",
                name="calculation_status_enum",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column("message", sa.Text(), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=False), nullable=False),
        sa.Column("finished_at", sa.DateTime(timezone=False), nullable=True),
        sa.Column("duration_ms", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["material_group_id"], ["material_group.id"]),
        sa.ForeignKeyConstraint(["root_item_id"], ["item.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "audit_price_change",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("item_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("old_price", sa.Numeric(precision=18, scale=6), nullable=True),
        sa.Column("new_price", sa.Numeric(precision=18, scale=6), nullable=False),
        sa.Column("old_valid_from", sa.DateTime(timezone=False), nullable=True),
        sa.Column("old_valid_to", sa.DateTime(timezone=False), nullable=True),
        sa.Column("new_valid_from", sa.DateTime(timezone=False), nullable=False),
        sa.Column("changed_by", sa.String(length=100), nullable=False),
        sa.Column("changed_reason", sa.String(length=255), nullable=False),
        sa.Column("changed_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["item_id"], ["item.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.execute(
        """
        CREATE OR REPLACE FUNCTION set_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
        """
    )

    for table_name in UPDATED_AT_TABLES:
        op.execute(
            f"""
            CREATE TRIGGER trg_{table_name}_updated_at
            BEFORE UPDATE ON {table_name}
            FOR EACH ROW
            EXECUTE FUNCTION set_updated_at();
            """
        )


def downgrade() -> None:
    for table_name in reversed(UPDATED_AT_TABLES):
        op.execute(f"DROP TRIGGER IF EXISTS trg_{table_name}_updated_at ON {table_name};")

    op.execute("DROP FUNCTION IF EXISTS set_updated_at();")

    op.drop_table("audit_price_change")
    op.drop_table("calculation_execution_log")
    op.drop_index("uq_item_price_history_current_item", table_name="item_price_history")
    op.drop_table("item_price_history")
    op.drop_table("bom_item")
    op.drop_table("bom")
    op.drop_table("item")
    op.drop_table("material_group")
    op.drop_table("unit_of_measure")

    sa.Enum(name="calculation_status_enum").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="item_type_enum").drop(op.get_bind(), checkfirst=True)
