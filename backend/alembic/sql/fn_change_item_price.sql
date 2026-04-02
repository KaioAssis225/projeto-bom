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
