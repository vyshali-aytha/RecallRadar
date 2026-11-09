'use server';

import { requireRole } from './auth';
import * as core from './member-a-core';
import type {
  ComponentBatchInput,
  ComponentBatchRecord,
  ComponentInput,
  ComponentRecord,
  MemberAResult,
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
import { MemberAValidationError } from './member-a-types';

type Permission = 'read' | 'write';

function safeError(error: unknown): string {
  if (error instanceof MemberAValidationError) return error.message;

  const code = error && typeof error === 'object' && 'code' in error
    ? String((error as { code?: unknown }).code)
    : '';

  if (code === 'ER_DUP_ENTRY') return 'A record with one of these unique values already exists.';
  if (code === 'ER_NO_REFERENCED_ROW_2' || code === 'ER_NO_REFERENCED_ROW') {
    return 'The selected related record does not exist. Refresh the list and choose a valid record.';
  }
  if (code === 'ER_ROW_IS_REFERENCED_2' || code === 'ER_ROW_IS_REFERENCED') {
    return 'This record is referenced by related or historical data and cannot be deleted.';
  }
  if (code === 'ER_CHECK_CONSTRAINT_VIOLATED') return 'One or more values violate a database constraint.';

  if (error instanceof Error && error.message === 'Authentication required.') {
    return 'Sign in is required to access these records.';
  }
  if (error instanceof Error && error.message === 'Insufficient role permissions.') {
    return 'Only an Admin can create, update, or delete these records.';
  }
  return 'The database operation could not be completed. Please try again.';
}

async function run<T>(permission: Permission, operation: () => Promise<T>): Promise<MemberAResult<T>> {
  try {
    await requireRole(permission === 'read' ? ['Admin', 'Staff'] : 'Admin');
    return { success: true, data: await operation() };
  } catch (error) {
    return { success: false, error: safeError(error) };
  }
}

// Supplier
export async function getAllSuppliers(): Promise<MemberAResult<SupplierRecord[]>> {
  return run('read', () => core.getAllSuppliers());
}

export async function getSupplierById(supplierId: number): Promise<MemberAResult<SupplierRecord | null>> {
  return run('read', () => core.getSupplierById(supplierId));
}

export async function createSupplier(input: SupplierInput): Promise<MemberAResult<SupplierRecord>> {
  return run('write', () => core.createSupplier(input));
}

export async function updateSupplier(supplierId: number, input: SupplierInput): Promise<MemberAResult<SupplierRecord>> {
  return run('write', () => core.updateSupplier(supplierId, input));
}

export async function deleteSupplier(supplierId: number): Promise<MemberAResult<null>> {
  return run('write', async () => { await core.deleteSupplier(supplierId); return null; });
}

// Component
export async function getAllComponents(): Promise<MemberAResult<ComponentRecord[]>> {
  return run('read', () => core.getAllComponents());
}

export async function getComponentById(componentId: number): Promise<MemberAResult<ComponentRecord | null>> {
  return run('read', () => core.getComponentById(componentId));
}

export async function createComponent(input: ComponentInput): Promise<MemberAResult<ComponentRecord>> {
  return run('write', () => core.createComponent(input));
}

export async function updateComponent(componentId: number, input: ComponentInput): Promise<MemberAResult<ComponentRecord>> {
  return run('write', () => core.updateComponent(componentId, input));
}

export async function deleteComponent(componentId: number): Promise<MemberAResult<null>> {
  return run('write', async () => { await core.deleteComponent(componentId); return null; });
}

// Component batch
export async function getAllComponentBatches(): Promise<MemberAResult<ComponentBatchRecord[]>> {
  return run('read', () => core.getAllComponentBatches());
}

export async function getComponentBatchById(componentBatchId: number): Promise<MemberAResult<ComponentBatchRecord | null>> {
  return run('read', () => core.getComponentBatchById(componentBatchId));
}

export async function createComponentBatch(input: ComponentBatchInput): Promise<MemberAResult<ComponentBatchRecord>> {
  return run('write', () => core.createComponentBatch(input));
}

export async function updateComponentBatch(componentBatchId: number, input: ComponentBatchInput): Promise<MemberAResult<ComponentBatchRecord>> {
  return run('write', () => core.updateComponentBatch(componentBatchId, input));
}

export async function deleteComponentBatch(componentBatchId: number): Promise<MemberAResult<null>> {
  return run('write', async () => { await core.deleteComponentBatch(componentBatchId); return null; });
}

// Product
export async function getAllProducts(): Promise<MemberAResult<ProductRecord[]>> {
  return run('read', () => core.getAllProducts());
}

export async function getProductById(productId: number): Promise<MemberAResult<ProductRecord | null>> {
  return run('read', () => core.getProductById(productId));
}

export async function createProduct(input: ProductInput): Promise<MemberAResult<ProductRecord>> {
  return run('write', () => core.createProduct(input));
}

export async function updateProduct(productId: number, input: ProductInput): Promise<MemberAResult<ProductRecord>> {
  return run('write', () => core.updateProduct(productId, input));
}

export async function deleteProduct(productId: number): Promise<MemberAResult<null>> {
  return run('write', async () => { await core.deleteProduct(productId); return null; });
}

// Product BOM relationship
export async function getAllProductComponents(): Promise<MemberAResult<ProductComponentRecord[]>> {
  return run('read', () => core.getAllProductComponents());
}

export async function getProductComponent(productId: number, componentId: number): Promise<MemberAResult<ProductComponentRecord | null>> {
  return run('read', () => core.getProductComponent(productId, componentId));
}

export async function createProductComponent(input: ProductComponentInput): Promise<MemberAResult<ProductComponentRecord>> {
  return run('write', () => core.createProductComponent(input));
}

export async function updateProductComponent(productId: number, componentId: number, quantityRequired: number | string): Promise<MemberAResult<ProductComponentRecord>> {
  return run('write', () => core.updateProductComponent(productId, componentId, quantityRequired));
}

export async function deleteProductComponent(productId: number, componentId: number): Promise<MemberAResult<null>> {
  return run('write', async () => { await core.deleteProductComponent(productId, componentId); return null; });
}

// Product batch
export async function getAllProductBatches(): Promise<MemberAResult<ProductBatchRecord[]>> {
  return run('read', () => core.getAllProductBatches());
}

export async function getProductBatchById(productBatchId: number): Promise<MemberAResult<ProductBatchRecord | null>> {
  return run('read', () => core.getProductBatchById(productBatchId));
}

export async function createProductBatch(input: ProductBatchInput): Promise<MemberAResult<ProductBatchRecord>> {
  return run('write', () => core.createProductBatch(input));
}

export async function updateProductBatch(productBatchId: number, input: ProductBatchInput): Promise<MemberAResult<ProductBatchRecord>> {
  return run('write', () => core.updateProductBatch(productBatchId, input));
}

export async function deleteProductBatch(productBatchId: number): Promise<MemberAResult<null>> {
  return run('write', async () => { await core.deleteProductBatch(productBatchId); return null; });
}

// Product batch composition relationship
export async function getAllProductBatchComponents(): Promise<MemberAResult<ProductBatchComponentRecord[]>> {
  return run('read', () => core.getAllProductBatchComponents());
}

export async function getProductBatchComponent(productBatchId: number, componentBatchId: number): Promise<MemberAResult<ProductBatchComponentRecord | null>> {
  return run('read', () => core.getProductBatchComponent(productBatchId, componentBatchId));
}

export async function createProductBatchComponent(input: ProductBatchComponentInput): Promise<MemberAResult<ProductBatchComponentRecord>> {
  return run('write', () => core.createProductBatchComponent(input));
}

export async function updateProductBatchComponent(productBatchId: number, componentBatchId: number, quantityUsed: number | string): Promise<MemberAResult<ProductBatchComponentRecord>> {
  return run('write', () => core.updateProductBatchComponent(productBatchId, componentBatchId, quantityUsed));
}

export async function deleteProductBatchComponent(productBatchId: number, componentBatchId: number): Promise<MemberAResult<null>> {
  return run('write', async () => { await core.deleteProductBatchComponent(productBatchId, componentBatchId); return null; });
}
