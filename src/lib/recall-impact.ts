import 'server-only';

import { pool } from './db';
import driver from './neo4j';

export type RecallImpactResult = {
  recallId: number;
  recall: Record<string, unknown> | null;
  recalledComponent: Record<string, unknown> | null;
  recalledComponentBatch: Record<string, unknown> | null;
  affectedProducts: Record<string, unknown>[];
  affectedProductBatches: Record<string, unknown>[];
  distributors: Record<string, unknown>[];
  shipments: Record<string, unknown>[];
  inventory: Record<string, unknown>[];
  inventoryLocations: Record<string, unknown>[];
  error?: string;
};

function buildInPlaceholders(values: number[]): string {
  return values.map(() => '?').join(', ');
}

async function fetchOne<T = Record<string, unknown>>(sql: string, values: unknown[] = []): Promise<T | null> {
  const [rows] = await pool.execute<any>(sql, values as any);
  if (!Array.isArray(rows) || rows.length === 0) {
    return null;
  }

  return rows[0] as T;
}

async function fetchAll<T = Record<string, unknown>>(sql: string, values: unknown[] = []): Promise<T[]> {
  const [rows] = await pool.execute<any>(sql, values as any);
  return Array.isArray(rows) ? (rows as T[]) : [];
}

async function fetchRecallMeta(recallId: number) {
  const recallRow = await fetchOne<any>(
    `SELECT * FROM recall WHERE recall_id = ?`,
    [recallId]
  );

  if (!recallRow) {
    return null;
  }

  const userRow = recallRow.user_id
    ? await fetchOne<any>(`SELECT * FROM app_user WHERE user_id = ?`, [recallRow.user_id])
    : null;

  const componentRow = recallRow.component_id
    ? await fetchOne<any>(`SELECT * FROM component WHERE component_id = ?`, [recallRow.component_id])
    : null;

  const componentBatchRow = recallRow.component_batch_id
    ? await fetchOne<any>(`SELECT * FROM component_batch WHERE component_batch_id = ?`, [recallRow.component_batch_id])
    : null;

  return {
    recall: recallRow,
    user: userRow,
    component: componentRow,
    componentBatch: componentBatchRow,
  };
}

async function fetchBatchDetails(productBatchIds: number[]) {
  if (productBatchIds.length === 0) {
    return {
      products: [] as Record<string, unknown>[],
      productBatches: [] as Record<string, unknown>[],
      distributors: [] as Record<string, unknown>[],
      shipments: [] as Record<string, unknown>[],
      inventory: [] as Record<string, unknown>[],
      inventoryLocations: [] as Record<string, unknown>[],
    };
  }

  const placeholders = buildInPlaceholders(productBatchIds);

  const productBatches = await fetchAll<any>(
    `SELECT * FROM product_batch WHERE product_batch_id IN (${placeholders}) ORDER BY product_batch_id`,
    productBatchIds
  );

  const productIds = [...new Set(productBatches.map((row) => row.product_id).filter((id) => Number.isFinite(id)))];

  const products = productIds.length
    ? await fetchAll<any>(
        `SELECT * FROM product WHERE product_id IN (${buildInPlaceholders(productIds)}) ORDER BY product_id`,
        productIds
      )
    : [];

  const shipments = await fetchAll<any>(
    `SELECT s.*, d.*
     FROM shipment s
     INNER JOIN distributor d ON d.distributor_id = s.distributor_id
     WHERE s.product_batch_id IN (${placeholders})
     ORDER BY s.shipment_id`,
    productBatchIds
  );

  const distributors = shipments.map((row) => ({
    distributor_id: row.distributor_id,
    name: row.name,
    region: row.region,
    contact_email: row.contact_email,
  }));

  const inventoryRows = await fetchAll<any>(
    `SELECT i.*, l.*
     FROM inventory i
     INNER JOIN inventory_location l ON l.location_id = i.location_id
     WHERE i.product_batch_id IN (${placeholders})
     ORDER BY i.inventory_id`,
    productBatchIds
  );

  const inventoryLocations = inventoryRows.map((row) => ({
    location_id: row.location_id,
    name: row.name,
    type: row.type,
    address: row.address,
  }));

  return {
    products,
    productBatches,
    distributors,
    shipments: shipments.map((row) => ({
      shipment_id: row.shipment_id,
      shipment_date: row.shipment_date,
      quantity_shipped: row.quantity_shipped,
      status: row.status,
      distributor_id: row.distributor_id,
      product_batch_id: row.product_batch_id,
    })),
    inventory: inventoryRows.map((row) => ({
      inventory_id: row.inventory_id,
      quantity_on_hand: row.quantity_on_hand,
      last_updated: row.last_updated,
      product_batch_id: row.product_batch_id,
      location_id: row.location_id,
    })),
    inventoryLocations,
  };
}

export async function getRecallImpact(recallId: number): Promise<RecallImpactResult> {
  if (!Number.isInteger(recallId) || recallId <= 0) {
    return {
      recallId,
      recall: null,
      recalledComponent: null,
      recalledComponentBatch: null,
      affectedProducts: [],
      affectedProductBatches: [],
      distributors: [],
      shipments: [],
      inventory: [],
      inventoryLocations: [],
      error: 'Invalid recall ID.',
    };
  }

  const session = driver.session({
    database: process.env.NEO4J_DATABASE || 'neo4j',
  });

  try {
    const recallMeta = await fetchRecallMeta(recallId);

    if (!recallMeta || !recallMeta.recall) {
      return {
        recallId,
        recall: null,
        recalledComponent: null,
        recalledComponentBatch: null,
        affectedProducts: [],
        affectedProductBatches: [],
        distributors: [],
        shipments: [],
        inventory: [],
        inventoryLocations: [],
        error: 'Recall not found in MySQL.',
      };
    }

    const result = await session.run(
      `
        MATCH (r:Recall {mysqlId: $recallId})
        OPTIONAL MATCH (r)-[:IMPACTS]->(productBatch:ProductBatch)
        OPTIONAL MATCH (product:Product)-[:HAS_BATCH]->(productBatch)
        OPTIONAL MATCH (productBatch)-[:SHIPPED_TO]->(distributor:Distributor)
        OPTIONAL MATCH (productBatch)-[:STOCKED_AT]->(inventoryLocation:InventoryLocation)
        OPTIONAL MATCH (recallComponent:Component {mysqlId: $componentId})
        OPTIONAL MATCH (recallComponentBatch:ComponentBatch {mysqlId: $componentBatchId})
        RETURN
          collect(DISTINCT productBatch { .* }) AS productBatches,
          collect(DISTINCT product { .* }) AS products,
          collect(DISTINCT distributor { .* }) AS distributors,
          collect(DISTINCT inventoryLocation { .* }) AS inventoryLocations,
          recallComponent AS recalledComponent,
          recallComponentBatch AS recalledComponentBatch
      `,
      {
        recallId,
        componentId: recallMeta.recall.component_id,
        componentBatchId: recallMeta.recall.component_batch_id,
      }
    );

    const row = result.records[0];
    const productBatches = row?.get('productBatches') ?? [];
    const products = row?.get('products') ?? [];
    const distributors = row?.get('distributors') ?? [];
    const inventoryLocations = row?.get('inventoryLocations') ?? [];
    const recalledComponent = row?.get('recalledComponent') ?? null;
    const recalledComponentBatch = row?.get('recalledComponentBatch') ?? null;

    const productBatchIds = Array.from(
      new Set(
        (Array.isArray(productBatches) ? productBatches : []).map((entry) => Number((entry as Record<string, unknown>).mysqlId ?? 0)).filter((value) => value > 0)
      )
    );

    const batchDetails = await fetchBatchDetails(productBatchIds);

    return {
      recallId,
      recall: recallMeta.recall,
      recalledComponent: recalledComponent
        ? {
            ...recalledComponent,
            mysqlId: recalledComponent.mysqlId ?? recallMeta.recall.component_id,
          }
        : recallMeta.component,
      recalledComponentBatch: recalledComponentBatch
        ? {
            ...recalledComponentBatch,
            mysqlId: recalledComponentBatch.mysqlId ?? recallMeta.recall.component_batch_id,
          }
        : recallMeta.componentBatch,
      affectedProducts: Array.isArray(products) ? products.map((entry) => ({ ...(entry as object) })) : [],
      affectedProductBatches: Array.isArray(productBatches) ? productBatches.map((entry) => ({ ...(entry as object) })) : batchDetails.productBatches,
      distributors: Array.isArray(distributors) ? distributors.map((entry) => ({ ...(entry as object) })) : batchDetails.distributors,
      shipments: batchDetails.shipments,
      inventory: batchDetails.inventory,
      inventoryLocations: Array.isArray(inventoryLocations)
        ? inventoryLocations.map((entry) => ({ ...(entry as object) }))
        : batchDetails.inventoryLocations,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown recall impact analysis error';
    return {
      recallId,
      recall: null,
      recalledComponent: null,
      recalledComponentBatch: null,
      affectedProducts: [],
      affectedProductBatches: [],
      distributors: [],
      shipments: [],
      inventory: [],
      inventoryLocations: [],
      error: message,
    };
  } finally {
    await session.close();
  }
}

export default getRecallImpact;
