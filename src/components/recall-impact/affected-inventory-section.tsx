"use client";

import { useMemo, useState } from "react";
import { DataTable } from "@/components/crud/data-table";
import { Select } from "@/components/ui/primitives";
import { useMockData } from "@/lib/mock-data";

type AffectedRow = { key: string; recall_id: number; product_name: string; batch_number: string; location_name: string; quantity_on_hand: number; last_updated: string };

export function AffectedInventorySection() {
  const { recallImpacts, recalls, productBatches, products, inventoryRecords, inventoryLocations } = useMockData();
  const [recallFilter, setRecallFilter] = useState("all"); const [locationFilter, setLocationFilter] = useState("all");
  const rows = useMemo(() => {
    const seen = new Set<string>();
    const affected: AffectedRow[] = [];
    for (const impact of recallImpacts) {
      const batch = productBatches.find((item) => item.product_batch_id === impact.product_batch_id);
      if (!batch) continue;
      for (const inventory of inventoryRecords.filter((item) => item.product_batch_id === impact.product_batch_id)) {
        const key = `${impact.recall_id}:${inventory.inventory_id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const product = products.find((item) => item.product_id === batch.product_id);
        const location = inventoryLocations.find((item) => item.location_id === inventory.location_id);
        affected.push({ key, recall_id: impact.recall_id, product_name: product?.name ?? "Unavailable product", batch_number: batch.batch_number, location_name: location?.name ?? "Unavailable location", quantity_on_hand: inventory.quantity_on_hand, last_updated: inventory.last_updated });
      }
    }
    return affected.filter((row) => (recallFilter === "all" || String(row.recall_id) === recallFilter) && (locationFilter === "all" || inventoryRecords.find((item) => `${row.recall_id}:${item.inventory_id}` === row.key)?.location_id === Number(locationFilter)));
  }, [inventoryLocations, inventoryRecords, locationFilter, productBatches, products, recallFilter, recallImpacts]);
  const columns = [
    { key: "recall", label: "Recall ID", render: (row: AffectedRow) => <span className="font-mono text-xs">#{row.recall_id}</span> },
    { key: "product", label: "Product", render: (row: AffectedRow) => row.product_name },
    { key: "batch", label: "Product batch", render: (row: AffectedRow) => <span className="font-mono text-xs">{row.batch_number}</span> },
    { key: "location", label: "Inventory location", render: (row: AffectedRow) => row.location_name },
    { key: "quantity", label: "Quantity on hand", className: "text-right", render: (row: AffectedRow) => <span className="font-mono text-xs">{row.quantity_on_hand.toLocaleString()}</span> },
    { key: "updated", label: "Last updated", render: (row: AffectedRow) => <span className="text-xs text-muted">{row.last_updated}</span> },
  ];
  return <section className="space-y-5"><div><p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted">Current stock exposure</p><h2 className="mt-1 text-lg font-semibold text-ink">Affected inventory</h2><p className="mt-1 text-xs text-muted">Inventory rows are matched through product batches listed in recall impact records; quantities are read-only.</p></div>
    <div className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-3 shadow-card sm:flex-row sm:flex-wrap sm:p-4"><label className="w-full sm:max-w-[260px]"><span className="mb-1.5 block text-xs font-medium text-muted">Filter by recall</span><Select onChange={(event) => setRecallFilter(event.target.value)} value={recallFilter}><option value="all">All recalls</option>{recalls.map((recall) => <option key={recall.recall_id} value={recall.recall_id}>Recall #{recall.recall_id} · {recall.recall_date}</option>)}</Select></label><label className="w-full sm:max-w-[260px]"><span className="mb-1.5 block text-xs font-medium text-muted">Filter by location</span><Select onChange={(event) => setLocationFilter(event.target.value)} value={locationFilter}><option value="all">All locations</option>{inventoryLocations.map((location) => <option key={location.location_id} value={location.location_id}>{location.name}</option>)}</Select></label><span className="px-1 text-xs text-muted sm:ml-auto sm:self-end sm:pb-3">{rows.length} affected inventory rows</span></div>
    <DataTable columns={columns} emptyDescription={recallFilter !== "all" || locationFilter !== "all" ? "Try another recall or location." : "No inventory records match the product batches in current recall impact data."} emptyTitle={rows.length ? "No affected inventory matches these filters" : "No affected inventory found"} rowKey={(row) => row.key} rows={rows} />
  </section>;
}
