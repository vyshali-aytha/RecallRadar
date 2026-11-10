"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, Select } from "@/components/ui/primitives";
import { getAllRecalls, type RecallRecord } from "@/lib/member-b-actions";
import { dateInputValue, safeActionError } from "@/lib/member-b-client";
import {
  fetchRecallImpactAnalysis,
  recordNumber,
  recordText,
  type RecallImpactAnalysis,
} from "@/lib/recall-impact-client";

export function TraceabilitySection() {
  const [recalls, setRecalls] = useState<RecallRecord[]>([]);
  const [recallId, setRecallId] = useState("");
  const [analysis, setAnalysis] = useState<RecallImpactAnalysis | null>(null);
  const [loadingRecalls, setLoadingRecalls] = useState(true);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [error, setError] = useState("");

  const loadRecalls = useCallback(async () => {
    try {
      const records = await getAllRecalls();
      setRecalls(records);
      setRecallId((current) => current && records.some((item) => String(item.recall_id) === current)
        ? current
        : records[0] ? String(records[0].recall_id) : "");
      setError("");
    } catch (reason) {
      setError(safeActionError(reason, "Recall records could not be loaded."));
    } finally {
      setLoadingRecalls(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadRecalls(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadRecalls]);

  useEffect(() => {
    if (!recallId) return;

    let active = true;
    const timer = window.setTimeout(() => {
      setLoadingAnalysis(true);
      setAnalysis(null);
      setError("");
      void fetchRecallImpactAnalysis(Number(recallId))
        .then((result) => { if (active) setAnalysis(result); })
        .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "Recall analysis could not be loaded."); })
        .finally(() => { if (active) setLoadingAnalysis(false); });
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [recallId]);

  const recall = recalls.find((item) => String(item.recall_id) === recallId);
  const graphBatches = analysis?.affectedProductBatches ?? [];

  return <section className="space-y-5">
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted">Neo4j-backed analysis</p>
      <h2 className="mt-1 text-lg font-semibold text-ink">Recall traceability</h2>
      <p className="mt-1 text-xs text-muted">Connected product batches and downstream links are shown only when returned by the recall analysis service.</p>
    </div>
    <Card className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <label className="w-full sm:max-w-md">
        <span className="mb-2 block text-sm font-medium text-ink">Selected recall</span>
        <Select disabled={loadingRecalls || recalls.length === 0} onChange={(event) => { setAnalysis(null); setRecallId(event.target.value); }} value={recallId}>
          <option value="">Choose recall</option>
          {recalls.map((item) => <option key={item.recall_id} value={item.recall_id}>Recall #{item.recall_id} · {dateInputValue(item.recall_date)} · {item.status}</option>)}
        </Select>
      </label>
      {recall && <p className="text-xs text-muted">{recall.reason ?? "No reason recorded"}</p>}
    </Card>
    {loadingRecalls && <p className="text-xs text-muted" role="status">Loading recalls…</p>}
    {loadingAnalysis && <p className="text-xs text-muted" role="status">Loading graph-backed recall analysis…</p>}
    {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800" role="alert">{error}</p>}
    {!loadingRecalls && !error && !recall && <Card className="py-12 text-center"><p className="text-sm font-semibold text-ink">No recalls are available</p><p className="mt-1 text-xs text-muted">Create a recall before requesting traceability analysis.</p></Card>}
    {!loadingAnalysis && !error && recall && analysis && graphBatches.length === 0 && <Card className="py-12 text-center"><p className="text-sm font-semibold text-ink">No graph relationships returned</p><p className="mt-1 text-xs text-muted">No affected product-batch paths were found for Recall #{recall.recall_id}. No relationships are inferred by the interface.</p></Card>}
    {!loadingAnalysis && analysis && graphBatches.length > 0 && <div className="space-y-4">
      {graphBatches.map((batch, index) => {
        const batchId = recordNumber(batch, "mysqlId");
        const product = analysis.affectedProducts.find((item) => recordNumber(item, "mysqlId") === recordNumber(batch, "productId"));
        const shipments = analysis.shipments.filter((item) => recordNumber(item, "product_batch_id") === batchId);
        const inventory = analysis.inventory.filter((item) => recordNumber(item, "product_batch_id") === batchId);
        return <Card className="space-y-4" key={batchId ?? `${analysis.recallId}-${index}`}>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">Graph-returned affected batch</p>
            <h3 className="mt-1 text-sm font-semibold text-ink">
              {recordText(batch, "batchNumber") || `Product batch #${batchId ?? "unknown"}`}
            </h3>
            <p className="mt-1 text-xs text-muted">{recordText(product ?? {}, "name") || "Product name unavailable in graph result"}</p>
          </div>
          <div className="grid gap-4 border-t border-line pt-4 sm:grid-cols-2">
            <div>
              <h4 className="text-xs font-semibold text-ink">Shipment records</h4>
              {shipments.length ? <ul className="mt-2 space-y-2">{shipments.map((shipment, itemIndex) => {
                const distributor = analysis.distributors.find((item) => recordNumber(item, "mysqlId") === recordNumber(shipment, "distributor_id"));
                return <li className="rounded-lg bg-[#FBFBF8] p-3 text-xs" key={recordNumber(shipment, "shipment_id") ?? itemIndex}>
                  <span className="font-medium">{recordText(distributor ?? {}, "name") || "Distributor unavailable"}</span>
                  <span className="ml-2 text-muted">Shipment #{recordNumber(shipment, "shipment_id") ?? "—"} · {recordText(shipment, "status")}</span>
                </li>;
              })}</ul> : <p className="mt-2 text-xs text-muted">No matching shipment records were returned.</p>}
            </div>
            <div>
              <h4 className="text-xs font-semibold text-ink">Inventory records</h4>
              {inventory.length ? <ul className="mt-2 space-y-2">{inventory.map((entry, itemIndex) => {
                const location = analysis.inventoryLocations.find((item) => recordNumber(item, "mysqlId") === recordNumber(entry, "location_id"));
                return <li className="rounded-lg bg-[#FBFBF8] p-3 text-xs" key={recordNumber(entry, "inventory_id") ?? itemIndex}>
                  <span className="font-medium">{recordText(location ?? {}, "name") || "Location unavailable"}</span>
                  <span className="ml-2 text-muted">{recordNumber(entry, "quantity_on_hand") ?? 0} units · Inventory #{recordNumber(entry, "inventory_id") ?? "—"}</span>
                </li>;
              })}</ul> : <p className="mt-2 text-xs text-muted">No matching inventory records were returned.</p>}
            </div>
          </div>
        </Card>;
      })}
    </div>}
  </section>;
}
