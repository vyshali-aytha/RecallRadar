"use client";

import { useEffect, useMemo, useState } from "react";
import { DataTable } from "@/components/crud/data-table";
import { Card, Select } from "@/components/ui/primitives";
import { getAllRecalls, type RecallRecord } from "@/lib/member-b-actions";
import { dateInputValue, safeActionError } from "@/lib/member-b-client";
import {
  fetchRecallImpactAnalysis,
  recordNumber,
  recordText,
  type RecallImpactAnalysis,
} from "@/lib/recall-impact-client";

type AffectedRow = {
  key: string;
  inventory_id: number | null;
  product_name: string;
  batch_number: string;
  location_name: string;
  quantity_on_hand: number;
  last_updated: string;
};

function displayDate(value: unknown): string {
  if (value instanceof Date) return value.toLocaleString();
  return typeof value === "string" ? value : "—";
}

export function AffectedInventorySection() {
  const [recalls, setRecalls] = useState<RecallRecord[]>([]);
  const [recallFilter, setRecallFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("all");
  const [analysis, setAnalysis] = useState<RecallImpactAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      void getAllRecalls()
        .then((records) => {
          if (!active) return;
          setRecalls(records);
          setRecallFilter((current) => current && records.some((item) => String(item.recall_id) === current)
            ? current
            : records[0] ? String(records[0].recall_id) : "");
        })
        .catch((reason: unknown) => { if (active) setError(safeActionError(reason, "Recall records could not be loaded.")); })
        .finally(() => { if (active) setLoading(false); });
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (!recallFilter) return;

    let active = true;
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError("");
      void fetchRecallImpactAnalysis(Number(recallFilter))
        .then((result) => { if (active) setAnalysis(result); })
        .catch((reason: unknown) => { if (active) { setAnalysis(null); setError(reason instanceof Error ? reason.message : "Affected inventory could not be loaded."); } })
        .finally(() => { if (active) setLoading(false); });
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [recallFilter]);

  const locations = useMemo(() => analysis?.inventoryLocations ?? [], [analysis]);
  const rows = useMemo(() => {
    if (!analysis) return [];
    return analysis.inventory.flatMap((inventory, index) => {
      const batchId = recordNumber(inventory, "product_batch_id");
      const batch = analysis.affectedProductBatches.find((item) => recordNumber(item, "mysqlId") === batchId);
      if (!batch) return [];
      const locationId = recordNumber(inventory, "location_id");
      const location = locations.find((item) => recordNumber(item, "mysqlId") === locationId);
      if (locationFilter !== "all" && String(locationId) !== locationFilter) return [];
      const product = analysis.affectedProducts.find((item) => recordNumber(item, "mysqlId") === recordNumber(batch, "productId"));
      return [{
        key: String(recordNumber(inventory, "inventory_id") ?? `${batchId}-${index}`),
        inventory_id: recordNumber(inventory, "inventory_id"),
        product_name: recordText(product ?? {}, "name") || "Product unavailable in graph result",
        batch_number: recordText(batch, "batchNumber") || `Batch #${batchId ?? "unknown"}`,
        location_name: recordText(location ?? {}, "name") || "Location unavailable in graph result",
        quantity_on_hand: recordNumber(inventory, "quantity_on_hand") ?? 0,
        last_updated: displayDate(inventory.last_updated),
      }];
    });
  }, [analysis, locationFilter, locations]);

  const columns = [
    { key: "inventory", label: "Inventory ID", render: (row: AffectedRow) => <span className="font-mono text-xs">#{row.inventory_id ?? "—"}</span> },
    { key: "product", label: "Product", render: (row: AffectedRow) => row.product_name },
    { key: "batch", label: "Product batch", render: (row: AffectedRow) => <span className="font-mono text-xs">{row.batch_number}</span> },
    { key: "location", label: "Inventory location", render: (row: AffectedRow) => row.location_name },
    { key: "quantity", label: "Quantity on hand", className: "text-right", render: (row: AffectedRow) => <span className="font-mono text-xs">{row.quantity_on_hand.toLocaleString()}</span> },
    { key: "updated", label: "Last updated", render: (row: AffectedRow) => <span className="text-xs text-muted">{row.last_updated}</span> },
  ];

  return <section className="space-y-5">
    <div><p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted">Current stock exposure</p><h2 className="mt-1 text-lg font-semibold text-ink">Affected inventory</h2><p className="mt-1 text-xs text-muted">Inventory rows are returned for product batches connected to the selected recall by the analysis service.</p></div>
    <Card className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <label className="w-full sm:max-w-[260px]">
        <span className="mb-1.5 block text-xs font-medium text-muted">Filter by recall</span>
        <Select disabled={recalls.length === 0} onChange={(event) => { setAnalysis(null); setRecallFilter(event.target.value); setLocationFilter("all"); }} value={recallFilter}>
          <option value="">Choose recall</option>
          {recalls.map((recall) => <option key={recall.recall_id} value={recall.recall_id}>Recall #{recall.recall_id} · {dateInputValue(recall.recall_date)}</option>)}
        </Select>
      </label>
      <label className="w-full sm:max-w-[260px]">
        <span className="mb-1.5 block text-xs font-medium text-muted">Filter by graph-returned location</span>
        <Select disabled={!analysis} onChange={(event) => setLocationFilter(event.target.value)} value={locationFilter}>
          <option value="all">All locations</option>
          {locations.map((location, index) => <option key={recordNumber(location, "mysqlId") ?? index} value={recordNumber(location, "mysqlId") ?? ""}>{recordText(location, "name") || "Unnamed location"}</option>)}
        </Select>
      </label>
      <span className="px-1 text-xs text-muted sm:ml-auto sm:self-end sm:pb-3">{rows.length} affected inventory rows</span>
    </Card>
    {loading && <p className="text-xs text-muted" role="status">Loading recall-linked inventory…</p>}
    {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800" role="alert">{error}</p>}
    {!loading && !error && !recallFilter && <Card className="py-10 text-center text-xs text-muted">Select a recall to inspect affected inventory.</Card>}
    <DataTable columns={columns} emptyDescription={loading ? "Analysis is loading." : "No inventory rows were returned for graph-connected product batches."} emptyTitle={loading ? "Loading affected inventory" : rows.length ? "No inventory matches this location" : "No affected inventory returned"} rowKey={(row) => row.key} rows={rows} />
  </section>;
}
