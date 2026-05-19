"""raw_material_multi_supplier

Revision ID: 20260519_0013
Revises: 20260519_0012
Create Date: 2026-05-19
"""

from alembic import op

revision = "20260519_0013"
down_revision = "20260519_0012"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS raw_material_supplier (
            raw_material_id UUID NOT NULL REFERENCES raw_material(item_id) ON DELETE CASCADE,
            supplier_id     UUID NOT NULL REFERENCES supplier(id) ON DELETE CASCADE,
            PRIMARY KEY (raw_material_id, supplier_id)
        )
    """)
    op.execute("""
        INSERT INTO raw_material_supplier (raw_material_id, supplier_id)
        SELECT item_id, supplier_id
        FROM raw_material
        WHERE supplier_id IS NOT NULL
        ON CONFLICT DO NOTHING
    """)
    op.execute("ALTER TABLE raw_material DROP COLUMN IF EXISTS supplier_id")


def downgrade() -> None:
    op.execute("""
        ALTER TABLE raw_material
        ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES supplier(id)
    """)
    op.execute("""
        UPDATE raw_material rm
        SET supplier_id = rms.supplier_id
        FROM (
            SELECT DISTINCT ON (raw_material_id) raw_material_id, supplier_id
            FROM raw_material_supplier
            ORDER BY raw_material_id, supplier_id
        ) rms
        WHERE rm.item_id = rms.raw_material_id
    """)
    op.execute("DROP TABLE IF EXISTS raw_material_supplier")
