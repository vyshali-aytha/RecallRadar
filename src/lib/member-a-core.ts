import 'server-only';

import type { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { pool } from './db';
import { MemberAValidationError } from './member-a-types';
import type {
  ComponentBatchInput,
  ComponentBatchRecord,
  ComponentInput,
  ComponentRecord,
  ProductBatchComponentInput,
  ProductBatchComponentRecord,
  ProductBatchInput,
  ProductBatchRecord,
  ProductComponentInput,
  ProductComponentRecord,
  ProductInput,
  ProductRecord,
  SupplierInput,
  SupplierRecord,
} from './member-a-types';

type SqlValue = string | number | null;

function invalid(message: string): never {
  throw new MemberAValidationError(message);
}

function positiveId(value: unknown, label: string): number {
  if (!Number.isInteger(value) || Number(value) < 1 || Number(value) > 2_147_483_647) {
    return invalid(`${label} must be a positive integer.`);
  }
  return Number(value);
}

function requiredText(value: unknown, label: string, maxLength: number): string {
  if (typeof value !== 'string' || !value.trim()) return invalid(`${label} is required.`);
  const normalized = value.trim();
  if (normalized.length > maxLength) return invalid(`${label} must be ${maxLength} characters or fewer.`);
  return normalized;
}

function optionalText(value: unknown, label: string, maxLength: number): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') return invalid(`${label} must be text.`);
  const normalized = value.trim();
  if (!normalized) return null;
  if (normalized.length > maxLength) return invalid(`${label} must be ${maxLength} characters or fewer.`);
  return normalized;
}

function dateOrNull(value: unknown, label: string): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return invalid(`${label} must use the YYYY-MM-DD date format.`);
  }
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return invalid(`${label} must be a valid calendar date.`);
  }
  return value;
}

function nonnegativeInteger(value: unknown, label: string): number {
  if (!Number.isInteger(value) || Number(value) < 0 || Number(value) > 2_147_483_647) {
    return invalid(`${label} must be a whole number from 0 to 2147483647.`);
  }
  return Number(value);
}

function decimal12_2(value: unknown, label: string): string {
  const raw = typeof value === 'number' && Number.isFinite(value) ? String(value) : value;
  if (typeof raw !== 'string' || !/^\d{1,10}(?:\.\d{1,2})?$/.test(raw)) {
    return invalid(`${label} must be a positive decimal with no more than two decimal places.`);
  }
  const [whole, fraction = ''] = raw.split('.');
  const normalized = `${BigInt(whole)}.${fraction.padEnd(2, '0')}`;
  if (Number(normalized) <= 0) return invalid(`${label} must be greater than zero.`);
  return normalized;
}

function status(value: unknown, defaultValue: string): string {
  if (value === undefined || value === null) return defaultValue;
  return requiredText(value, 'Status', 30);
}

async function rows<T extends RowDataPacket>(sql: string, values: SqlValue[] = []): Promise<T[]> {
  const [result] = await pool.execute<T[]>(sql, values);
  return result.map((row) => ({ ...row }) as T);
}

async function row<T extends RowDataPacket>(sql: string, values: SqlValue[] = []): Promise<T | null> {
  const result = await rows<T>(sql, values);
  return result[0] ?? null;
}

async function inTransaction<T>(operation: (connection: PoolConnection) => Promise<T>): Promise<T> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await operation(connection);
    await connection.commit();
    return result;
  } catch (error) {
    try {
      await connection.rollback();
    } catch {
      // Preserve the original database or validation error.
    }
    throw error;
  } finally {
    connection.release();
  }
}

async function insertAndFetch<T extends RowDataPacket>(
  insertSql: string,
  insertValues: SqlValue[],
  selectSql: string,
  selectValues: (insertId: number) => SqlValue[],
): Promise<T> {
  return inTransaction(async (connection) => {
    const [insertResult] = await connection.execute<ResultSetHeader>(insertSql, insertValues);
    const [selectedRows] = await connection.execute<T[]>(selectSql, selectValues(insertResult.insertId));
    const created = selectedRows[0];
    if (!created) return invalid('The record was created but could not be retrieved.');
    return { ...created } as T;
  });
}

async function updateAndFetch<T extends RowDataPacket>(
  selectSql: string,
  keyValues: SqlValue[],
  updateSql: string,
  updateValues: SqlValue[],
  missingMessage: string,
): Promise<T> {
  return inTransaction(async (connection) => {
    const [before] = await connection.execute<T[]>(selectSql, keyValues);
    if (!before[0]) return invalid(missingMessage);
    await connection.execute<ResultSetHeader>(updateSql, updateValues);
    const [after] = await connection.execute<T[]>(selectSql, keyValues);
    if (!after[0]) return invalid('The record no longer exists.');
    return { ...after[0] } as T;
  });
}

async function write(sql: string, values: SqlValue[] = []): Promise<number> {
  const [result] = await pool.execute<ResultSetHeader>(sql, values);
  return result.affectedRows;
}

const supplierSelect = `SELECT supplier_id, name, contact_email, phone, address FROM supplier`;
const componentSelect = `SELECT component_id, name, category, supplier_id FROM component`;
const componentBatchSelect = `SELECT component_batch_id, batch_number, DATE_FORMAT(manufacture_date, '%Y-%m-%d') AS manufacture_date, DATE_FORMAT(expiry_date, '%Y-%m-%d') AS expiry_date, quantity_received, status, component_id FROM component_batch`;
const productSelect = `SELECT product_id, name, category, sku FROM product`;
const productComponentSelect = `SELECT product_id, component_id, CAST(quantity_required AS CHAR) AS quantity_required FROM product_component`;
const productBatchSelect = `SELECT product_batch_id, batch_number, DATE_FORMAT(production_date, '%Y-%m-%d') AS production_date, quantity_produced, status, product_id FROM product_batch`;
const productBatchComponentSelect = `SELECT product_batch_id, component_batch_id, CAST(quantity_used AS CHAR) AS quantity_used FROM product_batch_component`;

export async function getAllSuppliers(): Promise<SupplierRecord[]> {
  return rows<SupplierRecord & RowDataPacket>(`${supplierSelect} ORDER BY supplier_id`);
}

export async function getSupplierById(supplierId: number): Promise<SupplierRecord | null> {
  return row<SupplierRecord & RowDataPacket>(`${supplierSelect} WHERE supplier_id = ?`, [positiveId(supplierId, 'Supplier ID')]);
}

export async function createSupplier(input: SupplierInput): Promise<SupplierRecord> {
  return insertAndFetch<SupplierRecord & RowDataPacket>(
    `INSERT INTO supplier (name, contact_email, phone, address) VALUES (?, ?, ?, ?)`,
    [requiredText(input?.name, 'Supplier name', 150), optionalText(input?.contact_email, 'Contact email', 255), optionalText(input?.phone, 'Phone', 30), optionalText(input?.address, 'Address', 255)],
    `${supplierSelect} WHERE supplier_id = ?`,
    (id) => [id],
  );
}

export async function updateSupplier(supplierId: number, input: SupplierInput): Promise<SupplierRecord> {
  const id = positiveId(supplierId, 'Supplier ID');
  return updateAndFetch<SupplierRecord & RowDataPacket>(`${supplierSelect} WHERE supplier_id = ?`, [id], `UPDATE supplier SET name = ?, contact_email = ?, phone = ?, address = ? WHERE supplier_id = ?`, [
    requiredText(input?.name, 'Supplier name', 150), optionalText(input?.contact_email, 'Contact email', 255), optionalText(input?.phone, 'Phone', 30), optionalText(input?.address, 'Address', 255), id,
  ], 'Supplier not found.');
}

export async function deleteSupplier(supplierId: number): Promise<void> {
  const affected = await write(`DELETE FROM supplier WHERE supplier_id = ?`, [positiveId(supplierId, 'Supplier ID')]);
  if (!affected) return invalid('Supplier not found.');
}

export async function getAllComponents(): Promise<ComponentRecord[]> {
  return rows<ComponentRecord & RowDataPacket>(`${componentSelect} ORDER BY component_id`);
}

export async function getComponentById(componentId: number): Promise<ComponentRecord | null> {
  return row<ComponentRecord & RowDataPacket>(`${componentSelect} WHERE component_id = ?`, [positiveId(componentId, 'Component ID')]);
}

export async function createComponent(input: ComponentInput): Promise<ComponentRecord> {
  return insertAndFetch<ComponentRecord & RowDataPacket>(`INSERT INTO component (name, category, supplier_id) VALUES (?, ?, ?)`, [
    requiredText(input?.name, 'Component name', 150), optionalText(input?.category, 'Category', 100), positiveId(input?.supplier_id, 'Supplier ID'),
  ], `${componentSelect} WHERE component_id = ?`, (id) => [id]);
}

export async function updateComponent(componentId: number, input: ComponentInput): Promise<ComponentRecord> {
  const id = positiveId(componentId, 'Component ID');
  return updateAndFetch<ComponentRecord & RowDataPacket>(`${componentSelect} WHERE component_id = ?`, [id], `UPDATE component SET name = ?, category = ?, supplier_id = ? WHERE component_id = ?`, [
    requiredText(input?.name, 'Component name', 150), optionalText(input?.category, 'Category', 100), positiveId(input?.supplier_id, 'Supplier ID'), id,
  ], 'Component not found.');
}

export async function deleteComponent(componentId: number): Promise<void> {
  const affected = await write(`DELETE FROM component WHERE component_id = ?`, [positiveId(componentId, 'Component ID')]);
  if (!affected) return invalid('Component not found.');
}

export async function getAllComponentBatches(): Promise<ComponentBatchRecord[]> {
  return rows<ComponentBatchRecord & RowDataPacket>(`${componentBatchSelect} ORDER BY component_batch_id`);
}

export async function getComponentBatchById(componentBatchId: number): Promise<ComponentBatchRecord | null> {
  return row<ComponentBatchRecord & RowDataPacket>(`${componentBatchSelect} WHERE component_batch_id = ?`, [positiveId(componentBatchId, 'Component batch ID')]);
}

function componentBatchValues(input: ComponentBatchInput): SqlValue[] {
  const manufactureDate = dateOrNull(input?.manufacture_date, 'Manufacture date');
  const expiryDate = dateOrNull(input?.expiry_date, 'Expiry date');
  if (manufactureDate && expiryDate && expiryDate < manufactureDate) return invalid('Expiry date cannot be earlier than manufacture date.');
  return [
    requiredText(input?.batch_number, 'Batch number', 100), manufactureDate, expiryDate,
    nonnegativeInteger(input?.quantity_received, 'Quantity received'), status(input?.status, 'active'), positiveId(input?.component_id, 'Component ID'),
  ];
}

export async function createComponentBatch(input: ComponentBatchInput): Promise<ComponentBatchRecord> {
  return insertAndFetch<ComponentBatchRecord & RowDataPacket>(`INSERT INTO component_batch (batch_number, manufacture_date, expiry_date, quantity_received, status, component_id) VALUES (?, ?, ?, ?, ?, ?)`, componentBatchValues(input), `${componentBatchSelect} WHERE component_batch_id = ?`, (id) => [id]);
}

export async function updateComponentBatch(componentBatchId: number, input: ComponentBatchInput): Promise<ComponentBatchRecord> {
  const id = positiveId(componentBatchId, 'Component batch ID');
  return updateAndFetch<ComponentBatchRecord & RowDataPacket>(`${componentBatchSelect} WHERE component_batch_id = ?`, [id], `UPDATE component_batch SET batch_number = ?, manufacture_date = ?, expiry_date = ?, quantity_received = ?, status = ?, component_id = ? WHERE component_batch_id = ?`, [...componentBatchValues(input), id], 'Component batch not found.');
}

export async function deleteComponentBatch(componentBatchId: number): Promise<void> {
  const affected = await write(`DELETE FROM component_batch WHERE component_batch_id = ?`, [positiveId(componentBatchId, 'Component batch ID')]);
  if (!affected) return invalid('Component batch not found.');
}

export async function getAllProducts(): Promise<ProductRecord[]> {
  return rows<ProductRecord & RowDataPacket>(`${productSelect} ORDER BY product_id`);
}

export async function getProductById(productId: number): Promise<ProductRecord | null> {
  return row<ProductRecord & RowDataPacket>(`${productSelect} WHERE product_id = ?`, [positiveId(productId, 'Product ID')]);
}

export async function createProduct(input: ProductInput): Promise<ProductRecord> {
  return insertAndFetch<ProductRecord & RowDataPacket>(`INSERT INTO product (name, category, sku) VALUES (?, ?, ?)`, [
    requiredText(input?.name, 'Product name', 150), optionalText(input?.category, 'Category', 100), requiredText(input?.sku, 'SKU', 50),
  ], `${productSelect} WHERE product_id = ?`, (id) => [id]);
}

export async function updateProduct(productId: number, input: ProductInput): Promise<ProductRecord> {
  const id = positiveId(productId, 'Product ID');
  return updateAndFetch<ProductRecord & RowDataPacket>(`${productSelect} WHERE product_id = ?`, [id], `UPDATE product SET name = ?, category = ?, sku = ? WHERE product_id = ?`, [
    requiredText(input?.name, 'Product name', 150), optionalText(input?.category, 'Category', 100), requiredText(input?.sku, 'SKU', 50), id,
  ], 'Product not found.');
}

export async function deleteProduct(productId: number): Promise<void> {
  const affected = await write(`DELETE FROM product WHERE product_id = ?`, [positiveId(productId, 'Product ID')]);
  if (!affected) return invalid('Product not found.');
}

export async function getAllProductComponents(): Promise<ProductComponentRecord[]> {
  return rows<ProductComponentRecord & RowDataPacket>(`${productComponentSelect} ORDER BY product_id, component_id`);
}

export async function getProductComponent(productId: number, componentId: number): Promise<ProductComponentRecord | null> {
  return row<ProductComponentRecord & RowDataPacket>(`${productComponentSelect} WHERE product_id = ? AND component_id = ?`, [positiveId(productId, 'Product ID'), positiveId(componentId, 'Component ID')]);
}

export async function createProductComponent(input: ProductComponentInput): Promise<ProductComponentRecord> {
  const productId = positiveId(input?.product_id, 'Product ID');
  const componentId = positiveId(input?.component_id, 'Component ID');
  const quantity = decimal12_2(input?.quantity_required, 'Quantity required');
  return insertAndFetch<ProductComponentRecord & RowDataPacket>(`INSERT INTO product_component (product_id, component_id, quantity_required) VALUES (?, ?, ?)`, [productId, componentId, quantity], `${productComponentSelect} WHERE product_id = ? AND component_id = ?`, () => [productId, componentId]);
}

export async function updateProductComponent(productId: number, componentId: number, quantityRequired: number | string): Promise<ProductComponentRecord> {
  const product = positiveId(productId, 'Product ID');
  const component = positiveId(componentId, 'Component ID');
  return updateAndFetch<ProductComponentRecord & RowDataPacket>(`${productComponentSelect} WHERE product_id = ? AND component_id = ?`, [product, component], `UPDATE product_component SET quantity_required = ? WHERE product_id = ? AND component_id = ?`, [decimal12_2(quantityRequired, 'Quantity required'), product, component], 'BOM entry not found.');
}

export async function deleteProductComponent(productId: number, componentId: number): Promise<void> {
  const affected = await write(`DELETE FROM product_component WHERE product_id = ? AND component_id = ?`, [positiveId(productId, 'Product ID'), positiveId(componentId, 'Component ID')]);
  if (!affected) return invalid('BOM entry not found.');
}

export async function getAllProductBatches(): Promise<ProductBatchRecord[]> {
  return rows<ProductBatchRecord & RowDataPacket>(`${productBatchSelect} ORDER BY product_batch_id`);
}

export async function getProductBatchById(productBatchId: number): Promise<ProductBatchRecord | null> {
  return row<ProductBatchRecord & RowDataPacket>(`${productBatchSelect} WHERE product_batch_id = ?`, [positiveId(productBatchId, 'Product batch ID')]);
}

function productBatchValues(input: ProductBatchInput): SqlValue[] {
  return [
    requiredText(input?.batch_number, 'Batch number', 100), dateOrNull(input?.production_date, 'Production date'),
    nonnegativeInteger(input?.quantity_produced, 'Quantity produced'), status(input?.status, 'active'), positiveId(input?.product_id, 'Product ID'),
  ];
}

export async function createProductBatch(input: ProductBatchInput): Promise<ProductBatchRecord> {
  return insertAndFetch<ProductBatchRecord & RowDataPacket>(`INSERT INTO product_batch (batch_number, production_date, quantity_produced, status, product_id) VALUES (?, ?, ?, ?, ?)`, productBatchValues(input), `${productBatchSelect} WHERE product_batch_id = ?`, (id) => [id]);
}

export async function updateProductBatch(productBatchId: number, input: ProductBatchInput): Promise<ProductBatchRecord> {
  const id = positiveId(productBatchId, 'Product batch ID');
  return updateAndFetch<ProductBatchRecord & RowDataPacket>(`${productBatchSelect} WHERE product_batch_id = ?`, [id], `UPDATE product_batch SET batch_number = ?, production_date = ?, quantity_produced = ?, status = ?, product_id = ? WHERE product_batch_id = ?`, [...productBatchValues(input), id], 'Product batch not found.');
}

export async function deleteProductBatch(productBatchId: number): Promise<void> {
  const affected = await write(`DELETE FROM product_batch WHERE product_batch_id = ?`, [positiveId(productBatchId, 'Product batch ID')]);
  if (!affected) return invalid('Product batch not found.');
}

export async function getAllProductBatchComponents(): Promise<ProductBatchComponentRecord[]> {
  return rows<ProductBatchComponentRecord & RowDataPacket>(`${productBatchComponentSelect} ORDER BY product_batch_id, component_batch_id`);
}

export async function getProductBatchComponent(productBatchId: number, componentBatchId: number): Promise<ProductBatchComponentRecord | null> {
  return row<ProductBatchComponentRecord & RowDataPacket>(`${productBatchComponentSelect} WHERE product_batch_id = ? AND component_batch_id = ?`, [positiveId(productBatchId, 'Product batch ID'), positiveId(componentBatchId, 'Component batch ID')]);
}

export async function createProductBatchComponent(input: ProductBatchComponentInput): Promise<ProductBatchComponentRecord> {
  const productBatchId = positiveId(input?.product_batch_id, 'Product batch ID');
  const componentBatchId = positiveId(input?.component_batch_id, 'Component batch ID');
  const quantity = decimal12_2(input?.quantity_used, 'Quantity used');
  return insertAndFetch<ProductBatchComponentRecord & RowDataPacket>(`INSERT INTO product_batch_component (product_batch_id, component_batch_id, quantity_used) VALUES (?, ?, ?)`, [productBatchId, componentBatchId, quantity], `${productBatchComponentSelect} WHERE product_batch_id = ? AND component_batch_id = ?`, () => [productBatchId, componentBatchId]);
}

export async function updateProductBatchComponent(productBatchId: number, componentBatchId: number, quantityUsed: number | string): Promise<ProductBatchComponentRecord> {
  const productBatch = positiveId(productBatchId, 'Product batch ID');
  const componentBatch = positiveId(componentBatchId, 'Component batch ID');
  return updateAndFetch<ProductBatchComponentRecord & RowDataPacket>(`${productBatchComponentSelect} WHERE product_batch_id = ? AND component_batch_id = ?`, [productBatch, componentBatch], `UPDATE product_batch_component SET quantity_used = ? WHERE product_batch_id = ? AND component_batch_id = ?`, [decimal12_2(quantityUsed, 'Quantity used'), productBatch, componentBatch], 'Batch composition entry not found.');
}

export async function deleteProductBatchComponent(productBatchId: number, componentBatchId: number): Promise<void> {
  const affected = await write(`DELETE FROM product_batch_component WHERE product_batch_id = ? AND component_batch_id = ?`, [positiveId(productBatchId, 'Product batch ID'), positiveId(componentBatchId, 'Component batch ID')]);
  if (!affected) return invalid('Batch composition entry not found.');
}
