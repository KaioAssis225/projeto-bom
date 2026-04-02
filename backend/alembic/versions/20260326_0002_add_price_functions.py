"""add_price_functions

Revision ID: 20260326_0002
Revises: 20260326_0001
Create Date: 2026-03-26 00:02:00
"""
from __future__ import annotations

from alembic import op


# revision identifiers, used by Alembic.
revision = "20260326_0002"
down_revision = "20260326_0001"
branch_labels = None
depends_on = None


FUNCTION_SQL = """
CREATE OR REPLACE FUNCTION fn_change_item_price(
    p_item_id UUID,
    p_new_price NUMERIC(18,6),
    p_new_valid_from TIMESTAMP,
    p_changed_by VARCHAR(100),
    p_changed_reason VARCHAR(255)
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    v_current_record item_price_history%ROWTYPE;
    v_new_price_id UUID;
BEGIN
    IF p_new_price < 0 THEN
        RAISE EXCEPTION 'price_value must be greater than or equal to zero';
    END IF;

    SELECT *
      INTO v_current_record
      FROM item_price_history
     WHERE item_id = p_item_id
       AND is_current = TRUE
     FOR UPDATE;

    IF FOUND THEN
        UPDATE item_price_history
           SET valid_to = p_new_valid_from,
               is_current = FALSE
         WHERE id = v_current_record.id;
    END IF;

    INSERT INTO item_price_history (
        item_id,
        price_value,
        valid_from,
        valid_to,
        is_current,
        changed_reason,
        created_by
    )
    VALUES (
        p_item_id,
        p_new_price,
        p_new_valid_from,
        NULL,
        TRUE,
        p_changed_reason,
        p_changed_by
    )
    RETURNING id INTO v_new_price_id;

    INSERT INTO audit_price_change (
        item_id,
        old_price,
        new_price,
        old_valid_from,
        old_valid_to,
        new_valid_from,
        changed_by,
        changed_reason
    )
    VALUES (
        p_item_id,
        v_current_record.price_value,
        p_new_price,
        v_current_record.valid_from,
        v_current_record.valid_to,
        p_new_valid_from,
        p_changed_by,
        p_changed_reason
    );

    RETURN v_new_price_id;
END;
$$;
"""


VIEW_SQL = """
CREATE OR REPLACE VIEW vw_current_item_price AS
SELECT
    iph.item_id,
    iph.id AS item_price_history_id,
    iph.price_value,
    iph.valid_from,
    iph.valid_to,
    iph.is_current,
    iph.changed_reason,
    iph.created_by,
    iph.created_at
FROM item_price_history AS iph
WHERE iph.is_current = TRUE;
"""


def upgrade() -> None:
    op.execute(FUNCTION_SQL)
    op.execute(VIEW_SQL)


def downgrade() -> None:
    op.execute("DROP VIEW IF EXISTS vw_current_item_price;")
    op.execute(
        """
        DROP FUNCTION IF EXISTS fn_change_item_price(
            UUID,
            NUMERIC,
            TIMESTAMP,
            VARCHAR,
            VARCHAR
        );
        """
    )
