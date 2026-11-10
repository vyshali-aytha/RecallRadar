-- RecallRadar supplier utilization report.
-- Target version: MySQL 8.0.46
-- Run after database/mysql/schema.sql has been applied.

DELIMITER $$

-- Remove the superseded Recall Impact procedures when upgrading an existing
-- installation, then recreate the current report procedure.
DROP PROCEDURE IF EXISTS sp_get_recall_exposure_report$$
DROP PROCEDURE IF EXISTS sp_trace_component_batch_exposure$$
DROP PROCEDURE IF EXISTS sp_get_supplier_batch_utilization$$

CREATE PROCEDURE sp_get_supplier_batch_utilization(IN p_supplier_id INT)
BEGIN
    DECLARE v_supplier_exists INT DEFAULT 0;

    IF p_supplier_id IS NULL OR p_supplier_id <= 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Supplier ID must be a positive integer.';
    END IF;

    SELECT COUNT(*)
      INTO v_supplier_exists
      FROM supplier
     WHERE supplier_id = p_supplier_id;

    IF v_supplier_exists = 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Supplier ID does not exist.';
    END IF;

    -- Result set 1: the selected supplier's stored details.
    SELECT
        supplier_id,
        name,
        contact_email,
        phone,
        address
    FROM supplier
    WHERE supplier_id = p_supplier_id;

    -- Result set 2: one row per component-batch/product-batch usage.
    -- LEFT JOINs retain components and component batches without downstream
    -- production usage; quantity_used is reported only where recorded.
    SELECT
        c.component_id,
        c.name AS component_name,
        c.category AS component_category,
        cb.component_batch_id,
        cb.batch_number AS component_batch_number,
        cb.manufacture_date AS component_batch_manufacture_date,
        cb.expiry_date AS component_batch_expiry_date,
        cb.status AS component_batch_status,
        pbc.quantity_used,
        pb.product_batch_id,
        pb.batch_number AS product_batch_number,
        pb.production_date,
        p.product_id,
        p.name AS product_name,
        p.sku AS product_sku
    FROM component AS c
    LEFT JOIN component_batch AS cb
        ON cb.component_id = c.component_id
    LEFT JOIN product_batch_component AS pbc
        ON pbc.component_batch_id = cb.component_batch_id
    LEFT JOIN product_batch AS pb
        ON pb.product_batch_id = pbc.product_batch_id
    LEFT JOIN product AS p
        ON p.product_id = pb.product_id
    WHERE c.supplier_id = p_supplier_id
    ORDER BY c.component_id, cb.component_batch_id, pb.product_batch_id;
END$$

DELIMITER ;

-- Usage examples (the sample data contains supplier ID 1):
-- CALL sp_get_supplier_batch_utilization(1);
-- CALL sp_get_supplier_batch_utilization(NULL); -- raises SQLSTATE 45000
-- CALL sp_get_supplier_batch_utilization(-1);   -- raises SQLSTATE 45000
-- Confirm this ID is absent before using it as a nonexistent-ID test:
-- SELECT supplier_id FROM supplier WHERE supplier_id = 2147483647;
-- CALL sp_get_supplier_batch_utilization(2147483647);
