import 'server-only';

import { pool } from './db';
import driver from './neo4j';

export type SyncSummary = {
  success: boolean;
  synced: {
    suppliers: number;
    components: number;
    componentBatches: number;
    products: number;
    productBatches: number;
    distributors: number;
    inventoryLocations: number;
    recalls: number;
  };
  error?: string;
};

type SupplierRow = {
  supplier_id: number;
  name: string;
  contact_email: string | null;
  phone: string | null;
  address: string | null;
};

type ComponentRow = {
  component_id: number;
  name: string;
  category: string | null;
  supplier_id: number;
};

type ComponentBatchRow = {
  component_batch_id: number;
  batch_number: string;
  manufacture_date: string | null;
  expiry_date: string | null;
  quantity_received: number;
  status: string;
  component_id: number;
};

type ProductRow = {
  product_id: number;
  name: string;
  category: string | null;
  sku: string;
};

type ProductBatchRow = {
  product_batch_id: number;
  batch_number: string;
  production_date: string | null;
  quantity_produced: number;
  status: string;
  product_id: number;
};

type DistributorRow = {
  distributor_id: number;
  name: string;
  region: string | null;
  contact_email: string | null;
};

type InventoryLocationRow = {
  location_id: number;
  name: string;
  type: string | null;
  address: string | null;
};

type RecallRow = {
  recall_id: number;
  recall_date: string;
  reason: string | null;
  severity: string | null;
  status: string;
  user_id: number;
  component_id: number | null;
  component_batch_id: number | null;
};

type ProductComponentRow = {
  product_id: number;
  component_id: number;
  quantity_required: number;
};

type ProductBatchComponentRow = {
  product_batch_id: number;
  component_batch_id: number;
  quantity_used: number;
};

type ShipmentRow = {
  shipment_id: number;
  shipment_date: string | null;
  quantity_shipped: number;
  status: string;
  distributor_id: number;
  product_batch_id: number;
};

type InventoryRow = {
  inventory_id: number;
  quantity_on_hand: number;
  last_updated: string;
  product_batch_id: number;
  location_id: number;
};

type RecallImpactRow = {
  recall_impact_id: number;
  identified_date: string;
  impact_type: string;
  recall_id: number;
  product_batch_id: number;
};

function sanitizeNeo4jProperty(value: unknown): string | number | boolean | null | undefined | Array<string | number | boolean | null> {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'bigint') {
    return Number(value);
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    const sanitized = value
      .map((item) => sanitizeNeo4jProperty(item))
      .filter((item): item is string | number | boolean | null => item !== undefined && item !== null);

    return sanitized;
  }

  if (typeof value === 'object') {
    if (value instanceof Map) {
      const plain = Object.fromEntries(Array.from(value.entries()).map(([key, item]) => [key, sanitizeNeo4jProperty(item)]));
      return Object.keys(plain).length > 0 ? JSON.stringify(plain) : null;
    }

    return null;
  }

  return String(value);
}

function sanitizeNeo4jProperties<T extends Record<string, unknown>>(properties: T): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(properties)) {
    sanitized[key] = sanitizeNeo4jProperty(value);
  }

  return sanitized;
}

async function fetchAll<T>(sql: string, values: unknown[] = []): Promise<T[]> {
  const [rows] = await pool.execute<any>(sql, values as any);
  return rows as T[];
}

export async function syncMySQLToNeo4j(): Promise<SyncSummary> {
  const session = driver.session({
    database: process.env.NEO4J_DATABASE || 'neo4j',
  });

  try {
    const suppliers = await fetchAll<SupplierRow>(
      `SELECT supplier_id, name, contact_email, phone, address FROM supplier ORDER BY supplier_id`
    );
    const components = await fetchAll<ComponentRow>(
      `SELECT component_id, name, category, supplier_id FROM component ORDER BY component_id`
    );
    const componentBatches = await fetchAll<ComponentBatchRow>(
      `SELECT component_batch_id, batch_number, manufacture_date, expiry_date, quantity_received, status, component_id
       FROM component_batch ORDER BY component_batch_id`
    );
    const products = await fetchAll<ProductRow>(
      `SELECT product_id, name, category, sku FROM product ORDER BY product_id`
    );
    const productBatches = await fetchAll<ProductBatchRow>(
      `SELECT product_batch_id, batch_number, production_date, quantity_produced, status, product_id
       FROM product_batch ORDER BY product_batch_id`
    );
    const distributors = await fetchAll<DistributorRow>(
      `SELECT distributor_id, name, region, contact_email FROM distributor ORDER BY distributor_id`
    );
    const inventoryLocations = await fetchAll<InventoryLocationRow>(
      `SELECT location_id, name, type, address FROM inventory_location ORDER BY location_id`
    );
    const recalls = await fetchAll<RecallRow>(
      `SELECT recall_id, recall_date, reason, severity, status, user_id, component_id, component_batch_id
       FROM recall ORDER BY recall_id`
    );
    const productComponents = await fetchAll<ProductComponentRow>(
      `SELECT product_id, component_id, quantity_required FROM product_component ORDER BY product_id, component_id`
    );
    const productBatchComponents = await fetchAll<ProductBatchComponentRow>(
      `SELECT product_batch_id, component_batch_id, quantity_used FROM product_batch_component ORDER BY product_batch_id, component_batch_id`
    );
    const shipments = await fetchAll<ShipmentRow>(
      `SELECT shipment_id, shipment_date, quantity_shipped, status, distributor_id, product_batch_id
       FROM shipment ORDER BY shipment_id`
    );
    const inventory = await fetchAll<InventoryRow>(
      `SELECT inventory_id, quantity_on_hand, last_updated, product_batch_id, location_id
       FROM inventory ORDER BY inventory_id`
    );
    const recallImpacts = await fetchAll<RecallImpactRow>(
      `SELECT recall_impact_id, identified_date, impact_type, recall_id, product_batch_id
       FROM recall_impact ORDER BY recall_impact_id`
    );

    await session.executeWrite(async (tx) => {
      for (const supplier of suppliers) {
        const props = sanitizeNeo4jProperties({
          mysqlId: supplier.supplier_id,
          name: supplier.name,
          contactEmail: supplier.contact_email,
          phone: supplier.phone,
          address: supplier.address,
        });

        await tx.run(
          `MERGE (s:Supplier {mysqlId: $mysqlId})
           SET s.name = $name,
               s.contactEmail = $contactEmail,
               s.phone = $phone,
               s.address = $address`,
          props
        );
      }

      for (const component of components) {
        const props = sanitizeNeo4jProperties({
          mysqlId: component.component_id,
          name: component.name,
          category: component.category,
          supplierId: component.supplier_id,
        });

        await tx.run(
          `MERGE (c:Component {mysqlId: $mysqlId})
           SET c.name = $name,
               c.category = $category,
               c.supplierId = $supplierId`,
          props
        );

        await tx.run(
          `MATCH (s:Supplier {mysqlId: $supplierId}), (c:Component {mysqlId: $componentId})
           MERGE (s)-[:SUPPLIES]->(c)`,
          sanitizeNeo4jProperties({
            supplierId: component.supplier_id,
            componentId: component.component_id,
          })
        );
      }

      for (const componentBatch of componentBatches) {
        const props = sanitizeNeo4jProperties({
          mysqlId: componentBatch.component_batch_id,
          batchNumber: componentBatch.batch_number,
          manufactureDate: componentBatch.manufacture_date,
          expiryDate: componentBatch.expiry_date,
          quantityReceived: componentBatch.quantity_received,
          status: componentBatch.status,
          componentId: componentBatch.component_id,
        });

        await tx.run(
          `MERGE (cb:ComponentBatch {mysqlId: $mysqlId})
           SET cb.batchNumber = $batchNumber,
               cb.manufactureDate = $manufactureDate,
               cb.expiryDate = $expiryDate,
               cb.quantityReceived = $quantityReceived,
               cb.status = $status,
               cb.componentId = $componentId`,
          props
        );

        await tx.run(
          `MATCH (c:Component {mysqlId: $componentId}), (cb:ComponentBatch {mysqlId: $componentBatchId})
           MERGE (c)-[:HAS_BATCH]->(cb)`,
          sanitizeNeo4jProperties({
            componentId: componentBatch.component_id,
            componentBatchId: componentBatch.component_batch_id,
          })
        );
      }

      for (const product of products) {
        const props = sanitizeNeo4jProperties({
          mysqlId: product.product_id,
          name: product.name,
          category: product.category,
          sku: product.sku,
        });

        await tx.run(
          `MERGE (p:Product {mysqlId: $mysqlId})
           SET p.name = $name,
               p.category = $category,
               p.sku = $sku`,
          props
        );
      }

      for (const productBatch of productBatches) {
        const props = sanitizeNeo4jProperties({
          mysqlId: productBatch.product_batch_id,
          batchNumber: productBatch.batch_number,
          productionDate: productBatch.production_date,
          quantityProduced: productBatch.quantity_produced,
          status: productBatch.status,
          productId: productBatch.product_id,
        });

        await tx.run(
          `MERGE (pb:ProductBatch {mysqlId: $mysqlId})
           SET pb.batchNumber = $batchNumber,
               pb.productionDate = $productionDate,
               pb.quantityProduced = $quantityProduced,
               pb.status = $status,
               pb.productId = $productId`,
          props
        );

        await tx.run(
          `MATCH (p:Product {mysqlId: $productId}), (pb:ProductBatch {mysqlId: $productBatchId})
           MERGE (p)-[:HAS_BATCH]->(pb)`,
          sanitizeNeo4jProperties({
            productId: productBatch.product_id,
            productBatchId: productBatch.product_batch_id,
          })
        );
      }

      for (const distributor of distributors) {
        const props = sanitizeNeo4jProperties({
          mysqlId: distributor.distributor_id,
          name: distributor.name,
          region: distributor.region,
          contactEmail: distributor.contact_email,
        });

        await tx.run(
          `MERGE (d:Distributor {mysqlId: $mysqlId})
           SET d.name = $name,
               d.region = $region,
               d.contactEmail = $contactEmail`,
          props
        );
      }

      for (const inventoryLocation of inventoryLocations) {
        const props = sanitizeNeo4jProperties({
          mysqlId: inventoryLocation.location_id,
          name: inventoryLocation.name,
          type: inventoryLocation.type,
          address: inventoryLocation.address,
        });

        await tx.run(
          `MERGE (l:InventoryLocation {mysqlId: $mysqlId})
           SET l.name = $name,
               l.type = $type,
               l.address = $address`,
          props
        );
      }

      for (const recall of recalls) {
        const props = sanitizeNeo4jProperties({
          mysqlId: recall.recall_id,
          recallDate: recall.recall_date,
          reason: recall.reason,
          severity: recall.severity,
          status: recall.status,
          userId: recall.user_id,
          componentId: recall.component_id,
          componentBatchId: recall.component_batch_id,
        });

        await tx.run(
          `MERGE (r:Recall {mysqlId: $mysqlId})
           SET r.recallDate = $recallDate,
               r.reason = $reason,
               r.severity = $severity,
               r.status = $status,
               r.userId = $userId,
               r.componentId = $componentId,
               r.componentBatchId = $componentBatchId`,
          props
        );
      }

      for (const row of productComponents) {
        await tx.run(
          `MATCH (p:Product {mysqlId: $productId}), (c:Component {mysqlId: $componentId})
           MERGE (p)-[:USES_COMPONENT]->(c)`,
          sanitizeNeo4jProperties({
            productId: row.product_id,
            componentId: row.component_id,
          })
        );
      }

      for (const row of productBatchComponents) {
        await tx.run(
          `MATCH (pb:ProductBatch {mysqlId: $productBatchId}), (cb:ComponentBatch {mysqlId: $componentBatchId})
           MERGE (pb)-[:CONTAINS_COMPONENT_BATCH]->(cb)`,
          sanitizeNeo4jProperties({
            productBatchId: row.product_batch_id,
            componentBatchId: row.component_batch_id,
          })
        );
      }

      for (const shipment of shipments) {
        await tx.run(
          `MATCH (pb:ProductBatch {mysqlId: $productBatchId}), (d:Distributor {mysqlId: $distributorId})
           MERGE (pb)-[:SHIPPED_TO]->(d)`,
          sanitizeNeo4jProperties({
            productBatchId: shipment.product_batch_id,
            distributorId: shipment.distributor_id,
          })
        );
      }

      for (const inventoryRow of inventory) {
        await tx.run(
          `MATCH (pb:ProductBatch {mysqlId: $productBatchId}), (l:InventoryLocation {mysqlId: $locationId})
           MERGE (pb)-[:STOCKED_AT]->(l)`,
          sanitizeNeo4jProperties({
            productBatchId: inventoryRow.product_batch_id,
            locationId: inventoryRow.location_id,
          })
        );
      }

      for (const recallImpact of recallImpacts) {
        await tx.run(
          `MATCH (r:Recall {mysqlId: $recallId}), (pb:ProductBatch {mysqlId: $productBatchId})
           MERGE (r)-[:IMPACTS]->(pb)`,
          sanitizeNeo4jProperties({
            recallId: recallImpact.recall_id,
            productBatchId: recallImpact.product_batch_id,
          })
        );
      }
    });

    return {
      success: true,
      synced: {
        suppliers: suppliers.length,
        components: components.length,
        componentBatches: componentBatches.length,
        products: products.length,
        productBatches: productBatches.length,
        distributors: distributors.length,
        inventoryLocations: inventoryLocations.length,
        recalls: recalls.length,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown Neo4j sync error';
    console.error('MySQL to Neo4j synchronization failed:', error);

    return {
      success: false,
      synced: {
        suppliers: 0,
        components: 0,
        componentBatches: 0,
        products: 0,
        productBatches: 0,
        distributors: 0,
        inventoryLocations: 0,
        recalls: 0,
      },
      error: message,
    };
  } finally {
    await session.close();
  }
}

export default syncMySQLToNeo4j;
