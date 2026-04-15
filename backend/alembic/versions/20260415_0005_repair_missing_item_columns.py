"""repair_missing_item_columns

Revision ID: 20260415_0005
Revises: 20260414_0004
Create Date: 2026-04-15 00:00:00

Schema drift repair: alembic_version was stamped to 0004 but the DDL
statements from 0003/0004 were never executed against the database.
This migration adds all missing item columns using IF NOT EXISTS so it
is safe to run regardless of the current column state.
"""
from __future__ import annotations

from alembic import op


revision = "20260415_0005"
down_revision = "20260414_0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # supplier table (may already exist)
    op.execute("""
        CREATE TABLE IF NOT EXISTS supplier (
            id          UUID         NOT NULL DEFAULT gen_random_uuid(),
            code        VARCHAR(50)  NOT NULL,
            name        VARCHAR(120) NOT NULL,
            description TEXT,
            active      BOOLEAN      NOT NULL DEFAULT true,
            created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
            updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
            CONSTRAINT pk_supplier      PRIMARY KEY (id),
            CONSTRAINT uq_supplier_code UNIQUE (code)
        )
    """)

    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_trigger WHERE tgname = 'trg_supplier_updated_at'
            ) THEN
                CREATE TRIGGER trg_supplier_updated_at
                BEFORE UPDATE ON supplier
                FOR EACH ROW
                EXECUTE FUNCTION set_updated_at();
            END IF;
        END $$
    """)

    # item columns added in 0003
    op.execute("ALTER TABLE item ADD COLUMN IF NOT EXISTS peso_liquido          NUMERIC(18,6)")
    op.execute("ALTER TABLE item ADD COLUMN IF NOT EXISTS unidade_conversao_id  UUID REFERENCES unit_of_measure(id)")
    op.execute("ALTER TABLE item ADD COLUMN IF NOT EXISTS supplier_id           UUID REFERENCES supplier(id)")

    # item columns added in 0004
    op.execute("ALTER TABLE item ADD COLUMN IF NOT EXISTS catalogo  VARCHAR(120)")
    op.execute("ALTER TABLE item ADD COLUMN IF NOT EXISTS linha     VARCHAR(120)")
    op.execute("ALTER TABLE item ADD COLUMN IF NOT EXISTS designer  VARCHAR(120)")


def downgrade() -> None:
    op.execute("ALTER TABLE item DROP COLUMN IF EXISTS designer")
    op.execute("ALTER TABLE item DROP COLUMN IF EXISTS linha")
    op.execute("ALTER TABLE item DROP COLUMN IF EXISTS catalogo")
    op.execute("ALTER TABLE item DROP COLUMN IF EXISTS supplier_id")
    op.execute("ALTER TABLE item DROP COLUMN IF EXISTS unidade_conversao_id")
    op.execute("ALTER TABLE item DROP COLUMN IF EXISTS peso_liquido")
