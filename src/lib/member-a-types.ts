export type MemberAResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export class MemberAValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MemberAValidationError';
  }
}

export type SupplierRecord = {
  supplier_id: number;
  name: string;
  contact_email: string | null;
  phone: string | null;
  address: string | null;
};

export type SupplierInput = {
  name: string;
  contact_email?: string | null;
  phone?: string | null;
  address?: string | null;
};

export type ComponentRecord = {
  component_id: number;
  name: string;
  category: string | null;
  supplier_id: number;
};

export type ComponentInput = {
  name: string;
  category?: string | null;
  supplier_id: number;
};

export type ComponentBatchRecord = {
  component_batch_id: number;
  batch_number: string;
  manufacture_date: string | null;
  expiry_date: string | null;
  quantity_received: number;
  status: string;
  component_id: number;
};

export type ComponentBatchInput = {
  batch_number: string;
  manufacture_date?: string | null;
  expiry_date?: string | null;
  quantity_received: number;
  status?: string | null;
  component_id: number;
};

export type ProductRecord = {
  product_id: number;
  name: string;
  category: string | null;
  sku: string;
};

export type ProductInput = {
  name: string;
  category?: string | null;
  sku: string;
};

export type ProductComponentRecord = {
  product_id: number;
  component_id: number;
  quantity_required: string;
};

export type ProductComponentInput = {
  product_id: number;
  component_id: number;
  quantity_required: number | string;
};

export type ProductBatchRecord = {
  product_batch_id: number;
  batch_number: string;
  production_date: string | null;
  quantity_produced: number;
  status: string;
  product_id: number;
};

export type ProductBatchInput = {
  batch_number: string;
  production_date?: string | null;
  quantity_produced: number;
  status?: string | null;
  product_id: number;
};

export type ProductBatchComponentRecord = {
  product_batch_id: number;
  component_batch_id: number;
  quantity_used: string;
};

export type ProductBatchComponentInput = {
  product_batch_id: number;
  component_batch_id: number;
  quantity_used: number | string;
};
