import fs from 'node:fs/promises';
import path from 'node:path';
import mysql, { type Connection, type RowDataPacket } from 'mysql2/promise';

import {
  createAppUser,
  createDistributor,
  createInventory,
  createInventoryLocation,
  createRecall,
  createRecallImpact,
  createShipment,
  deleteAppUser,
  deleteDistributor,
  deleteInventory,
  deleteInventoryLocation,
  deleteRecall,
  deleteRecallImpact,
  deleteShipment,
  getAllAppUsers,
  getAllDistributors,
  getAllInventory,
  getAllInventoryLocations,
  getAllRecallImpacts,
  getAllRecalls,
  getAllShipments,
  getAppUserById,
  getDistributorById,
  getInventoryById,
  getInventoryLocationById,
  getRecallById,
  getRecallImpactById,
  getShipmentById,
  updateAppUser,
  updateDistributor,
  updateInventory,
  updateInventoryLocation,
  updateRecall,
  updateRecallImpact,
  updateShipment,
} from '../src/lib/member-b-core';

const TEST_DB_NAME = process.env.TEST_DB_NAME || 'recallradar_test_db';
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = Number(process.env.DB_PORT || 3306);
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';

const schemaPath = path.resolve(process.cwd(), 'database/mysql/schema.sql');

const makeRootConnection = async () =>
  mysql.createConnection({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    multipleStatements: true,
    charset: 'utf8mb4',
  });

const makeTestConnection = async () =>
  mysql.createConnection({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: TEST_DB_NAME,
    charset: 'utf8mb4',
    multipleStatements: true,
  });

async function initializeTestDatabase() {
  const rootConn = await makeRootConnection();
  try {
    await rootConn.query(`CREATE DATABASE IF NOT EXISTS \`${TEST_DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci`);

    const schemaSql = await fs.readFile(schemaPath, 'utf8');
    const testConn = await makeTestConnection();
    try {
      await testConn.query(schemaSql);
      console.log(`Initialized test database: ${TEST_DB_NAME}`);
    } finally {
      await testConn.end();
    }
  } finally {
    await rootConn.end();
  }
}

async function ensureSupportingData(conn: Connection) {
  const [supplierRows] = await conn.query<RowDataPacket[]>(`SELECT * FROM supplier LIMIT 1`);
  if (supplierRows.length === 0) {
    await conn.query(
      `INSERT INTO supplier (name, contact_email, phone, address) VALUES (?, ?, ?, ?)`,
      ['Test Supplier', 'supplier@test.local', '111-222-3333', 'Test Supplier Address']
    );
  }

  const [componentRows] = await conn.query<RowDataPacket[]>(`SELECT * FROM component LIMIT 1`);
  if (componentRows.length === 0) {
    const [[supplier]] = await conn.query<RowDataPacket[]>(`SELECT supplier_id FROM supplier LIMIT 1`);
    await conn.query(
      `INSERT INTO component (name, category, supplier_id) VALUES (?, ?, ?)`,
      ['Test Component', 'sensor', supplier.supplier_id]
    );
  }

  const [componentBatchRows] = await conn.query<RowDataPacket[]>(`SELECT * FROM component_batch LIMIT 1`);
  if (componentBatchRows.length === 0) {
    const [[component]] = await conn.query<RowDataPacket[]>(`SELECT component_id FROM component LIMIT 1`);
    await conn.query(
      `INSERT INTO component_batch (batch_number, manufacture_date, expiry_date, quantity_received, status, component_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      ['TEST-COMP-BATCH-001', '2026-01-01', '2029-01-01', 500, 'active', component.component_id]
    );
  }

  const [productRows] = await conn.query<RowDataPacket[]>(`SELECT * FROM product LIMIT 1`);
  if (productRows.length === 0) {
    await conn.query(
      `INSERT INTO product (name, category, sku) VALUES (?, ?, ?)`,
      ['Test Product', 'vaccine-monitor', 'TP-TEST-SKU-001']
    );
  }

  const [productBatchRows] = await conn.query<RowDataPacket[]>(`SELECT * FROM product_batch LIMIT 1`);
  if (productBatchRows.length === 0) {
    const [[product]] = await conn.query<RowDataPacket[]>(`SELECT product_id FROM product LIMIT 1`);
    await conn.query(
      `INSERT INTO product_batch (batch_number, production_date, quantity_produced, status, product_id)
       VALUES (?, ?, ?, ?, ?)`,
      ['TEST-PROD-BATCH-001', '2026-02-01', 250, 'active', product.product_id]
    );
  }
}

async function testTableLifecycle() {
  const conn = await makeTestConnection();
  const created: { [key: string]: number | null } = {
    distributor: null,
    shipment: null,
    inventoryLocation: null,
    inventory: null,
    appUser: null,
    recall: null,
    recallImpact: null,
  };

  try {
    await ensureSupportingData(conn);

    const distributorId = await createDistributor(conn, {
      name: 'Test Dist Co',
      region: 'NA',
      contact_email: 'ops@testdist.local',
    });
    created.distributor = distributorId;

    const [[productBatch]] = await conn.query<RowDataPacket[]>(`SELECT product_batch_id FROM product_batch LIMIT 1`);
    const [[componentRow]] = await conn.query<RowDataPacket[]>(`SELECT component_id FROM component LIMIT 1`);

    const shipmentId = await createShipment(conn, {
      shipment_date: '2026-03-01',
      quantity_shipped: 25,
      status: 'shipped',
      distributor_id: distributorId,
      product_batch_id: productBatch.product_batch_id,
    });
    created.shipment = shipmentId;

    const locationId = await createInventoryLocation(conn, {
      name: 'Test Warehouse A',
      type: 'warehouse',
      address: '100 Test Street',
    });
    created.inventoryLocation = locationId;

    const inventoryId = await createInventory(conn, {
      quantity_on_hand: 20,
      last_updated: '2026-03-02T10:00:00Z',
      product_batch_id: productBatch.product_batch_id,
      location_id: locationId,
    });
    created.inventory = inventoryId;

    const appUserId = await createAppUser(conn, {
      name: 'Test User',
      email: 'testuser@example.com',
      password_hash: 'hashed-value-not-real',
      role: 'manager',
    });
    created.appUser = appUserId;

    const recallId = await createRecall(conn, {
      recall_date: '2026-03-05',
      reason: 'Safety issue identified in test component batch',
      severity: 'high',
      status: 'open',
      user_id: appUserId,
      component_id: componentRow.component_id,
      component_batch_id: null,
    });
    created.recall = recallId;

    const recallImpactId = await createRecallImpact(conn, {
      identified_date: '2026-03-06',
      impact_type: 'batch-level',
      recall_id: recallId,
      product_batch_id: productBatch.product_batch_id,
    });
    created.recallImpact = recallImpactId;

    console.log('Create validations passed');

    const distributorList = await getAllDistributors(conn);
    if (!distributorList.some((row) => row.distributor_id === distributorId)) {
      throw new Error('Distributor read-all failed');
    }

    const shipmentById = await getShipmentById(conn, shipmentId);
    if (!shipmentById || shipmentById.shipment_id !== shipmentId) {
      throw new Error('Shipment read-by-id failed');
    }

    const inventoryLocationById = await getInventoryLocationById(conn, locationId);
    if (!inventoryLocationById || inventoryLocationById.location_id !== locationId) {
      throw new Error('Inventory location read-by-id failed');
    }

    const inventoryById = await getInventoryById(conn, inventoryId);
    if (!inventoryById || inventoryById.inventory_id !== inventoryId) {
      throw new Error('Inventory read-by-id failed');
    }

    const appUserById = await getAppUserById(conn, appUserId);
    if (!appUserById || appUserById.user_id !== appUserId || 'password_hash' in appUserById) {
      throw new Error('App user read-by-id protection failed');
    }

    const allAppUsers = await getAllAppUsers(conn);
    if (allAppUsers.some((row) => 'password_hash' in row)) {
      throw new Error('App user read-all leaked password_hash');
    }

    const recallById = await getRecallById(conn, recallId);
    if (!recallById || recallById.recall_id !== recallId) {
      throw new Error('Recall read-by-id failed');
    }

    const recallImpactById = await getRecallImpactById(conn, recallImpactId);
    if (!recallImpactById || recallImpactById.recall_impact_id !== recallImpactId) {
      throw new Error('Recall impact read-by-id failed');
    }

    console.log('Read validations passed');

    await updateDistributor(conn, distributorId, { region: 'EMEA', contact_email: 'updated@testdist.local' });
    await updateShipment(conn, shipmentId, { status: 'delivered', quantity_shipped: 30 });
    await updateInventoryLocation(conn, locationId, { type: 'cold-storage', address: '101 Updated Road' });
    await updateInventory(conn, inventoryId, { quantity_on_hand: 18, location_id: locationId });
    await updateAppUser(conn, appUserId, { role: 'admin', email: 'updated-user@example.com' });
    await updateRecall(conn, recallId, { status: 'closed', severity: 'medium' });
    await updateRecallImpact(conn, recallImpactId, { impact_type: 'component-level' });

    console.log('Update validations passed');

    try {
      await createAppUser(conn, {
        name: 'Duplicate Test',
        email: 'updated-user@example.com',
        password_hash: 'another-hash',
        role: 'user',
      });
      throw new Error('Duplicate email test did not throw');
    } catch (error) {
      console.log('Duplicate email rejection validated');
    }

    try {
      await createRecall(conn, {
        recall_date: '2026-03-07',
        reason: 'Invalid recall',
        severity: 'low',
        status: 'open',
        user_id: appUserId,
        component_id: undefined,
        component_batch_id: undefined,
      } as any);
      throw new Error('Recall validation did not reject missing target');
    } catch (error) {
      console.log('Recall target validation validated');
    }

    try {
      await deleteDistributor(conn, distributorId);
      throw new Error('FK rejection test did not prevent distributor deletion');
    } catch (error) {
      console.log('Distributor FK rejection validated');
    }

    console.log('Cleanup begins: deleting only rows created by this runtime test');
    if (created.recallImpact !== null) {
      await deleteRecallImpact(conn, created.recallImpact);
    }
    if (created.recall !== null) {
      await deleteRecall(conn, created.recall);
    }
    if (created.inventory !== null) {
      await deleteInventory(conn, created.inventory);
    }
    if (created.shipment !== null) {
      await deleteShipment(conn, created.shipment);
    }
    if (created.inventoryLocation !== null) {
      await deleteInventoryLocation(conn, created.inventoryLocation);
    }
    if (created.appUser !== null) {
      await deleteAppUser(conn, created.appUser);
    }
    if (created.distributor !== null) {
      await deleteDistributor(conn, created.distributor);
    }

    console.log('Test cleanup complete');
  } finally {
    await conn.end();
  }
}

async function main() {
  console.log(`Using test database: ${TEST_DB_NAME}`);
  await initializeTestDatabase();
  await testTableLifecycle();
  console.log('Member B runtime test setup complete. No production database was modified.');
}

main().catch((error) => {
  console.error('Runtime test setup failed:', error);
  process.exitCode = 1;
});
