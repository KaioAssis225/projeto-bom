"""add_supplier_and_item_fields

Revision ID: 20260326_0003
Revises: 20260326_0002
Create Date: 2026-03-26 00:03:00
"""
from __future__ import annotations

from alembic import op


# revision identifiers, used by Alembic.
revision = "20260326_0003"
down_revision = "20260326_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Criar tabela supplier (idempotente)
    op.execute("""
        CREATE TABLE IF NOT EXISTS supplier (
            id          UUID        NOT NULL DEFAULT gen_random_uuid(),
            code        VARCHAR(50) NOT NULL,
            name        VARCHAR(120) NOT NULL,
            description TEXT,
            active      BOOLEAN     NOT NULL DEFAULT true,
            created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
            CONSTRAINT pk_supplier        PRIMARY KEY (id),
            CONSTRAINT uq_supplier_code   UNIQUE (code)
        )
    """)

    # 2. Trigger de updated_at para supplier (idempotente)
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

    # 3. Adicionar colunas na tabela item (idempotente via ADD COLUMN IF NOT EXISTS)
    op.execute("ALTER TABLE item ADD COLUMN IF NOT EXISTS peso_liquido NUMERIC(18, 6)")
    op.execute(
        "ALTER TABLE item ADD COLUMN IF NOT EXISTS"
        " unidade_conversao_id UUID REFERENCES unit_of_measure(id)"
    )
    op.execute(
        "ALTER TABLE item ADD COLUMN IF NOT EXISTS"
        " supplier_id UUID REFERENCES supplier(id)"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE item DROP COLUMN IF EXISTS supplier_id")
    op.execute("ALTER TABLE item DROP COLUMN IF EXISTS unidade_conversao_id")
    op.execute("ALTER TABLE item DROP COLUMN IF EXISTS peso_liquido")
    op.execute("DROP TRIGGER IF EXISTS trg_supplier_updated_at ON supplier")
    op.execute("DROP TABLE IF EXISTS supplier")
