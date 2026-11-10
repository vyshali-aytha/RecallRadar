"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ConfirmDialog } from "@/components/crud/confirm-dialog";
import { DataTable } from "@/components/crud/data-table";
import { DetailField } from "@/components/crud/detail-field";
import { FormField } from "@/components/crud/form-field";
import { Modal } from "@/components/crud/modal";
import { RowActions } from "@/components/crud/row-actions";
import { Button, Input, Select } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/icon";
import {
  createRecallImpact,
  deleteRecallImpact,
  getAllRecallImpacts,
  getAllRecalls,
  updateRecallImpact,
  type RecallImpactRecord,
  type RecallRecord,
} from "@/lib/member-b-actions";
import { getAllProductBatches, getAllProducts } from "@/lib/member-a-actions";
import type { ProductBatchRecord, ProductRecord } from "@/lib/member-a-types";
import { dateInputValue, notifyMemberBDataChanged, safeActionError } from "@/lib/member-b-client";

type Draft = { identified_date: string; impact_type: string; recall_id: string; product_batch_id: string };
type Dialog = { kind: "form"; id: number | null } | { kind: "view" | "delete"; id: number } | null;
const today = () => new Date().toISOString().slice(0, 10);
const blank = (): Draft => ({ identified_date: today(), impact_type: "", recall_id: "", product_batch_id: "" });

export function ImpactRecordsSection() {
  const [recallImpacts, setRecallImpacts] = useState<RecallImpactRecord[]>([]);
  const [recalls, setRecalls] = useState<RecallRecord[]>([]);
  const [productBatches, setProductBatches] = useState<ProductBatchRecord[]>([]);
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [recallFilter, setRecallFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dialog, setDialog] = useState<Dialog>(null);
  const [draft, setDraft] = useState<Draft>(blank());
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const [impacts, nextRecalls, nextBatches, nextProducts] = await Promise.all([
        getAllRecallImpacts(),
        getAllRecalls(),
        getAllProductBatches(),
        getAllProducts(),
      ]);
      if (!nextBatches.success) throw new Error(nextBatches.error);
      if (!nextProducts.success) throw new Error(nextProducts.error);
      setRecallImpacts(impacts);
      setRecalls(nextRecalls);
      setProductBatches(nextBatches.data);
      setProducts(nextProducts.data);
    } catch (reason) {
      setLoadError(safeActionError(reason, "Recall impact records could not be loaded."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void refresh(); }, 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  const impactTypes = useMemo(() => [...new Set(recallImpacts.map((item) => item.impact_type))].sort((a, b) => a.localeCompare(b)), [recallImpacts]);
  const rows = useMemo(() => {
    const term = query.trim().toLowerCase();
    return recallImpacts.filter((impact) => {
      const batch = productBatches.find((item) => item.product_batch_id === impact.product_batch_id);
      const product = products.find((item) => item.product_id === batch?.product_id);
      return (!term || [String(impact.recall_id), product?.name, batch?.batch_number, impact.impact_type].some((value) => value?.toLowerCase().includes(term))) &&
        (recallFilter === "all" || String(impact.recall_id) === recallFilter) &&
        (typeFilter === "all" || impact.impact_type === typeFilter);
    });
  }, [productBatches, products, query, recallFilter, recallImpacts, typeFilter]);
  const selected = dialog ? recallImpacts.find((item) => item.recall_impact_id === dialog.id) : undefined;
  const related = (impact: RecallImpactRecord) => {
    const recall = recalls.find((item) => item.recall_id === impact.recall_id);
    const batch = productBatches.find((item) => item.product_batch_id === impact.product_batch_id);
    return { recall, batch, product: products.find((item) => item.product_id === batch?.product_id) };
  };

  function openEdit(impact: RecallImpactRecord) {
    setDraft({
      identified_date: dateInputValue(impact.identified_date),
      impact_type: impact.impact_type,
      recall_id: String(impact.recall_id),
      product_batch_id: String(impact.product_batch_id),
    });
    setError("");
    setDialog({ kind: "form", id: impact.recall_impact_id });
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const recallId = Number(draft.recall_id);
    const batchId = Number(draft.product_batch_id);
    const impactType = draft.impact_type.trim();
    if (!draft.identified_date) { setError("Identified date is required."); return; }
    if (!impactType || impactType.length > 100) { setError("Impact type is required and must be 100 characters or fewer."); return; }
    if (!recalls.some((item) => item.recall_id === recallId) || !productBatches.some((item) => item.product_batch_id === batchId)) {
      setError("Choose an existing recall and product batch.");
      return;
    }
    const record = { identified_date: draft.identified_date, impact_type: impactType, recall_id: recallId, product_batch_id: batchId };
    try {
      if (dialog?.kind === "form" && dialog.id !== null) {
        await updateRecallImpact(dialog.id, record);
        setNotice(`Impact record #${dialog.id} updated.`);
      } else {
        await createRecallImpact(record);
        setNotice("Impact record created.");
      }
      setDialog(null);
      notifyMemberBDataChanged();
      await refresh();
    } catch (reason) {
      setError(safeActionError(reason, "The impact record could not be saved. Check the selected recall and product batch."));
    }
  }

  async function remove() {
    if (dialog?.kind !== "delete" || !selected) return;
    try {
      await deleteRecallImpact(selected.recall_impact_id);
      setNotice(`Impact record #${selected.recall_impact_id} removed.`);
      setDialog(null);
      notifyMemberBDataChanged();
      await refresh();
    } catch (reason) {
      setLoadError(safeActionError(reason, "The impact record could not be deleted."));
    }
  }

  const columns = [
    { key: "id", label: "Impact ID", className: "w-24", render: (row: RecallImpactRecord) => <span className="font-mono text-xs text-muted">{row.recall_impact_id}</span> },
    { key: "recall", label: "Recall ID", render: (row: RecallImpactRecord) => <span className="font-mono text-xs">{row.recall_id}</span> },
    { key: "recall_date", label: "Recall date", render: (row: RecallImpactRecord) => dateInputValue(related(row).recall?.recall_date) || "—" },
    { key: "identified", label: "Identified date", render: (row: RecallImpactRecord) => dateInputValue(row.identified_date) },
    { key: "product", label: "Product", render: (row: RecallImpactRecord) => related(row).product?.name ?? "Unavailable product" },
    { key: "batch", label: "Product batch", render: (row: RecallImpactRecord) => <span className="font-mono text-xs">{related(row).batch?.batch_number ?? "Unavailable batch"}</span> },
    { key: "type", label: "Impact type", render: (row: RecallImpactRecord) => row.impact_type },
    { key: "actions", label: "Actions", className: "w-32 text-right", render: (row: RecallImpactRecord) => <RowActions label="impact record" onDelete={() => setDialog({ kind: "delete", id: row.recall_impact_id })} onEdit={() => openEdit(row)} onView={() => setDialog({ kind: "view", id: row.recall_impact_id })} /> },
  ];

  return <section className="space-y-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted">Affected production</p><h2 className="mt-1 text-lg font-semibold text-ink">Recall impact records</h2><p className="mt-1 text-xs text-muted">Link a recall to each product batch identified as affected.</p></div>
      <Button disabled={!recalls.length || !productBatches.length} onClick={() => {
        const initial = blank();
        initial.recall_id = recalls[0] ? String(recalls[0].recall_id) : "";
        initial.product_batch_id = productBatches[0] ? String(productBatches[0].product_batch_id) : "";
        setDraft(initial);
        setError("");
        setDialog({ kind: "form", id: null });
      }}><span className="text-lg leading-none">+</span>Add impact record</Button>
    </div>
    {notice && <div className="rounded-xl border border-sage bg-sage/45 px-4 py-3 text-xs font-medium text-forest" role="status">{notice}</div>}
    {loadError && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800" role="alert">{loadError}</p>}
    {loading && <p className="text-xs text-muted" role="status">Loading recall impact records…</p>}
    <div className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-3 shadow-card sm:flex-row sm:flex-wrap sm:p-4">
      <label className="relative block w-full sm:max-w-sm"><span className="sr-only">Search impact records</span><Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" name="search" size={16} /><Input className="pl-10" onChange={(event) => setQuery(event.target.value)} placeholder="Search recall, product, batch or type" value={query} /></label>
      <label className="w-full sm:max-w-[220px]"><span className="sr-only">Filter by recall</span><Select onChange={(event) => setRecallFilter(event.target.value)} value={recallFilter}><option value="all">All recalls</option>{recalls.map((recall) => <option key={recall.recall_id} value={recall.recall_id}>Recall #{recall.recall_id} · {dateInputValue(recall.recall_date)}</option>)}</Select></label>
      <label className="w-full sm:max-w-[220px]"><span className="sr-only">Filter by impact type</span><Select onChange={(event) => setTypeFilter(event.target.value)} value={typeFilter}><option value="all">All impact types</option>{impactTypes.map((type) => <option key={type} value={type}>{type}</option>)}</Select></label>
      <span className="px-1 text-xs text-muted sm:ml-auto sm:self-center">{rows.length} records</span>
    </div>
    <DataTable columns={columns} emptyDescription={loading ? "Impact records are loading." : query || recallFilter !== "all" || typeFilter !== "all" ? "Try another search or filter." : "Create an impact record to link a recall to an affected product batch."} emptyTitle={loading ? "Loading impact records" : rows.length ? "No matching records" : "No impact records yet"} rowKey={(row) => row.recall_impact_id} rows={rows} />
    {dialog?.kind === "form" && <Modal description="Select a recall and an affected product batch." onClose={() => setDialog(null)} title={dialog.id === null ? "Add impact record" : "Edit impact record"}>
      <form className="space-y-4" onSubmit={save}>
        <FormField htmlFor="impact-recall" label="Recall" required><Select id="impact-recall" onChange={(event) => setDraft({ ...draft, recall_id: event.target.value })} required value={draft.recall_id}><option value="">Choose recall</option>{recalls.map((item) => <option key={item.recall_id} value={item.recall_id}>Recall #{item.recall_id} · {dateInputValue(item.recall_date)}</option>)}</Select></FormField>
        <FormField htmlFor="impact-batch" label="Product batch" required><Select id="impact-batch" onChange={(event) => setDraft({ ...draft, product_batch_id: event.target.value })} required value={draft.product_batch_id}><option value="">Choose product batch</option>{productBatches.map((batch) => <option key={batch.product_batch_id} value={batch.product_batch_id}>{products.find((item) => item.product_id === batch.product_id)?.name ?? "Product"} · {batch.batch_number}</option>)}</Select></FormField>
        <FormField htmlFor="impact-date" label="Identified date" required><Input id="impact-date" onChange={(event) => setDraft({ ...draft, identified_date: event.target.value })} required type="date" value={draft.identified_date} /></FormField>
        <FormField htmlFor="impact-type" label="Impact type" required><Input id="impact-type" maxLength={100} onChange={(event) => setDraft({ ...draft, impact_type: event.target.value })} required value={draft.impact_type} /></FormField>
        {error && <p className="text-xs font-medium text-red-700" role="alert">{error}</p>}
        <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end"><Button onClick={() => setDialog(null)} variant="outline">Cancel</Button><Button type="submit">{dialog.id === null ? "Add record" : "Save changes"}</Button></div>
      </form>
    </Modal>}
    {dialog?.kind === "view" && selected && <Modal description="Stored recall impact record" onClose={() => setDialog(null)} title={`Impact #${selected.recall_impact_id}`}><div className="grid gap-3 sm:grid-cols-2"><DetailField label="Recall ID" value={selected.recall_id} /><DetailField label="Recall date" value={dateInputValue(related(selected).recall?.recall_date)} /><DetailField label="Identified date" value={dateInputValue(selected.identified_date)} /><DetailField label="Product" value={related(selected).product?.name} /><DetailField label="Product batch" value={related(selected).batch?.batch_number} /><DetailField label="Impact type" value={selected.impact_type} /></div></Modal>}
    {dialog?.kind === "delete" && selected && <ConfirmDialog description={`Delete impact record #${selected.recall_impact_id}?`} onClose={() => setDialog(null)} onConfirm={remove} title="Delete impact record" />}
  </section>;
}
