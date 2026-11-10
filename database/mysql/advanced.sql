-- RecallRadar Advanced SQL: manufacturing transaction demonstrations
-- Run after schema.sql and recallradar_sample_data.sql, with the RecallRadar
-- database selected as the default schema.
-- This script creates no tables and changes no schema or existing data.
-- It uses the sample FrostGuard product, sensor component batch, and warehouse.
--
-- IMPORTANT TRANSACTION BEHAVIOR:
-- MySQL does not automatically roll back an entire transaction when a SQL
-- statement fails. If any statement fails after START TRANSACTION, stop and
-- immediately execute ROLLBACK. Do not execute COMMIT after a failure.
-- Run the ROLLBACK and COMMIT demonstrations separately as described below.


-- ============================================================================
-- PRE-FLIGHT: STORAGE ENGINES
-- ============================================================================
-- The three tables written by this script must be transactional. Expect exactly
-- three rows and ENGINE = InnoDB for product_batch, product_batch_component,
-- and inventory. Do not run either transaction unless this is true.
SELECT
    TABLE_NAME,
    ENGINE,
    CASE WHEN ENGINE = 'InnoDB' THEN 'OK' ELSE 'STOP: requires InnoDB' END
        AS preflight_result
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN (
      'product_batch',
      'product_batch_component',
      'inventory'
  )
ORDER BY TABLE_NAME;


-- ============================================================================
-- DEMONSTRATION A: ROLLBACK
-- ============================================================================
-- Run this section through its verification SELECTs on its own. The expected
-- verification output is three rows with remaining_rows = 0.

-- Confirm all required existing sample records are present. Each value should
-- be 1 before proceeding; if any value is 0, stop without starting a transaction.
SELECT
    EXISTS (SELECT 1 FROM product WHERE sku = 'FGVM-TEMP-001')
        AS product_exists,
    EXISTS (SELECT 1 FROM component_batch
            WHERE batch_number = 'NSPC-TS-2026-0812')
        AS component_batch_exists,
    EXISTS (SELECT 1 FROM inventory_location
            WHERE name = 'FrostGuard Finished Goods Warehouse')
        AS inventory_location_exists;

-- Generate a unique batch number so repeated runs cannot conflict.
SET @rollback_batch_number = CONCAT('RR-ROLLBACK-', UUID());

-- Resolve the IDs of those existing sample records.
SELECT product_id
INTO @rollback_product_id
FROM product
WHERE sku = 'FGVM-TEMP-001';

SELECT component_batch_id
INTO @rollback_component_batch_id
FROM component_batch
WHERE batch_number = 'NSPC-TS-2026-0812';

SELECT location_id
INTO @rollback_location_id
FROM inventory_location
WHERE name = 'FrostGuard Finished Goods Warehouse';

-- Begin the manufacturing transaction.
START TRANSACTION;

-- 1. Record production of 10 units of the existing product.
INSERT INTO product_batch (
    batch_number,
    production_date,
    quantity_produced,
    status,
    product_id
)
VALUES (
    @rollback_batch_number,
    CURRENT_DATE,
    10,
    'active',
    @rollback_product_id
);

-- Capture the generated product_batch_id for both dependent inserts.
SET @rollback_product_batch_id = LAST_INSERT_ID();

-- 2. Record usage of 10 sensors from the existing component batch.
-- Component stock is not decremented because the schema has no remaining-stock field.
INSERT INTO product_batch_component (
    product_batch_id,
    component_batch_id,
    quantity_used
)
VALUES (
    @rollback_product_batch_id,
    @rollback_component_batch_id,
    10.00
);

-- 3. Record 10 finished units at the existing finished-goods warehouse.
INSERT INTO inventory (
    quantity_on_hand,
    product_batch_id,
    location_id
)
VALUES (
    10,
    @rollback_product_batch_id,
    @rollback_location_id
);

-- Undo all three inserts.
ROLLBACK;

-- Expected: each count is 0, showing that none of the three records remains.
SELECT
    'product_batch' AS table_name,
    COUNT(*) AS remaining_rows,
    'Expected 0 after ROLLBACK' AS expected_result
FROM product_batch
WHERE batch_number = @rollback_batch_number
UNION ALL
SELECT
    'product_batch_component',
    COUNT(*),
    'Expected 0 after ROLLBACK'
FROM product_batch_component
WHERE product_batch_id = @rollback_product_batch_id
UNION ALL
SELECT
    'inventory',
    COUNT(*),
    'Expected 0 after ROLLBACK'
FROM inventory
WHERE product_batch_id = @rollback_product_batch_id;


-- ============================================================================
-- DEMONSTRATION B: COMMIT
-- ============================================================================
-- Run this section separately after reviewing the ROLLBACK results. If any
-- statement fails after START TRANSACTION, immediately execute ROLLBACK and
-- do not execute COMMIT. On success, all three verification queries below
-- should each return exactly one matching row.

-- Confirm all required existing sample records are present before the transaction.
-- Each value should be 1; if any value is 0, stop without starting a transaction.
SELECT
    EXISTS (SELECT 1 FROM product WHERE sku = 'FGVM-TEMP-001')
        AS product_exists,
    EXISTS (SELECT 1 FROM component_batch
            WHERE batch_number = 'NSPC-TS-2026-0812')
        AS component_batch_exists,
    EXISTS (SELECT 1 FROM inventory_location
            WHERE name = 'FrostGuard Finished Goods Warehouse')
        AS inventory_location_exists;

-- Generate a separate unique batch number for this committed run.
SET @commit_batch_number = CONCAT('RR-COMMIT-', UUID());

-- Resolve the IDs of the existing sample records.
SELECT product_id
INTO @commit_product_id
FROM product
WHERE sku = 'FGVM-TEMP-001';

SELECT component_batch_id
INTO @commit_component_batch_id
FROM component_batch
WHERE batch_number = 'NSPC-TS-2026-0812';

SELECT location_id
INTO @commit_location_id
FROM inventory_location
WHERE name = 'FrostGuard Finished Goods Warehouse';

-- Begin the second manufacturing transaction.
START TRANSACTION;

-- 1. Record production of 10 units of the existing product.
INSERT INTO product_batch (
    batch_number,
    production_date,
    quantity_produced,
    status,
    product_id
)
VALUES (
    @commit_batch_number,
    CURRENT_DATE,
    10,
    'active',
    @commit_product_id
);

-- Capture the generated product_batch_id for both dependent inserts.
SET @commit_product_batch_id = LAST_INSERT_ID();

-- 2. Record usage of 10 sensors from the existing component batch.
INSERT INTO product_batch_component (
    product_batch_id,
    component_batch_id,
    quantity_used
)
VALUES (
    @commit_product_batch_id,
    @commit_component_batch_id,
    10.00
);

-- 3. Record 10 finished units at the existing finished-goods warehouse.
INSERT INTO inventory (
    quantity_on_hand,
    product_batch_id,
    location_id
)
VALUES (
    10,
    @commit_product_batch_id,
    @commit_location_id
);

-- Only execute COMMIT if every statement above succeeded.
COMMIT;

-- Expected: exactly one row showing this batch, quantity 10, and status active.
SELECT
    pb.product_batch_id,
    pb.batch_number,
    pb.production_date,
    pb.quantity_produced,
    pb.status,
    p.name AS product_name,
    'Expected 1 row; quantity_produced = 10; status = active'
        AS expected_result
FROM product_batch AS pb
JOIN product AS p
  ON p.product_id = pb.product_id
WHERE pb.product_batch_id = @commit_product_batch_id;

-- Expected: exactly one row showing 10.00 units used from the sample sensor lot.
SELECT
    pbc.product_batch_id,
    cb.batch_number AS component_batch_number,
    c.name AS component_name,
    pbc.quantity_used,
    'Expected 1 row; quantity_used = 10.00'
        AS expected_result
FROM product_batch_component AS pbc
JOIN component_batch AS cb
  ON cb.component_batch_id = pbc.component_batch_id
JOIN component AS c
  ON c.component_id = cb.component_id
WHERE pbc.product_batch_id = @commit_product_batch_id;

-- Expected: exactly one row showing 10 units at the sample finished-goods warehouse.
SELECT
    i.inventory_id,
    i.quantity_on_hand,
    i.product_batch_id,
    il.name AS inventory_location,
    i.last_updated,
    'Expected 1 row; quantity_on_hand = 10'
        AS expected_result
FROM inventory AS i
JOIN inventory_location AS il
  ON il.location_id = i.location_id
WHERE i.product_batch_id = @commit_product_batch_id;


-- ============================================================================
-- VIEW 1: PRODUCT BATCH TRACEABILITY
-- ============================================================================
-- Shows each recorded component-batch usage for a finished product batch,
-- including the product, component, supplier, and component-batch dates.
-- One row represents one product_batch_component relationship.
CREATE OR REPLACE VIEW v_product_batch_traceability AS
SELECT
    pb.product_batch_id,
    pb.batch_number AS product_batch_number,
    pb.production_date,
    pb.quantity_produced,
    pb.status AS product_batch_status,
    p.product_id,
    p.name AS product_name,
    p.sku AS product_sku,
    pbc.component_batch_id,
    cb.batch_number AS component_batch_number,
    c.component_id,
    c.name AS component_name,
    pbc.quantity_used,
    s.supplier_id,
    s.name AS supplier_name,
    cb.manufacture_date AS component_manufacture_date,
    cb.expiry_date AS component_expiry_date
FROM product_batch AS pb
JOIN product AS p
  ON p.product_id = pb.product_id
JOIN product_batch_component AS pbc
  ON pbc.product_batch_id = pb.product_batch_id
JOIN component_batch AS cb
  ON cb.component_batch_id = pbc.component_batch_id
JOIN component AS c
  ON c.component_id = cb.component_id
JOIN supplier AS s
  ON s.supplier_id = c.supplier_id;


-- ============================================================================
-- VIEW 2: PRODUCT BATCH INVENTORY
-- ============================================================================
-- Shows every finished product batch with any inventory rows and locations.
-- LEFT JOIN keeps batches visible even when no inventory has been recorded.
-- If a batch is stored at multiple locations, it appears once per location.
CREATE OR REPLACE VIEW v_product_batch_inventory AS
SELECT
    pb.product_batch_id,
    pb.batch_number AS product_batch_number,
    pb.production_date,
    pb.status AS product_batch_status,
    p.product_id,
    p.name AS product_name,
    p.sku AS product_sku,
    pb.quantity_produced,
    i.inventory_id,
    i.quantity_on_hand AS inventory_quantity,
    il.location_id,
    il.name AS location_name,
    i.last_updated
FROM product_batch AS pb
JOIN product AS p
  ON p.product_id = pb.product_id
LEFT JOIN inventory AS i
  ON i.product_batch_id = pb.product_batch_id
LEFT JOIN inventory_location AS il
  ON il.location_id = i.location_id;
