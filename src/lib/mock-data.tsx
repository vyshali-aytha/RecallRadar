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

type SupplierInput = Omit<Supplier, "supplier_id">;
type ProductInput = Omit<Product, "product_id">;
type ComponentInput = Omit<ComponentRecord, "component_id">;

type MockDataContextValue = {
  suppliers: Supplier[];
  products: Product[];
  components: ComponentRecord[];
  bomEntries: BomEntry[];
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

function nextId<T>(records: T[], getId: (record: T) => number) {
  return records.reduce((highest, record) => Math.max(highest, getId(record)), 0) + 1;
}

const MockDataContext = createContext<MockDataContextValue | null>(null);

export function MockDataProvider({ children }: { children: ReactNode }) {
  const [suppliers, setSuppliers] = useState(initialSuppliers);
  const [products, setProducts] = useState(initialProducts);
  const [components, setComponents] = useState(initialComponents);
  const [bomEntries, setBomEntries] = useState(initialBomEntries);

  const value: MockDataContextValue = {
    suppliers,
    products,
    components,
    bomEntries,
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
