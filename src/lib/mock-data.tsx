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

export type InventoryLocation = {
  location_id: number;
  name: string;
  type: string | null;
  address: string | null;
};

export type InventoryRecord = {
  inventory_id: number;
  quantity_on_hand: number;
  last_updated: string;
  product_batch_id: number;
  location_id: number;
};

export type Distributor = {
  distributor_id: number;
  name: string;
  region: string | null;
  contact_email: string | null;
};

export type Shipment = {
  shipment_id: number;
  shipment_date: string | null;
  quantity_shipped: number;
  status: string;
  distributor_id: number;
  product_batch_id: number;
};

type SupplierInput = Omit<Supplier, "supplier_id">;
type ProductInput = Omit<Product, "product_id">;
type ComponentInput = Omit<ComponentRecord, "component_id">;
type ComponentBatchInput = Omit<ComponentBatch, "component_batch_id">;
type ProductBatchInput = Omit<ProductBatch, "product_batch_id">;
type InventoryLocationInput = Omit<InventoryLocation, "location_id">;
type InventoryInput = Omit<InventoryRecord, "inventory_id" | "last_updated">;
type DistributorInput = Omit<Distributor, "distributor_id">;
type ShipmentInput = Omit<Shipment, "shipment_id">;

type MockDataContextValue = {
  suppliers: Supplier[];
  products: Product[];
  components: ComponentRecord[];
  bomEntries: BomEntry[];
  componentBatches: ComponentBatch[];
  productBatches: ProductBatch[];
  batchCompositions: BatchComposition[];
  inventoryLocations: InventoryLocation[];
  inventoryRecords: InventoryRecord[];
  distributors: Distributor[];
  shipments: Shipment[];
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
  addInventoryLocation: (record: InventoryLocationInput) => InventoryLocation;
  updateInventoryLocation: (id: number, record: InventoryLocationInput) => void;
  deleteInventoryLocation: (id: number) => void;
  addInventoryRecord: (record: InventoryInput) => boolean;
  updateInventoryRecord: (id: number, record: InventoryInput) => boolean;
  deleteInventoryRecord: (id: number) => void;
  addDistributor: (record: DistributorInput) => Distributor;
  updateDistributor: (id: number, record: DistributorInput) => void;
  deleteDistributor: (id: number) => void;
  addShipment: (record: ShipmentInput) => Shipment;
  updateShipment: (id: number, record: ShipmentInput) => void;
  deleteShipment: (id: number) => void;
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

const initialInventoryLocations: InventoryLocation[] = [
  {
    location_id: 1,
    name: "FrostGuard Finished Goods Warehouse",
    type: "warehouse",
    address: "500 Industrial Way, San Jose, CA",
  },
  {
    location_id: 2,
    name: "West Coast Cold Storage",
    type: "cold_storage",
    address: "2400 Harbor Road, Oakland, CA",
  },
  {
    location_id: 3,
    name: "Returns Inspection Bay",
    type: "inspection",
    address: "16 Meridian Loop, San Jose, CA",
  },
];

const initialInventoryRecords: InventoryRecord[] = [
  { inventory_id: 1, quantity_on_hand: 80, last_updated: "2026-11-08 16:20:00", product_batch_id: 1, location_id: 1 },
  { inventory_id: 2, quantity_on_hand: 42, last_updated: "2026-11-08 14:05:00", product_batch_id: 2, location_id: 2 },
  { inventory_id: 3, quantity_on_hand: 28, last_updated: "2026-11-08 12:40:00", product_batch_id: 3, location_id: 1 },
];

const initialDistributors: Distributor[] = [
  { distributor_id: 1, name: "ArcticLink Medical Distribution", region: "Western US", contact_email: "receiving@arcticlink.example" },
  { distributor_id: 2, name: "Northstar Health Logistics", region: "Northwest", contact_email: "dispatch@northstarhealth.example" },
  { distributor_id: 3, name: "Summit Clinical Freight", region: "Western US", contact_email: "care@summitfreight.example" },
];

const initialShipments: Shipment[] = [
  { shipment_id: 1, shipment_date: "2026-10-20", quantity_shipped: 40, status: "delivered", distributor_id: 1, product_batch_id: 1 },
  { shipment_id: 2, shipment_date: "2026-10-24", quantity_shipped: 18, status: "in_transit", distributor_id: 2, product_batch_id: 2 },
  { shipment_id: 3, shipment_date: "2026-10-28", quantity_shipped: 12, status: "pending", distributor_id: 1, product_batch_id: 3 },
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
  const [inventoryLocations, setInventoryLocations] = useState(initialInventoryLocations);
  const [inventoryRecords, setInventoryRecords] = useState(initialInventoryRecords);
  const [distributors, setDistributors] = useState(initialDistributors);
  const [shipments, setShipments] = useState(initialShipments);

  const value: MockDataContextValue = {
    suppliers,
    products,
    components,
    bomEntries,
    componentBatches,
    productBatches,
    batchCompositions,
    inventoryLocations,
    inventoryRecords,
    distributors,
    shipments,
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
    addInventoryLocation: (record) => {
      const created = { ...record, location_id: nextId(inventoryLocations, (item) => item.location_id) };
      setInventoryLocations((current) => [...current, created]);
      return created;
    },
    updateInventoryLocation: (id, record) => {
      setInventoryLocations((current) => current.map((item) => item.location_id === id ? { ...record, location_id: id } : item));
    },
    deleteInventoryLocation: (id) => setInventoryLocations((current) => current.filter((item) => item.location_id !== id)),
    addInventoryRecord: (record) => {
      const exists = inventoryRecords.some((item) =>
        item.product_batch_id === record.product_batch_id && item.location_id === record.location_id,
      );
      if (exists) return false;
      const created: InventoryRecord = {
        ...record,
        inventory_id: nextId(inventoryRecords, (item) => item.inventory_id),
        last_updated: formatMockTimestamp(new Date()),
      };
      setInventoryRecords((current) => [...current, created]);
      return true;
    },
    updateInventoryRecord: (id, record) => {
      const duplicate = inventoryRecords.some((item) =>
        item.inventory_id !== id &&
        item.product_batch_id === record.product_batch_id &&
        item.location_id === record.location_id,
      );
      if (duplicate) return false;
      setInventoryRecords((current) => current.map((item) =>
        item.inventory_id === id ? { ...record, inventory_id: id, last_updated: item.last_updated } : item,
      ));
      return true;
    },
    deleteInventoryRecord: (id) => setInventoryRecords((current) => current.filter((item) => item.inventory_id !== id)),
    addDistributor: (record) => {
      const created = { ...record, distributor_id: nextId(distributors, (item) => item.distributor_id) };
      setDistributors((current) => [...current, created]);
      return created;
    },
    updateDistributor: (id, record) => {
      setDistributors((current) => current.map((item) => item.distributor_id === id ? { ...record, distributor_id: id } : item));
    },
    deleteDistributor: (id) => setDistributors((current) => current.filter((item) => item.distributor_id !== id)),
    addShipment: (record) => {
      const created = { ...record, shipment_id: nextId(shipments, (item) => item.shipment_id) };
      setShipments((current) => [...current, created]);
      return created;
    },
    updateShipment: (id, record) => {
      setShipments((current) => current.map((item) => item.shipment_id === id ? { ...record, shipment_id: id } : item));
    },
    deleteShipment: (id) => setShipments((current) => current.filter((item) => item.shipment_id !== id)),
  };

  return <MockDataContext.Provider value={value}>{children}</MockDataContext.Provider>;
}

function formatMockTimestamp(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function useMockData() {
  const value = useContext(MockDataContext);
  if (!value) {
    throw new Error("useMockData must be used inside MockDataProvider");
  }
  return value;
}
