"""separate_raw_material_finished_product

Revision ID: 20260415_0006
Revises: 20260415_0005
Create Date: 2026-04-15 12:00:00

Splits type-specific fields out of the monolithic 'item' table into two
dedicated tables:
  - raw_material   : campos exclusivos de matérias-primas
  - finished_product: campos exclusivos de produtos acabados

The 'item' table remains as a central reference (id, code, type, etc.)
so that BOM foreign keys continue to work unchanged.
"""
from __future__ import annotations

from alembic import op


revision = "20260415_0006"
down_revision = "20260415_0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── 1. Tabela raw_material ────────────────────────────────────────────────
    op.execute("""
        CREATE TABLE raw_material (
            item_id              UUID        NOT NULL,
            material_group_id    UUID        NOT NULL,
            supplier_id          UUID,
            unidade_conversao_id UUID,
            peso_liquido         NUMERIC(18, 6),
            CONSTRAINT pk_raw_material         PRIMARY KEY (item_id),
            CONSTRAINT fk_rm_item              FOREIGN KEY (item_id)
                REFERENCES item(id) ON DELETE CASCADE,
            CONSTRAINT fk_rm_material_group    FOREIGN KEY (material_group_id)
                REFERENCES material_group(id),
            CONSTRAINT fk_rm_supplier          FOREIGN KEY (supplier_id)
                REFERENCES supplier(id),
            CONSTRAINT fk_rm_unidade_conversao FOREIGN KEY (unidade_conversao_id)
                REFERENCES unit_of_measure(id)
        )
    """)

    # ── 2. Tabela finished_product ────────────────────────────────────────────
    op.execute("""
        CREATE TABLE finished_product (
            item_id      UUID NOT NULL,
            peso_liquido NUMERIC(18, 6),
            catalogo     VARCHAR(120),
            linha        VARCHAR(120),
            designer     VARCHAR(120),
            CONSTRAINT pk_finished_product PRIMARY KEY (item_id),
            CONSTRAINT fk_fp_item          FOREIGN KEY (item_id)
                REFERENCES item(id) ON DELETE CASCADE
        )
    """)

    # ── 3. Migrar dados existentes ────────────────────────────────────────────
    op.execute("""
        INSERT INTO raw_material
            (item_id, material_group_id, supplier_id, unidade_conversao_id, peso_liquido)
        SELECT
            id,
            material_group_id,
            supplier_id,
            unidade_conversao_id,
            peso_liquido
        FROM item
        WHERE type = 'RAW_MATERIAL'
          AND material_group_id IS NOT NULL
    """)

    op.execute("""
        INSERT INTO finished_product
            (item_id, peso_liquido, catalogo, linha, designer)
        SELECT id, peso_liquido, catalogo, linha, designer
        FROM item
        WHERE type = 'FINISHED_PRODUCT'
    """)

    # ── 4. Remover constraint e colunas migradas do item ──────────────────────
    op.execute(
        "ALTER TABLE item DROP CONSTRAINT IF EXISTS ck_item_raw_material_requires_group"
    )
    for col in ("material_group_id", "supplier_id", "unidade_conversao_id",
                "peso_liquido", "catalogo", "linha", "designer"):
        op.execute(f"ALTER TABLE item DROP COLUMN IF EXISTS {col}")


def downgrade() -> None:
    # Restaurar colunas no item
    op.execute("ALTER TABLE item ADD COLUMN IF NOT EXISTS material_group_id    UUID REFERENCES material_group(id)")
    op.execute("ALTER TABLE item ADD COLUMN IF NOT EXISTS supplier_id          UUID REFERENCES supplier(id)")
    op.execute("ALTER TABLE item ADD COLUMN IF NOT EXISTS unidade_conversao_id UUID REFERENCES unit_of_measure(id)")
    op.execute("ALTER TABLE item ADD COLUMN IF NOT EXISTS peso_liquido         NUMERIC(18,6)")
    op.execute("ALTER TABLE item ADD COLUMN IF NOT EXISTS catalogo             VARCHAR(120)")
    op.execute("ALTER TABLE item ADD COLUMN IF NOT EXISTS linha                VARCHAR(120)")
    op.execute("ALTER TABLE item ADD COLUMN IF NOT EXISTS designer             VARCHAR(120)")

    # Restaurar dados
    op.execute("""
        UPDATE item i
        SET material_group_id    = rm.material_group_id,
            supplier_id          = rm.supplier_id,
            unidade_conversao_id = rm.unidade_conversao_id,
            peso_liquido         = rm.peso_liquido
        FROM raw_material rm WHERE rm.item_id = i.id
    """)
    op.execute("""
        UPDATE item i
        SET peso_liquido = fp.peso_liquido,
            catalogo     = fp.catalogo,
            linha        = fp.linha,
            designer     = fp.designer
        FROM finished_product fp WHERE fp.item_id = i.id
    """)

    op.execute("DROP TABLE IF EXISTS finished_product")
    op.execute("DROP TABLE IF EXISTS raw_material")
