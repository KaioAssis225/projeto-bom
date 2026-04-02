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
