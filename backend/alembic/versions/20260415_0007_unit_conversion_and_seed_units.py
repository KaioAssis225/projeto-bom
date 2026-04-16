"""unit_conversion table and seed standard units of measure

Revision ID: 20260415_0007
Revises: 20260415_0006
Create Date: 2026-04-15
"""
from alembic import op

revision = "20260415_0007"
down_revision = "20260415_0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── 1. Create unit_conversion table ───────────────────────────────────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS unit_conversion (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            from_unit_id UUID NOT NULL REFERENCES unit_of_measure(id) ON DELETE CASCADE,
            to_unit_id   UUID NOT NULL REFERENCES unit_of_measure(id) ON DELETE CASCADE,
            factor       NUMERIC(18, 10) NOT NULL,
            created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
            CONSTRAINT uq_unit_conversion_pair UNIQUE (from_unit_id, to_unit_id)
        )
    """)

    # ── 2. Clear all data that depends on unit_of_measure (bottom-up) ─────────
    # Deepest dependencies first to avoid FK violations.
    op.execute("DELETE FROM unit_conversion")
    op.execute("DELETE FROM audit_price_change")
    op.execute("DELETE FROM calculation_execution_log")
    op.execute("DELETE FROM item_price_history")
    op.execute("DELETE FROM bom_item")
    op.execute("DELETE FROM bom")
    op.execute("DELETE FROM raw_material")
    op.execute("DELETE FROM finished_product")
    op.execute("DELETE FROM item")
    op.execute("DELETE FROM unit_of_measure")

    # ── 3. Seed 18 standard units with fixed UUIDs ────────────────────────────
    op.execute("""
        INSERT INTO unit_of_measure (id, code, description, decimal_places, created_at, updated_at) VALUES
        -- Contagem
        ('10000000-0000-0000-0000-000000000001', 'UN',  'Unidade',               0, now(), now()),
        ('10000000-0000-0000-0000-000000000002', 'PC',  'Peça',                  0, now(), now()),
        ('10000000-0000-0000-0000-000000000003', 'PAR', 'Par',                   0, now(), now()),
        ('10000000-0000-0000-0000-000000000004', 'DZ',  'Dúzia',                 0, now(), now()),
        ('10000000-0000-0000-0000-000000000005', 'CX',  'Caixa',                 0, now(), now()),
        ('10000000-0000-0000-0000-000000000006', 'KIT', 'Kit',                   0, now(), now()),
        -- Comprimento
        ('10000000-0000-0000-0000-000000000007', 'MM',  'Milímetro',             2, now(), now()),
        ('10000000-0000-0000-0000-000000000008', 'CM',  'Centímetro',            2, now(), now()),
        ('10000000-0000-0000-0000-000000000009', 'M',   'Metro',                 3, now(), now()),
        -- Massa
        ('10000000-0000-0000-0000-000000000010', 'G',   'Grama',                 3, now(), now()),
        ('10000000-0000-0000-0000-000000000011', 'KG',  'Quilograma',            3, now(), now()),
        ('10000000-0000-0000-0000-000000000012', 'TON', 'Tonelada',              6, now(), now()),
        -- Volume
        ('10000000-0000-0000-0000-000000000013', 'ML',  'Mililitro',             2, now(), now()),
        ('10000000-0000-0000-0000-000000000014', 'L',   'Litro',                 3, now(), now()),
        -- Área
        ('10000000-0000-0000-0000-000000000015', 'CM2', 'Centímetro Quadrado',   2, now(), now()),
        ('10000000-0000-0000-0000-000000000016', 'M2',  'Metro Quadrado',        4, now(), now()),
        -- Tempo
        ('10000000-0000-0000-0000-000000000017', 'H',   'Hora',                  2, now(), now()),
        ('10000000-0000-0000-0000-000000000018', 'MIN', 'Minuto',                0, now(), now())
    """)

    # ── 4. Seed bidirectional conversion rules ────────────────────────────────
    op.execute("""
        INSERT INTO unit_conversion (from_unit_id, to_unit_id, factor) VALUES

        -- Contagem: DZ ↔ UN / PC
        ('10000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', 12),
        ('10000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000002', 12),
        ('10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004', 0.0833333333),
        ('10000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000004', 0.0833333333),

        -- Contagem: PAR ↔ UN / PC
        ('10000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 2),
        ('10000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', 2),
        ('10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 0.5),
        ('10000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000003', 0.5),

        -- Comprimento: MM ↔ CM ↔ M
        ('10000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000008', 0.1),
        ('10000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000009', 0.001),
        ('10000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000007', 10),
        ('10000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000009', 0.01),
        ('10000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000007', 1000),
        ('10000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000008', 100),

        -- Massa: G ↔ KG ↔ TON
        ('10000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000011', 0.001),
        ('10000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000012', 0.000001),
        ('10000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000010', 1000),
        ('10000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000012', 0.001),
        ('10000000-0000-0000-0000-000000000012', '10000000-0000-0000-0000-000000000010', 1000000),
        ('10000000-0000-0000-0000-000000000012', '10000000-0000-0000-0000-000000000011', 1000),

        -- Volume: ML ↔ L
        ('10000000-0000-0000-0000-000000000013', '10000000-0000-0000-0000-000000000014', 0.001),
        ('10000000-0000-0000-0000-000000000014', '10000000-0000-0000-0000-000000000013', 1000),

        -- Área: CM2 ↔ M2
        ('10000000-0000-0000-0000-000000000015', '10000000-0000-0000-0000-000000000016', 0.0001),
        ('10000000-0000-0000-0000-000000000016', '10000000-0000-0000-0000-000000000015', 10000),

        -- Tempo: H ↔ MIN
        ('10000000-0000-0000-0000-000000000017', '10000000-0000-0000-0000-000000000018', 60),
        ('10000000-0000-0000-0000-000000000018', '10000000-0000-0000-0000-000000000017', 0.0166666667)
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS unit_conversion")
