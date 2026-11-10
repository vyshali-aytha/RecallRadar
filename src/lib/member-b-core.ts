type DbExecutor = {
  execute: (sql: string, values?: any[]) => Promise<[any, any]>;
};

const DUMMY_HASH = 'REDACTED';

function isPositiveInteger(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) > 0;
}

function normalizeOptionalString(value: unknown): string | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  return String(value);
}

async function executeWrite(db: DbExecutor, sql: string, values: unknown[] = []) {
  const [result] = await db.execute(sql, values as any);
  return result as any;
}

async function fetchAll<T = Record<string, unknown>>(db: DbExecutor, sql: string, values: unknown[] = []): Promise<T[]> {
  const [rows] = await db.execute(sql, values as any);
  return Array.isArray(rows) ? (rows as T[]) : [];
}

async function fetchOne<T = Record<string, unknown>>(db: DbExecutor, sql: string, values: unknown[] = []): Promise<T | null> {
  const [rows] = await db.execute(sql, values as any);
  if (!Array.isArray(rows) || rows.length === 0) {
    return null;
  }

  return rows[0] as T;
}

export type DistributorInput = {
  name: string;
  region?: string | null;
  contact_email?: string | null;
};

export type ShipmentInput = {
  shipment_date?: string | Date | null;
  quantity_shipped: number;
  status?: string | null;
  distributor_id: number;
  product_batch_id: number;
};

export type InventoryLocationInput = {
  name: string;
  type?: string | null;
  address?: string | null;
};

export type InventoryInput = {
  quantity_on_hand: number;
  last_updated?: string | Date | null;
  product_batch_id: number;
  location_id: number;
};

export type AppUserInput = {
  name: string;
  email: string;
  password_hash: string;
  role: string;
};

export type RecallInput = {
  recall_date: string | Date;
  reason?: string | null;
  severity?: string | null;
  status?: string | null;
  user_id: number;
  component_id?: number | null;
  component_batch_id?: number | null;
};

export type RecallImpactInput = {
  identified_date?: string | Date | null;
  impact_type: string;
  recall_id: number;
  product_batch_id: number;
};

export type DistributorRecord = {
  distributor_id: number;
  name: string;
  region: string | null;
  contact_email: string | null;
};

export type ShipmentRecord = {
  shipment_id: number;
  shipment_date: string | Date | null;
  quantity_shipped: number;
  status: string;
  distributor_id: number;
  product_batch_id: number;
};

export type InventoryLocationRecord = {
  location_id: number;
  name: string;
  type: string | null;
  address: string | null;
};

export type InventoryRecord = {
  inventory_id: number;
  quantity_on_hand: number;
  last_updated: string | Date;
  product_batch_id: number;
  location_id: number;
};

export type AppUserRecord = {
  user_id: number;
  name: string;
  email: string;
  role: string;
};

export type RecallRecord = {
  recall_id: number;
  recall_date: string | Date;
  reason: string | null;
  severity: string | null;
  status: string;
  user_id: number;
  component_id: number | null;
  component_batch_id: number | null;
};

export type RecallImpactRecord = {
  recall_impact_id: number;
  identified_date: string | Date;
  impact_type: string;
  recall_id: number;
  product_batch_id: number;
};

export async function createDistributor(db: DbExecutor, input: DistributorInput) {
  if (!input.name || !input.name.trim()) {
    throw new Error('Distributor name is required.');
  }

  const result = await executeWrite(
    db,
    `INSERT INTO distributor (name, region, contact_email) VALUES (?, ?, ?)`,
    [input.name.trim(), normalizeOptionalString(input.region), normalizeOptionalString(input.contact_email)]
  );

  return result.insertId as number;
}

export async function getAllDistributors(db: DbExecutor) {
  return fetchAll<DistributorRecord>(db, `SELECT * FROM distributor ORDER BY distributor_id`);
}

export async function getDistributorById(db: DbExecutor, distributorId: number) {
  if (!isPositiveInteger(distributorId)) {
    throw new Error('Distributor ID must be a positive integer.');
  }

  return fetchOne<DistributorRecord>(db, `SELECT * FROM distributor WHERE distributor_id = ?`, [distributorId]);
}

export async function updateDistributor(db: DbExecutor, distributorId: number, input: Partial<DistributorInput>) {
  if (!isPositiveInteger(distributorId)) {
    throw new Error('Distributor ID must be a positive integer.');
  }

  const existing = await getDistributorById(db, distributorId);
  if (!existing) {
    throw new Error('Distributor not found.');
  }

  const updates = [
    input.name !== undefined ? ['name', input.name.trim()] : null,
    input.region !== undefined ? ['region', normalizeOptionalString(input.region)] : null,
    input.contact_email !== undefined ? ['contact_email', normalizeOptionalString(input.contact_email)] : null,
  ].filter(Boolean) as [string, unknown][];

  if (updates.length === 0) {
    return existing;
  }

  const sql = `UPDATE distributor SET ${updates.map(([key]) => `${key} = ?`).join(', ')} WHERE distributor_id = ?`;
  const values = [...updates.map(([, value]) => value), distributorId];

  await executeWrite(db, sql, values);
  return getDistributorById(db, distributorId);
}

export async function deleteDistributor(db: DbExecutor, distributorId: number) {
  if (!isPositiveInteger(distributorId)) {
    throw new Error('Distributor ID must be a positive integer.');
  }

  const result = await executeWrite(db, `DELETE FROM distributor WHERE distributor_id = ?`, [distributorId]);
  return result.affectedRows as number;
}

export async function createShipment(db: DbExecutor, input: ShipmentInput) {
  if (!isPositiveInteger(input.distributor_id) || !isPositiveInteger(input.product_batch_id)) {
    throw new Error('Distributor ID and product batch ID must be positive integers.');
  }

  if (!Number.isInteger(input.quantity_shipped) || input.quantity_shipped < 0) {
    throw new Error('Shipment quantity_shipped must be a non-negative integer.');
  }

  const status = input.status ?? 'pending';
  const shipmentDate = input.shipment_date ? new Date(input.shipment_date).toISOString().slice(0, 10) : null;

  const result = await executeWrite(
    db,
    `INSERT INTO shipment (shipment_date, quantity_shipped, status, distributor_id, product_batch_id)
     VALUES (?, ?, ?, ?, ?)`,
    [shipmentDate, input.quantity_shipped, status, input.distributor_id, input.product_batch_id]
  );

  return result.insertId as number;
}

export async function getAllShipments(db: DbExecutor) {
  return fetchAll<ShipmentRecord>(db, `SELECT * FROM shipment ORDER BY shipment_id`);
}

export async function getShipmentById(db: DbExecutor, shipmentId: number) {
  if (!isPositiveInteger(shipmentId)) {
    throw new Error('Shipment ID must be a positive integer.');
  }

  return fetchOne<ShipmentRecord>(db, `SELECT * FROM shipment WHERE shipment_id = ?`, [shipmentId]);
}

export async function updateShipment(db: DbExecutor, shipmentId: number, input: Partial<ShipmentInput>) {
  if (!isPositiveInteger(shipmentId)) {
    throw new Error('Shipment ID must be a positive integer.');
  }

  const existing = await getShipmentById(db, shipmentId);
  if (!existing) {
    throw new Error('Shipment not found.');
  }

  const updates: [string, unknown][] = [];

  if (input.shipment_date !== undefined) {
    updates.push(['shipment_date', input.shipment_date ? new Date(input.shipment_date).toISOString().slice(0, 10) : null]);
  }
  if (input.quantity_shipped !== undefined) {
    if (!Number.isInteger(input.quantity_shipped) || input.quantity_shipped < 0) {
      throw new Error('Shipment quantity_shipped must be a non-negative integer.');
    }
    updates.push(['quantity_shipped', input.quantity_shipped]);
  }
  if (input.status !== undefined) {
    updates.push(['status', input.status ?? 'pending']);
  }
  if (input.distributor_id !== undefined) {
    if (!isPositiveInteger(input.distributor_id)) {
      throw new Error('Distributor ID must be a positive integer.');
    }
    updates.push(['distributor_id', input.distributor_id]);
  }
  if (input.product_batch_id !== undefined) {
    if (!isPositiveInteger(input.product_batch_id)) {
      throw new Error('Product batch ID must be a positive integer.');
    }
    updates.push(['product_batch_id', input.product_batch_id]);
  }

  if (updates.length === 0) {
    return existing;
  }

  const sql = `UPDATE shipment SET ${updates.map(([key]) => `${key} = ?`).join(', ')} WHERE shipment_id = ?`;
  const values = [...updates.map(([, value]) => value), shipmentId];

  await executeWrite(db, sql, values);
  return getShipmentById(db, shipmentId);
}

export async function deleteShipment(db: DbExecutor, shipmentId: number) {
  if (!isPositiveInteger(shipmentId)) {
    throw new Error('Shipment ID must be a positive integer.');
  }

  const result = await executeWrite(db, `DELETE FROM shipment WHERE shipment_id = ?`, [shipmentId]);
  return result.affectedRows as number;
}

export async function createInventoryLocation(db: DbExecutor, input: InventoryLocationInput) {
  if (!input.name || !input.name.trim()) {
    throw new Error('Inventory location name is required.');
  }

  const result = await executeWrite(
    db,
    `INSERT INTO inventory_location (name, type, address) VALUES (?, ?, ?)`,
    [input.name.trim(), normalizeOptionalString(input.type), normalizeOptionalString(input.address)]
  );

  return result.insertId as number;
}

export async function getAllInventoryLocations(db: DbExecutor) {
  return fetchAll<InventoryLocationRecord>(db, `SELECT * FROM inventory_location ORDER BY location_id`);
}

export async function getInventoryLocationById(db: DbExecutor, locationId: number) {
  if (!isPositiveInteger(locationId)) {
    throw new Error('Inventory location ID must be a positive integer.');
  }

  return fetchOne<InventoryLocationRecord>(db, `SELECT * FROM inventory_location WHERE location_id = ?`, [locationId]);
}

export async function updateInventoryLocation(db: DbExecutor, locationId: number, input: Partial<InventoryLocationInput>) {
  if (!isPositiveInteger(locationId)) {
    throw new Error('Inventory location ID must be a positive integer.');
  }

  const existing = await getInventoryLocationById(db, locationId);
  if (!existing) {
    throw new Error('Inventory location not found.');
  }

  const updates: [string, unknown][] = [];

  if (input.name !== undefined) {
    if (!input.name || !input.name.trim()) {
      throw new Error('Inventory location name is required.');
    }
    updates.push(['name', input.name.trim()]);
  }
  if (input.type !== undefined) {
    updates.push(['type', normalizeOptionalString(input.type)]);
  }
  if (input.address !== undefined) {
    updates.push(['address', normalizeOptionalString(input.address)]);
  }

  if (updates.length === 0) {
    return existing;
  }

  const sql = `UPDATE inventory_location SET ${updates.map(([key]) => `${key} = ?`).join(', ')} WHERE location_id = ?`;
  const values = [...updates.map(([, value]) => value), locationId];

  await executeWrite(db, sql, values);
  return getInventoryLocationById(db, locationId);
}

export async function deleteInventoryLocation(db: DbExecutor, locationId: number) {
  if (!isPositiveInteger(locationId)) {
    throw new Error('Inventory location ID must be a positive integer.');
  }

  const result = await executeWrite(db, `DELETE FROM inventory_location WHERE location_id = ?`, [locationId]);
  return result.affectedRows as number;
}

export async function createInventory(db: DbExecutor, input: InventoryInput) {
  if (!isPositiveInteger(input.product_batch_id) || !isPositiveInteger(input.location_id)) {
    throw new Error('Product batch ID and location ID must be positive integers.');
  }

  if (!Number.isInteger(input.quantity_on_hand) || input.quantity_on_hand < 0) {
    throw new Error('Inventory quantity_on_hand must be a non-negative integer.');
  }

  const lastUpdated = input.last_updated ? new Date(input.last_updated).toISOString().slice(0, 19).replace('T', ' ') : new Date().toISOString().slice(0, 19).replace('T', ' ');

  const result = await executeWrite(
    db,
    `INSERT INTO inventory (quantity_on_hand, last_updated, product_batch_id, location_id)
     VALUES (?, ?, ?, ?)`,
    [input.quantity_on_hand, lastUpdated, input.product_batch_id, input.location_id]
  );

  return result.insertId as number;
}

export async function getAllInventory(db: DbExecutor) {
  return fetchAll<InventoryRecord>(db, `SELECT * FROM inventory ORDER BY inventory_id`);
}

export async function getInventoryById(db: DbExecutor, inventoryId: number) {
  if (!isPositiveInteger(inventoryId)) {
    throw new Error('Inventory ID must be a positive integer.');
  }

  return fetchOne<InventoryRecord>(db, `SELECT * FROM inventory WHERE inventory_id = ?`, [inventoryId]);
}

export async function updateInventory(db: DbExecutor, inventoryId: number, input: Partial<InventoryInput>) {
  if (!isPositiveInteger(inventoryId)) {
    throw new Error('Inventory ID must be a positive integer.');
  }

  const existing = await getInventoryById(db, inventoryId);
  if (!existing) {
    throw new Error('Inventory record not found.');
  }

  const updates: [string, unknown][] = [];

  if (input.quantity_on_hand !== undefined) {
    if (!Number.isInteger(input.quantity_on_hand) || input.quantity_on_hand < 0) {
      throw new Error('Inventory quantity_on_hand must be a non-negative integer.');
    }
    updates.push(['quantity_on_hand', input.quantity_on_hand]);
  }
  if (input.last_updated !== undefined) {
    updates.push(['last_updated', input.last_updated ? new Date(input.last_updated).toISOString().slice(0, 19).replace('T', ' ') : new Date().toISOString().slice(0, 19).replace('T', ' ')]);
  }
  if (input.product_batch_id !== undefined) {
    if (!isPositiveInteger(input.product_batch_id)) {
      throw new Error('Product batch ID must be a positive integer.');
    }
    updates.push(['product_batch_id', input.product_batch_id]);
  }
  if (input.location_id !== undefined) {
    if (!isPositiveInteger(input.location_id)) {
      throw new Error('Location ID must be a positive integer.');
    }
    updates.push(['location_id', input.location_id]);
  }

  if (updates.length === 0) {
    return existing;
  }

  const sql = `UPDATE inventory SET ${updates.map(([key]) => `${key} = ?`).join(', ')} WHERE inventory_id = ?`;
  const values = [...updates.map(([, value]) => value), inventoryId];

  await executeWrite(db, sql, values);
  return getInventoryById(db, inventoryId);
}

export async function deleteInventory(db: DbExecutor, inventoryId: number) {
  if (!isPositiveInteger(inventoryId)) {
    throw new Error('Inventory ID must be a positive integer.');
  }

  const result = await executeWrite(db, `DELETE FROM inventory WHERE inventory_id = ?`, [inventoryId]);
  return result.affectedRows as number;
}

export async function createAppUser(db: DbExecutor, input: AppUserInput) {
  if (!input.name || !input.name.trim()) {
    throw new Error('App user name is required.');
  }
  if (!input.email || !input.email.trim()) {
    throw new Error('App user email is required.');
  }
  if (!input.password_hash || !input.password_hash.trim()) {
    throw new Error('App user password_hash is required.');
  }
  if (!input.role || !input.role.trim()) {
    throw new Error('App user role is required.');
  }

  const result = await executeWrite(
    db,
    `INSERT INTO app_user (name, email, password_hash, role) VALUES (?, ?, ?, ?)`,
    [input.name.trim(), input.email.trim(), input.password_hash, input.role.trim()]
  );

  return result.insertId as number;
}

export async function getAllAppUsers(db: DbExecutor) {
  return fetchAll<AppUserRecord>(db, `SELECT user_id, name, email, role FROM app_user ORDER BY user_id`);
}

export async function getAppUserById(db: DbExecutor, userId: number) {
  if (!isPositiveInteger(userId)) {
    throw new Error('App user ID must be a positive integer.');
  }

  return fetchOne<AppUserRecord>(db, `SELECT user_id, name, email, role FROM app_user WHERE user_id = ?`, [userId]);
}

export async function updateAppUser(db: DbExecutor, userId: number, input: Partial<AppUserInput>) {
  if (!isPositiveInteger(userId)) {
    throw new Error('App user ID must be a positive integer.');
  }

  const existing = await fetchOne(db, `SELECT * FROM app_user WHERE user_id = ?`, [userId]);
  if (!existing) {
    throw new Error('App user not found.');
  }

  const updates: [string, unknown][] = [];

  if (input.name !== undefined) {
    if (!input.name || !input.name.trim()) {
      throw new Error('App user name is required.');
    }
    updates.push(['name', input.name.trim()]);
  }
  if (input.email !== undefined) {
    if (!input.email || !input.email.trim()) {
      throw new Error('App user email is required.');
    }
    updates.push(['email', input.email.trim()]);
  }
  if (input.password_hash !== undefined) {
    if (!input.password_hash || !input.password_hash.trim()) {
      throw new Error('App user password_hash is required.');
    }
    updates.push(['password_hash', input.password_hash]);
  }
  if (input.role !== undefined) {
    if (!input.role || !input.role.trim()) {
      throw new Error('App user role is required.');
    }
    updates.push(['role', input.role.trim()]);
  }

  if (updates.length === 0) {
    return getAppUserById(db, userId);
  }

  const sql = `UPDATE app_user SET ${updates.map(([key]) => `${key} = ?`).join(', ')} WHERE user_id = ?`;
  const values = [...updates.map(([, value]) => value), userId];

  await executeWrite(db, sql, values);
  return getAppUserById(db, userId);
}

export async function deleteAppUser(db: DbExecutor, userId: number) {
  if (!isPositiveInteger(userId)) {
    throw new Error('App user ID must be a positive integer.');
  }

  const result = await executeWrite(db, `DELETE FROM app_user WHERE user_id = ?`, [userId]);
  return result.affectedRows as number;
}

export async function createRecall(db: DbExecutor, input: RecallInput) {
  if (!input.recall_date) {
    throw new Error('Recall date is required.');
  }
  if (!isPositiveInteger(input.user_id)) {
    throw new Error('User ID must be a positive integer.');
  }
  const componentId = input.component_id ?? null;
  const componentBatchId = input.component_batch_id ?? null;
  if (componentId === null && componentBatchId === null) {
    throw new Error('A recall must target either a component or a component batch.');
  }
  if (componentId !== null && !isPositiveInteger(componentId)) {
    throw new Error('Component ID must be a positive integer.');
  }
  if (componentBatchId !== null && !isPositiveInteger(componentBatchId)) {
    throw new Error('Component batch ID must be a positive integer.');
  }

  const recallDate = new Date(input.recall_date).toISOString().slice(0, 10);
  const result = await executeWrite(
    db,
    `INSERT INTO recall (recall_date, reason, severity, status, user_id, component_id, component_batch_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      recallDate,
      normalizeOptionalString(input.reason),
      normalizeOptionalString(input.severity),
      input.status ?? 'open',
      input.user_id,
      componentId,
      componentBatchId,
    ]
  );

  return result.insertId as number;
}

export async function getAllRecalls(db: DbExecutor) {
  return fetchAll<RecallRecord>(db, `SELECT * FROM recall ORDER BY recall_id`);
}

export async function getRecallById(db: DbExecutor, recallId: number) {
  if (!isPositiveInteger(recallId)) {
    throw new Error('Recall ID must be a positive integer.');
  }

  return fetchOne<RecallRecord>(db, `SELECT * FROM recall WHERE recall_id = ?`, [recallId]);
}

export async function updateRecall(db: DbExecutor, recallId: number, input: Partial<RecallInput>) {
  if (!isPositiveInteger(recallId)) {
    throw new Error('Recall ID must be a positive integer.');
  }

  const existing = await getRecallById(db, recallId);
  if (!existing) {
    throw new Error('Recall not found.');
  }

  const targetComponentId = input.component_id === undefined ? existing.component_id : input.component_id;
  const targetComponentBatchId = input.component_batch_id === undefined ? existing.component_batch_id : input.component_batch_id;
  if (targetComponentId === null && targetComponentBatchId === null) {
    throw new Error('A recall must target either a component or a component batch.');
  }
  if (targetComponentId !== null && !isPositiveInteger(targetComponentId)) {
    throw new Error('Component ID must be a positive integer.');
  }
  if (targetComponentBatchId !== null && !isPositiveInteger(targetComponentBatchId)) {
    throw new Error('Component batch ID must be a positive integer.');
  }

  const updates: [string, unknown][] = [];

  if (input.recall_date !== undefined) {
    updates.push(['recall_date', new Date(input.recall_date).toISOString().slice(0, 10)]);
  }
  if (input.reason !== undefined) {
    updates.push(['reason', normalizeOptionalString(input.reason)]);
  }
  if (input.severity !== undefined) {
    updates.push(['severity', normalizeOptionalString(input.severity)]);
  }
  if (input.status !== undefined) {
    updates.push(['status', input.status ?? 'open']);
  }
  if (input.user_id !== undefined) {
    if (!isPositiveInteger(input.user_id)) {
      throw new Error('User ID must be a positive integer.');
    }
    updates.push(['user_id', input.user_id]);
  }
  if (input.component_id !== undefined) {
    if (input.component_id !== null && !isPositiveInteger(input.component_id)) {
      throw new Error('Component ID must be a positive integer or null.');
    }
    updates.push(['component_id', input.component_id ?? null]);
  }
  if (input.component_batch_id !== undefined) {
    if (input.component_batch_id !== null && !isPositiveInteger(input.component_batch_id)) {
      throw new Error('Component batch ID must be a positive integer or null.');
    }
    updates.push(['component_batch_id', input.component_batch_id ?? null]);
  }

  if (updates.length === 0) {
    return existing;
  }

  const sql = `UPDATE recall SET ${updates.map(([key]) => `${key} = ?`).join(', ')} WHERE recall_id = ?`;
  const values = [...updates.map(([, value]) => value), recallId];

  await executeWrite(db, sql, values);
  return getRecallById(db, recallId);
}

export async function deleteRecall(db: DbExecutor, recallId: number) {
  if (!isPositiveInteger(recallId)) {
    throw new Error('Recall ID must be a positive integer.');
  }

  const result = await executeWrite(db, `DELETE FROM recall WHERE recall_id = ?`, [recallId]);
  return result.affectedRows as number;
}

export async function createRecallImpact(db: DbExecutor, input: RecallImpactInput) {
  if (!isPositiveInteger(input.recall_id) || !isPositiveInteger(input.product_batch_id)) {
    throw new Error('Recall ID and product batch ID must be positive integers.');
  }
  if (!input.impact_type || !input.impact_type.trim()) {
    throw new Error('Impact type is required.');
  }

  const identifiedDate = input.identified_date ? new Date(input.identified_date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);

  const result = await executeWrite(
    db,
    `INSERT INTO recall_impact (identified_date, impact_type, recall_id, product_batch_id)
     VALUES (?, ?, ?, ?)`,
    [identifiedDate, input.impact_type.trim(), input.recall_id, input.product_batch_id]
  );

  return result.insertId as number;
}

export async function getAllRecallImpacts(db: DbExecutor) {
  return fetchAll<RecallImpactRecord>(db, `SELECT * FROM recall_impact ORDER BY recall_impact_id`);
}

export async function getRecallImpactById(db: DbExecutor, recallImpactId: number) {
  if (!isPositiveInteger(recallImpactId)) {
    throw new Error('Recall impact ID must be a positive integer.');
  }

  return fetchOne<RecallImpactRecord>(db, `SELECT * FROM recall_impact WHERE recall_impact_id = ?`, [recallImpactId]);
}

export async function updateRecallImpact(db: DbExecutor, recallImpactId: number, input: Partial<RecallImpactInput>) {
  if (!isPositiveInteger(recallImpactId)) {
    throw new Error('Recall impact ID must be a positive integer.');
  }

  const existing = await getRecallImpactById(db, recallImpactId);
  if (!existing) {
    throw new Error('Recall impact not found.');
  }

  const updates: [string, unknown][] = [];

  if (input.identified_date !== undefined) {
    updates.push(['identified_date', input.identified_date ? new Date(input.identified_date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)]);
  }
  if (input.impact_type !== undefined) {
    if (!input.impact_type || !input.impact_type.trim()) {
      throw new Error('Impact type is required.');
    }
    updates.push(['impact_type', input.impact_type.trim()]);
  }
  if (input.recall_id !== undefined) {
    if (!isPositiveInteger(input.recall_id)) {
      throw new Error('Recall ID must be a positive integer.');
    }
    updates.push(['recall_id', input.recall_id]);
  }
  if (input.product_batch_id !== undefined) {
    if (!isPositiveInteger(input.product_batch_id)) {
      throw new Error('Product batch ID must be a positive integer.');
    }
    updates.push(['product_batch_id', input.product_batch_id]);
  }

  if (updates.length === 0) {
    return existing;
  }

  const sql = `UPDATE recall_impact SET ${updates.map(([key]) => `${key} = ?`).join(', ')} WHERE recall_impact_id = ?`;
  const values = [...updates.map(([, value]) => value), recallImpactId];

  await executeWrite(db, sql, values);
  return getRecallImpactById(db, recallImpactId);
}

export async function deleteRecallImpact(db: DbExecutor, recallImpactId: number) {
  if (!isPositiveInteger(recallImpactId)) {
    throw new Error('Recall impact ID must be a positive integer.');
  }

  const result = await executeWrite(db, `DELETE FROM recall_impact WHERE recall_impact_id = ?`, [recallImpactId]);
  return result.affectedRows as number;
}

export default {
  createDistributor,
  getAllDistributors,
  getDistributorById,
  updateDistributor,
  deleteDistributor,
  createShipment,
  getAllShipments,
  getShipmentById,
  updateShipment,
  deleteShipment,
  createInventoryLocation,
  getAllInventoryLocations,
  getInventoryLocationById,
  updateInventoryLocation,
  deleteInventoryLocation,
  createInventory,
  getAllInventory,
  getInventoryById,
  updateInventory,
  deleteInventory,
  createAppUser,
  getAllAppUsers,
  getAppUserById,
  updateAppUser,
  deleteAppUser,
  createRecall,
  getAllRecalls,
  getRecallById,
  updateRecall,
  deleteRecall,
  createRecallImpact,
  getAllRecallImpacts,
  getRecallImpactById,
  updateRecallImpact,
  deleteRecallImpact,
};
