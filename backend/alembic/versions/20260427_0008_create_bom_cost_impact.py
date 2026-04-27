"""create bom_cost_impact table

Revision ID: 20260427_0008
Revises: 20260415_0007
Create Date: 2026-04-27
"""
from alembic import op


revision = "20260427_0008"
down_revision = "20260415_0007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS bom_cost_impact (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            finished_product_item_id UUID NOT NULL REFERENCES item(id) ON DELETE CASCADE,
            raw_material_item_id     UUID NOT NULL REFERENCES item(id) ON DELETE CASCADE,
            price_history_id         UUID NULL REFERENCES item_price_history(id) ON DELETE SET NULL,
            old_unit_price           NUMERIC(18, 6) NULL,
            new_unit_price           NUMERIC(18, 6) NOT NULL,
            old_pa_cost              NUMERIC(18, 6) NULL,
            new_pa_cost              NUMERIC(18, 6) NOT NULL,
            delta_cost               NUMERIC(18, 6) NOT NULL,
            delta_percent            NUMERIC(12, 4) NULL,
            reference_date           TIMESTAMP NOT NULL,
            changed_by               VARCHAR(100) NOT NULL,
            changed_reason           VARCHAR(255) NULL,
            created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_bom_cost_impact_pa_created "
        "ON bom_cost_impact (finished_product_item_id, created_at DESC)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_bom_cost_impact_mp_created "
        "ON bom_cost_impact (raw_material_item_id, created_at DESC)"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_bom_cost_impact_mp_created")
    op.execute("DROP INDEX IF EXISTS ix_bom_cost_impact_pa_created")
    op.execute("DROP TABLE IF EXISTS bom_cost_impact")
