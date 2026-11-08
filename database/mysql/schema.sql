-- RECALLRADAR
-- Product Recall Impact and Supply-Chain Traceability Platform
-- MySQL DDL Script

-- 1. RESET OLD TABLES

DROP TABLE IF EXISTS recall_impact;
DROP TABLE IF EXISTS recall;
DROP TABLE IF EXISTS inventory;
DROP TABLE IF EXISTS shipment;
DROP TABLE IF EXISTS product_batch_component;
DROP TABLE IF EXISTS product_component;
DROP TABLE IF EXISTS product_batch;
DROP TABLE IF EXISTS component_batch;
DROP TABLE IF EXISTS inventory_location;
DROP TABLE IF EXISTS distributor;
DROP TABLE IF EXISTS product;
DROP TABLE IF EXISTS component;
DROP TABLE IF EXISTS supplier;
DROP TABLE IF EXISTS app_user;


-- 2. APP_USER

CREATE TABLE app_user (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL
);


-- 3. SUPPLIER

CREATE TABLE supplier (
    supplier_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    contact_email VARCHAR(255),
    phone VARCHAR(30),
    address VARCHAR(255)
);


-- 4. COMPONENT
-- SUPPLIER 1 : N COMPONENT

CREATE TABLE component (
    component_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    category VARCHAR(100),
    supplier_id INT NOT NULL,

    CONSTRAINT fk_component_supplier
        FOREIGN KEY (supplier_id)
        REFERENCES supplier(supplier_id)
);


-- 5. COMPONENT_BATCH
-- COMPONENT 1 : N COMPONENT_BATCH

CREATE TABLE component_batch (
    component_batch_id INT AUTO_INCREMENT PRIMARY KEY,
    batch_number VARCHAR(100) NOT NULL,
    manufacture_date DATE,
    expiry_date DATE,
    quantity_received INT NOT NULL
        CHECK (quantity_received >= 0),
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    component_id INT NOT NULL,

    CONSTRAINT fk_component_batch_component
        FOREIGN KEY (component_id)
        REFERENCES component(component_id),

    CONSTRAINT uq_component_batch
        UNIQUE (component_id, batch_number)
);


-- 6. PRODUCT

CREATE TABLE product (
    product_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    category VARCHAR(100),
    sku VARCHAR(50) NOT NULL UNIQUE
);


-- 7. PRODUCT_COMPONENT
-- BOM: PRODUCT M : N COMPONENT

CREATE TABLE product_component (
    product_id INT NOT NULL,
    component_id INT NOT NULL,
    quantity_required DECIMAL(12,2) NOT NULL
        CHECK (quantity_required > 0),

    CONSTRAINT pk_product_component
        PRIMARY KEY (product_id, component_id),

    CONSTRAINT fk_product_component_product
        FOREIGN KEY (product_id)
        REFERENCES product(product_id),

    CONSTRAINT fk_product_component_component
        FOREIGN KEY (component_id)
        REFERENCES component(component_id)
);


-- 8. PRODUCT_BATCH
-- PRODUCT 1 : N PRODUCT_BATCH

CREATE TABLE product_batch (
    product_batch_id INT AUTO_INCREMENT PRIMARY KEY,
    batch_number VARCHAR(100) NOT NULL,
    production_date DATE,
    quantity_produced INT NOT NULL
        CHECK (quantity_produced >= 0),
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    product_id INT NOT NULL,

    CONSTRAINT fk_product_batch_product
        FOREIGN KEY (product_id)
        REFERENCES product(product_id),

    CONSTRAINT uq_product_batch
        UNIQUE (product_id, batch_number)
);


-- 9. PRODUCT_BATCH_COMPONENT
-- BATCH_COMPOSITION:
-- PRODUCT_BATCH M : N COMPONENT_BATCH

CREATE TABLE product_batch_component (
    product_batch_id INT NOT NULL,
    component_batch_id INT NOT NULL,
    quantity_used DECIMAL(12,2) NOT NULL
        CHECK (quantity_used > 0),

    CONSTRAINT pk_product_batch_component
        PRIMARY KEY (product_batch_id, component_batch_id),

    CONSTRAINT fk_pbc_product_batch
        FOREIGN KEY (product_batch_id)
        REFERENCES product_batch(product_batch_id),

    CONSTRAINT fk_pbc_component_batch
        FOREIGN KEY (component_batch_id)
        REFERENCES component_batch(component_batch_id)
);


-- 10. DISTRIBUTOR

CREATE TABLE distributor (
    distributor_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    region VARCHAR(100),
    contact_email VARCHAR(255)
);


-- 11. SHIPMENT
-- DISTRIBUTOR 1 : N SHIPMENT
-- PRODUCT_BATCH 1 : N SHIPMENT

CREATE TABLE shipment (
    shipment_id INT AUTO_INCREMENT PRIMARY KEY,
    shipment_date DATE,
    quantity_shipped INT NOT NULL
        CHECK (quantity_shipped >= 0),
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    distributor_id INT NOT NULL,
    product_batch_id INT NOT NULL,

    CONSTRAINT fk_shipment_distributor
        FOREIGN KEY (distributor_id)
        REFERENCES distributor(distributor_id),

    CONSTRAINT fk_shipment_product_batch
        FOREIGN KEY (product_batch_id)
        REFERENCES product_batch(product_batch_id)
);


-- 12. INVENTORY_LOCATION

CREATE TABLE inventory_location (
    location_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    type VARCHAR(50),
    address VARCHAR(255)
);


-- 13. INVENTORY
-- PRODUCT_BATCH 1 : N INVENTORY
-- INVENTORY_LOCATION 1 : N INVENTORY

CREATE TABLE inventory (
    inventory_id INT AUTO_INCREMENT PRIMARY KEY,
    quantity_on_hand INT NOT NULL
        CHECK (quantity_on_hand >= 0),
    last_updated TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    product_batch_id INT NOT NULL,
    location_id INT NOT NULL,

    CONSTRAINT fk_inventory_product_batch
        FOREIGN KEY (product_batch_id)
        REFERENCES product_batch(product_batch_id),

    CONSTRAINT fk_inventory_location
        FOREIGN KEY (location_id)
        REFERENCES inventory_location(location_id),

    CONSTRAINT uq_inventory_batch_location
        UNIQUE (product_batch_id, location_id)
);


-- 14. RECALL
--
-- APP_USER 1 : N RECALL
-- COMPONENT 1 : N RECALL
-- COMPONENT_BATCH 1 : N RECALL
--
-- A recall must target either a component or a component batch.

CREATE TABLE recall (
    recall_id INT AUTO_INCREMENT PRIMARY KEY,
    recall_date DATE NOT NULL,
    reason VARCHAR(500),
    severity VARCHAR(30),
    status VARCHAR(30) NOT NULL DEFAULT 'open',
    user_id INT NOT NULL,
    component_id INT,
    component_batch_id INT,

    CONSTRAINT fk_recall_user
        FOREIGN KEY (user_id)
        REFERENCES app_user(user_id),

    CONSTRAINT fk_recall_component
        FOREIGN KEY (component_id)
        REFERENCES component(component_id),

    CONSTRAINT fk_recall_component_batch
        FOREIGN KEY (component_batch_id)
        REFERENCES component_batch(component_batch_id),

    CONSTRAINT chk_recall_has_target
        CHECK (
            component_id IS NOT NULL
            OR component_batch_id IS NOT NULL
        )
);


-- 15. RECALL_IMPACT
--
-- RECALL 1 : N RECALL_IMPACT
-- PRODUCT_BATCH 1 : N RECALL_IMPACT

CREATE TABLE recall_impact (
    recall_impact_id INT AUTO_INCREMENT PRIMARY KEY,
    identified_date DATE NOT NULL DEFAULT (CURRENT_DATE),
    impact_type VARCHAR(100) NOT NULL,
    recall_id INT NOT NULL,
    product_batch_id INT NOT NULL,

    CONSTRAINT fk_recall_impact_recall
        FOREIGN KEY (recall_id)
        REFERENCES recall(recall_id),

    CONSTRAINT fk_recall_impact_product_batch
        FOREIGN KEY (product_batch_id)
        REFERENCES product_batch(product_batch_id)
);


-- 16. INDEXES

CREATE INDEX idx_component_supplier
    ON component(supplier_id);

CREATE INDEX idx_component_batch_component
    ON component_batch(component_id);

CREATE INDEX idx_product_component_component
    ON product_component(component_id);

CREATE INDEX idx_product_batch_product
    ON product_batch(product_id);

CREATE INDEX idx_product_batch_component_component_batch
    ON product_batch_component(component_batch_id);

CREATE INDEX idx_shipment_product_batch
    ON shipment(product_batch_id);

CREATE INDEX idx_shipment_distributor
    ON shipment(distributor_id);

CREATE INDEX idx_inventory_product_batch
    ON inventory(product_batch_id);

CREATE INDEX idx_inventory_location
    ON inventory(location_id);

CREATE INDEX idx_recall_user
    ON recall(user_id);

CREATE INDEX idx_recall_component
    ON recall(component_id);

CREATE INDEX idx_recall_component_batch
    ON recall(component_batch_id);

CREATE INDEX idx_recall_impact_recall
    ON recall_impact(recall_id);

CREATE INDEX idx_recall_impact_product_batch
    ON recall_impact(product_batch_id);


-- 17. ALTER TABLE
-- Demonstration of ADD COLUMN and DROP COLUMN

ALTER TABLE supplier
ADD COLUMN website VARCHAR(255);

ALTER TABLE supplier
DROP COLUMN website;


-- 18. VERIFICATION

SHOW TABLES;

SELECT
    TABLE_NAME,
    CONSTRAINT_NAME,
    CONSTRAINT_TYPE
FROM information_schema.TABLE_CONSTRAINTS
WHERE TABLE_SCHEMA = DATABASE()
ORDER BY TABLE_NAME, CONSTRAINT_TYPE;
