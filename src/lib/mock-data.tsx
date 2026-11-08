"use client";

import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

export type Supplier = {
  supplier_id: number;
  name: string;
  contact_email: string | null;
  phone: string | null;
  address: string | null;
};

export type Product = {
  product_id: number;
  name: string;
  category: string | null;
  sku: string;
};

export type ComponentRecord = {
  component_id: number;
  name: string;
  category: string | null;
  supplier_id: number;
};

export type BomEntry = {
  product_id: number;
  component_id: number;
  quantity_required: number;
};

export type ComponentBatch = {
  component_batch_id: number;
  batch_number: string;
  manufacture_date: string | null;
  expiry_date: string | null;
  quantity_received: number;
  status: string;
  component_id: number;
};

export type ProductBatch = {
  product_batch_id: number;
  batch_number: string;
  production_date: string | null;
  quantity_produced: number;
  status: string;
  product_id: number;
};

export type BatchComposition = {
  product_batch_id: number;
  component_batch_id: number;
  quantity_used: number;
};

type SupplierInput = Omit<Supplier, "supplier_id">;
type ProductInput = Omit<Product, "product_id">;
type ComponentInput = Omit<ComponentRecord, "component_id">;
type ComponentBatchInput = Omit<ComponentBatch, "component_batch_id">;
type ProductBatchInput = Omit<ProductBatch, "product_batch_id">;

type MockDataContextValue = {
  suppliers: Supplier[];
  products: Product[];
  components: ComponentRecord[];
  bomEntries: BomEntry[];
  componentBatches: ComponentBatch[];
  productBatches: ProductBatch[];
  batchCompositions: BatchComposition[];
  addSupplier: (record: SupplierInput) => Supplier;
  updateSupplier: (id: number, record: SupplierInput) => void;
  deleteSupplier: (id: number) => void;
  addProduct: (record: ProductInput) => Product;
  updateProduct: (id: number, record: ProductInput) => void;
  deleteProduct: (id: number) => void;
  addComponent: (record: ComponentInput) => ComponentRecord;
  updateComponent: (id: number, record: ComponentInput) => void;
  deleteComponent: (id: number) => void;
  addBomEntry: (record: BomEntry) => void;
  updateBomEntry: (productId: number, componentId: number, quantity: number) => void;
  deleteBomEntry: (productId: number, componentId: number) => void;
  addComponentBatch: (record: ComponentBatchInput) => ComponentBatch;
  updateComponentBatch: (id: number, record: ComponentBatchInput) => void;
  deleteComponentBatch: (id: number) => void;
  addProductBatch: (record: ProductBatchInput) => ProductBatch;
  updateProductBatch: (id: number, record: ProductBatchInput) => void;
  deleteProductBatch: (id: number) => void;
  addBatchComposition: (record: BatchComposition) => boolean;
  updateBatchComposition: (productBatchId: number, componentBatchId: number, quantity: number) => void;
  deleteBatchComposition: (productBatchId: number, componentBatchId: number) => void;
};

const initialSuppliers: Supplier[] = [
  {
    supplier_id: 1,
    name: "Northstar Precision Components",
    contact_email: "supply@northstar.example",
    phone: "+1-555-0142",
    address: "1200 Meridian Ave, San Jose, CA",
  },
  {
    supplier_id: 2,
    name: "Meridian Sensor Works",
    contact_email: "hello@meridiansensor.example",
    phone: "+1-555-0188",
    address: "88 Foundry Road, Oakland, CA",
  },
  {
    supplier_id: 3,
    name: "Evergreen Medical Supply",
    contact_email: "orders@evergreenmed.example",
    phone: null,
    address: "42 Harbor Parkway, Portland, OR",
  },
];

const initialProducts: Product[] = [
  {
    product_id: 1,
    name: "FrostGuard Vaccine Monitor",
    category: "Cold-Chain Monitoring",
    sku: "FGVM-TEMP-001",
  },
  {
    product_id: 2,
    name: "ChillTrack Mini Logger",
    category: "Cold-Chain Monitoring",
    sku: "CTML-200",
  },
  {
    product_id: 3,
    name: "RelayHub Gateway",
    category: "Connectivity",
    sku: "RHG-400",
  },
];

const initialComponents: ComponentRecord[] = [
  { component_id: 1, name: "Temperature Sensor", category: "Sensors", supplier_id: 1 },
  { component_id: 2, name: "Precision Probe", category: "Sensors", supplier_id: 2 },
  { component_id: 3, name: "Wireless Gateway Module", category: "Electronics", supplier_id: 3 },
  { component_id: 4, name: "Insulated Enclosure", category: "Housing", supplier_id: 2 },
];

const initialBomEntries: BomEntry[] = [
  { product_id: 1, component_id: 1, quantity_required: 1 },
  { product_id: 1, component_id: 4, quantity_required: 1 },
  { product_id: 2, component_id: 1, quantity_required: 1 },
  { product_id: 2, component_id: 3, quantity_required: 1 },
  { product_id: 3, component_id: 3, quantity_required: 1 },
];

const initialComponentBatches: ComponentBatch[] = [
  {
    component_batch_id: 1,
    batch_number: "NSPC-TS-2026-0812",
    manufacture_date: "2026-08-12",
    expiry_date: "2028-08-11",
    quantity_received: 300,
    status: "active",
    component_id: 1,
  },
  {
    component_batch_id: 2,
    batch_number: "MSW-PP-2026-0903",
    manufacture_date: "2026-09-03",
    expiry_date: "2027-09-02",
    quantity_received: 180,
    status: "active",
    component_id: 2,
  },
  {
    component_batch_id: 3,
    batch_number: "EVM-WGM-2026-0721",
    manufacture_date: "2026-07-21",
    expiry_date: null,
    quantity_received: 75,
    status: "quarantined",
    component_id: 3,
  },
  {
    component_batch_id: 4,
    batch_number: "MSW-IE-2026-0828",
    manufacture_date: "2026-08-28",
    expiry_date: null,
    quantity_received: 200,
    status: "active",
    component_id: 4,
  },
];

const initialProductBatches: ProductBatch[] = [
  {
    product_batch_id: 1,
    batch_number: "FGVM-2026-0915-A",
    production_date: "2026-09-15",
    quantity_produced: 120,
    status: "active",
    product_id: 1,
  },
  {
    product_batch_id: 2,
    batch_number: "CTML-2026-1012-B",
    production_date: "2026-10-12",
    quantity_produced: 60,
    status: "active",
    product_id: 2,
  },
  {
    product_batch_id: 3,
    batch_number: "RHG-2026-1020-A",
    production_date: "2026-10-20",
    quantity_produced: 40,
    status: "active",
    product_id: 3,
  },
];

const initialBatchCompositions: BatchComposition[] = [
  { product_batch_id: 1, component_batch_id: 1, quantity_used: 120 },
  { product_batch_id: 1, component_batch_id: 4, quantity_used: 120 },
  { product_batch_id: 2, component_batch_id: 1, quantity_used: 60 },
  { product_batch_id: 2, component_batch_id: 3, quantity_used: 60 },
  { product_batch_id: 3, component_batch_id: 3, quantity_used: 40 },
];

function nextId<T>(records: T[], getId: (record: T) => number) {
  return records.reduce((highest, record) => Math.max(highest, getId(record)), 0) + 1;
}

const MockDataContext = createContext<MockDataContextValue | null>(null);

export function MockDataProvider({ children }: { children: ReactNode }) {
  const [suppliers, setSuppliers] = useState(initialSuppliers);
  const [products, setProducts] = useState(initialProducts);
  const [components, setComponents] = useState(initialComponents);
  const [bomEntries, setBomEntries] = useState(initialBomEntries);
  const [componentBatches, setComponentBatches] = useState(initialComponentBatches);
  const [productBatches, setProductBatches] = useState(initialProductBatches);
  const [batchCompositions, setBatchCompositions] = useState(initialBatchCompositions);

  const value: MockDataContextValue = {
    suppliers,
    products,
    components,
    bomEntries,
    componentBatches,
    productBatches,
    batchCompositions,
    addSupplier: (record) => {
      const created = { ...record, supplier_id: nextId(suppliers, (item) => item.supplier_id) };
      setSuppliers((current) => [...current, created]);
      return created;
    },
    updateSupplier: (id, record) => {
      setSuppliers((current) => current.map((item) => item.supplier_id === id ? { ...record, supplier_id: id } : item));
    },
    deleteSupplier: (id) => setSuppliers((current) => current.filter((item) => item.supplier_id !== id)),
    addProduct: (record) => {
      const created = { ...record, product_id: nextId(products, (item) => item.product_id) };
      setProducts((current) => [...current, created]);
      return created;
    },
    updateProduct: (id, record) => {
      setProducts((current) => current.map((item) => item.product_id === id ? { ...record, product_id: id } : item));
    },
    deleteProduct: (id) => setProducts((current) => current.filter((item) => item.product_id !== id)),
    addComponent: (record) => {
      const created = { ...record, component_id: nextId(components, (item) => item.component_id) };
      setComponents((current) => [...current, created]);
      return created;
    },
    updateComponent: (id, record) => {
      setComponents((current) => current.map((item) => item.component_id === id ? { ...record, component_id: id } : item));
    },
    deleteComponent: (id) => setComponents((current) => current.filter((item) => item.component_id !== id)),
    addBomEntry: (record) => setBomEntries((current) => [...current, record]),
    updateBomEntry: (productId, componentId, quantity) => {
      setBomEntries((current) => current.map((item) =>
        item.product_id === productId && item.component_id === componentId
          ? { ...item, quantity_required: quantity }
          : item,
      ));
    },
    deleteBomEntry: (productId, componentId) => {
      setBomEntries((current) => current.filter((item) =>
        item.product_id !== productId || item.component_id !== componentId,
      ));
    },
    addComponentBatch: (record) => {
      const created = { ...record, component_batch_id: nextId(componentBatches, (item) => item.component_batch_id) };
      setComponentBatches((current) => [...current, created]);
      return created;
    },
    updateComponentBatch: (id, record) => {
      setComponentBatches((current) => current.map((item) => item.component_batch_id === id ? { ...record, component_batch_id: id } : item));
    },
    deleteComponentBatch: (id) => setComponentBatches((current) => current.filter((item) => item.component_batch_id !== id)),
    addProductBatch: (record) => {
      const created = { ...record, product_batch_id: nextId(productBatches, (item) => item.product_batch_id) };
      setProductBatches((current) => [...current, created]);
      return created;
    },
    updateProductBatch: (id, record) => {
      setProductBatches((current) => current.map((item) => item.product_batch_id === id ? { ...record, product_batch_id: id } : item));
    },
    deleteProductBatch: (id) => setProductBatches((current) => current.filter((item) => item.product_batch_id !== id)),
    addBatchComposition: (record) => {
      const exists = batchCompositions.some((item) =>
        item.product_batch_id === record.product_batch_id &&
        item.component_batch_id === record.component_batch_id,
      );
      if (exists) return false;
      setBatchCompositions((current) => [...current, record]);
      return true;
    },
    updateBatchComposition: (productBatchId, componentBatchId, quantity) => {
      setBatchCompositions((current) => current.map((item) =>
        item.product_batch_id === productBatchId && item.component_batch_id === componentBatchId
          ? { ...item, quantity_used: quantity }
          : item,
      ));
    },
    deleteBatchComposition: (productBatchId, componentBatchId) => {
      setBatchCompositions((current) => current.filter((item) =>
        item.product_batch_id !== productBatchId || item.component_batch_id !== componentBatchId,
      ));
    },
  };

  return <MockDataContext.Provider value={value}>{children}</MockDataContext.Provider>;
}

export function useMockData() {
  const value = useContext(MockDataContext);
  if (!value) {
    throw new Error("useMockData must be used inside MockDataProvider");
  }
  return value;
}
