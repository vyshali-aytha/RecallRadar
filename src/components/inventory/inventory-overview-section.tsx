"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/icon";
import { getAllInventory, getAllInventoryLocations } from "@/lib/member-b-actions";
import type { InventoryLocationRecord, InventoryRecord } from "@/lib/member-b-actions";
import { getAllProductBatches, getAllProducts } from "@/lib/member-a-actions";
import type { ProductBatchRecord, ProductRecord } from "@/lib/member-a-types";
import { safeActionError } from "@/lib/member-b-client";

export function InventoryOverviewSection() {
  const [inventoryRecords, setInventoryRecords] = useState<InventoryRecord[]>([]);
  const [inventoryLocations, setInventoryLocations] = useState<InventoryLocationRecord[]>([]);
  const [productBatches, setProductBatches] = useState<ProductBatchRecord[]>([]);
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [records, locations, batchResult, productResult] = await Promise.all([
        getAllInventory(),
        getAllInventoryLocations(),
        getAllProductBatches(),
        getAllProducts(),
      ]);
      if (!batchResult.success) throw new Error(batchResult.error);
      if (!productResult.success) throw new Error(productResult.error);
      setInventoryRecords(records);
      setInventoryLocations(locations);
      setProductBatches(batchResult.data);
      setProducts(productResult.data);
    } catch (reason) {
      setError(safeActionError(reason, "Inventory totals could not be loaded."));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => { void refresh(); }, 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);
  const totalUnits = inventoryRecords.reduce((sum, row) => sum + row.quantity_on_hand, 0);
  const unitsByLocation = inventoryLocations.map((location) => ({
    id: location.location_id,
    label: location.name,
    quantity: inventoryRecords
      .filter((record) => record.location_id === location.location_id)
      .reduce((sum, record) => sum + record.quantity_on_hand, 0),
  }));
  const unitsByBatch = Array.from(
    inventoryRecords.reduce((totals, record) => {
      totals.set(
        record.product_batch_id,
        (totals.get(record.product_batch_id) ?? 0) + record.quantity_on_hand,
      );
      return totals;
    }, new Map<number, number>()),
    ([productBatchId, quantity]) => {
      const batch = productBatches.find((item) => item.product_batch_id === productBatchId);
      const product = products.find((item) => item.product_id === batch?.product_id);
      return {
        id: productBatchId,
        label: batch
          ? `${product?.name ?? "Unavailable product"} · ${batch.batch_number}`
          : `Unavailable batch #${productBatchId}`,
        quantity,
      };
    },
  );
  const metrics = [
    { label: "Inventory records", value: inventoryRecords.length, icon: "database" as const, detail: "Distinct batch and location pairs" },
    { label: "Locations", value: inventoryLocations.length, icon: "warehouse" as const, detail: "Configured storage points" },
    { label: "Units on hand", value: totalUnits.toLocaleString(), icon: "package" as const, detail: "Sum of current MySQL quantities" },
  ];
  return <section className="space-y-5"><div><p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted">At a glance</p><h2 className="mt-1 text-lg font-semibold text-ink">Inventory overview</h2><p className="mt-1 text-xs text-muted">Totals are calculated from the current MySQL inventory and location records.</p></div>
    {loading && <p className="text-xs text-muted" role="status">Loading inventory totals…</p>}
    {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800" role="alert">{error}</p>}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{metrics.map((metric) => <Card className="flex items-start justify-between gap-4" key={metric.label}><div><p className="text-xs font-medium text-muted">{metric.label}</p><p className="mt-2 text-3xl font-semibold tracking-tight text-ink">{loading ? "—" : error ? "Unavailable" : metric.value}</p><p className="mt-2 text-xs text-muted">{metric.detail}</p></div><span className="flex size-11 items-center justify-center rounded-2xl bg-sage/60 text-forest"><Icon name={metric.icon} size={20} /></span></Card>)}</div>
    {!loading && !error && <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <h3 className="text-sm font-semibold text-ink">Units by location</h3>
        {unitsByLocation.length ? <ul className="mt-3 divide-y divide-line">{unitsByLocation.map((location) => <li className="flex items-center justify-between gap-3 py-2.5 text-xs" key={location.id}><span className="truncate text-muted">{location.label}</span><span className="font-mono font-semibold text-ink">{location.quantity.toLocaleString()} units</span></li>)}</ul> : <p className="mt-3 text-xs text-muted">No inventory locations are available.</p>}
      </Card>
      <Card>
        <h3 className="text-sm font-semibold text-ink">Units by product batch</h3>
        {unitsByBatch.length ? <ul className="mt-3 divide-y divide-line">{unitsByBatch.map((batch) => <li className="flex items-center justify-between gap-3 py-2.5 text-xs" key={batch.id}><span className="truncate text-muted">{batch.label}</span><span className="font-mono font-semibold text-ink">{batch.quantity.toLocaleString()} units</span></li>)}</ul> : <p className="mt-3 text-xs text-muted">No inventory records are available.</p>}
      </Card>
    </div>}
  </section>;
}
