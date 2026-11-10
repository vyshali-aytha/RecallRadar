-- RecallRadar read-only traceability procedures.
-- Target version: MySQL 8.0.46
-- Run after database/mysql/schema.sql has been applied.

DELIMITER $$

DROP PROCEDURE IF EXISTS sp_get_recall_exposure_report$$
CREATE PROCEDURE sp_get_recall_exposure_report(IN p_recall_id INT)
BEGIN
    DECLARE v_recall_exists INT DEFAULT 0;

    IF p_recall_id IS NULL OR p_recall_id <= 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Recall ID must be a positive integer.';
    END IF;

    SELECT COUNT(*)
      INTO v_recall_exists
      FROM recall
     WHERE recall_id = p_recall_id;

    IF v_recall_exists = 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Recall ID does not exist.';
    END IF;

    -- Result set 1: recall, creator, and its optional component targets.
    SELECT
        r.recall_id,
        r.recall_date,
        r.reason,
        r.severity,
        r.status,
        u.user_id,
        u.name AS creator_name,
        u.role AS creator_role,
        c.component_id,
        c.name AS component_name,
        c.category AS component_category,
        cb.component_batch_id,
        cb.batch_number AS component_batch_number,
        cb.manufacture_date AS component_batch_manufacture_date,
        cb.expiry_date AS component_batch_expiry_date,
        cb.status AS component_batch_status
    FROM recall AS r
    INNER JOIN app_user AS u
        ON u.user_id = r.user_id
    LEFT JOIN component AS c
        ON c.component_id = r.component_id
    LEFT JOIN component_batch AS cb
        ON cb.component_batch_id = r.component_batch_id
    WHERE r.recall_id = p_recall_id;

    -- Result set 2: recorded impact rows and their affected product batches.
    SELECT
        ri.recall_impact_id,
        ri.identified_date,
        ri.impact_type,
        pb.product_batch_id,
        pb.batch_number AS product_batch_number,
        pb.production_date,
        pb.quantity_produced,
        pb.status AS product_batch_status,
        p.product_id,
        p.name AS product_name,
        p.category AS product_category,
        p.sku
    FROM recall_impact AS ri
    INNER JOIN product_batch AS pb
        ON pb.product_batch_id = ri.product_batch_id
    INNER JOIN product AS p
        ON p.product_id = pb.product_id
    WHERE ri.recall_id = p_recall_id
    ORDER BY ri.recall_impact_id;

    -- Result set 3: shipments for affected batches, without multiplying rows
    -- when more than one impact record points to the same product batch.
    SELECT
        s.shipment_id,
        s.shipment_date,
        s.quantity_shipped,
        s.status AS shipment_status,
        s.product_batch_id,
        d.distributor_id,
        d.name AS distributor_name,
        d.region AS distributor_region,
        d.contact_email AS distributor_contact_email
    FROM (
        SELECT DISTINCT product_batch_id
        FROM recall_impact
        WHERE recall_id = p_recall_id
    ) AS affected_batches
    INNER JOIN shipment AS s
        ON s.product_batch_id = affected_batches.product_batch_id
    INNER JOIN distributor AS d
        ON d.distributor_id = s.distributor_id
    ORDER BY s.shipment_id;

    -- Result set 4: inventory for affected batches, without shipment joins.
    SELECT
        i.inventory_id,
        i.product_batch_id,
        i.quantity_on_hand,
        i.last_updated,
        l.location_id,
        l.name AS location_name,
        l.type AS location_type,
        l.address AS location_address
    FROM (
        SELECT DISTINCT product_batch_id
        FROM recall_impact
        WHERE recall_id = p_recall_id
    ) AS affected_batches
    INNER JOIN inventory AS i
        ON i.product_batch_id = affected_batches.product_batch_id
    INNER JOIN inventory_location AS l
        ON l.location_id = i.location_id
    ORDER BY i.inventory_id;
END$$

DROP PROCEDURE IF EXISTS sp_trace_component_batch_exposure$$
CREATE PROCEDURE sp_trace_component_batch_exposure(IN p_component_batch_id INT)
BEGIN
    DECLARE v_component_batch_exists INT DEFAULT 0;

    IF p_component_batch_id IS NULL OR p_component_batch_id <= 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Component batch ID must be a positive integer.';
    END IF;

    SELECT COUNT(*)
      INTO v_component_batch_exists
      FROM component_batch
     WHERE component_batch_id = p_component_batch_id;

    IF v_component_batch_exists = 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Component batch ID does not exist.';
    END IF;

    -- Result set 1: product batches using this component batch and their products.
    SELECT
        pbc.component_batch_id,
        pbc.quantity_used,
        pb.product_batch_id,
        pb.batch_number AS product_batch_number,
        pb.production_date,
        pb.quantity_produced,
        pb.status AS product_batch_status,
        p.product_id,
        p.name AS product_name,
        p.category AS product_category,
        p.sku
    FROM product_batch_component AS pbc
    INNER JOIN product_batch AS pb
        ON pb.product_batch_id = pbc.product_batch_id
    INNER JOIN product AS p
        ON p.product_id = pb.product_id
    WHERE pbc.component_batch_id = p_component_batch_id
    ORDER BY pb.product_batch_id;

    -- Result set 2: shipments for traced product batches.
    SELECT
        s.shipment_id,
        s.shipment_date,
        s.quantity_shipped,
        s.status AS shipment_status,
        s.product_batch_id,
        d.distributor_id,
        d.name AS distributor_name,
        d.region AS distributor_region,
        d.contact_email AS distributor_contact_email
    FROM (
        SELECT DISTINCT product_batch_id
        FROM product_batch_component
        WHERE component_batch_id = p_component_batch_id
    ) AS traced_batches
    INNER JOIN shipment AS s
        ON s.product_batch_id = traced_batches.product_batch_id
    INNER JOIN distributor AS d
        ON d.distributor_id = s.distributor_id
    ORDER BY s.shipment_id;

    -- Result set 3: inventory for traced product batches.
    SELECT
        i.inventory_id,
        i.product_batch_id,
        i.quantity_on_hand,
        i.last_updated,
        l.location_id,
        l.name AS location_name,
        l.type AS location_type,
        l.address AS location_address
    FROM (
        SELECT DISTINCT product_batch_id
        FROM product_batch_component
        WHERE component_batch_id = p_component_batch_id
    ) AS traced_batches
    INNER JOIN inventory AS i
        ON i.product_batch_id = traced_batches.product_batch_id
    INNER JOIN inventory_location AS l
        ON l.location_id = i.location_id
    ORDER BY i.inventory_id;
END$$

DELIMITER ;
