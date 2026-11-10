"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ConfirmDialog } from "@/components/crud/confirm-dialog";
import { DataTable } from "@/components/crud/data-table";
import { DetailField } from "@/components/crud/detail-field";
import { FormField } from "@/components/crud/form-field";
import { Modal } from "@/components/crud/modal";
import { RowActions } from "@/components/crud/row-actions";
import { ShipmentStatusBadge } from "@/components/distributors/shipment-status-badge";
import { Button, Input, Select } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/icon";
import {
  createShipment,
  deleteShipment,
  getAllDistributors,
  getAllShipments,
  updateShipment,
  type DistributorRecord,
  type ShipmentRecord,
} from "@/lib/member-b-actions";
import { getAllProductBatches, getAllProducts } from "@/lib/member-a-actions";
import type { ProductBatchRecord, ProductRecord } from "@/lib/member-a-types";
import { dateInputValue, notifyMemberBDataChanged, safeActionError } from "@/lib/member-b-client";

const statuses = ["pending", "in_transit", "delivered", "delayed", "cancelled"];
type Draft = { shipment_date: string; quantity_shipped: string; status: string; distributor_id: string; product_batch_id: string };
type Dialog = { kind: "form"; id: number | null } | { kind: "view" | "delete"; id: number } | null;
const blank: Draft = { shipment_date: "", quantity_shipped: "0", status: "pending", distributor_id: "", product_batch_id: "" };

export function ShipmentsSection() {
  const [shipments, setShipments] = useState<ShipmentRecord[]>([]);
  const [distributors, setDistributors] = useState<DistributorRecord[]>([]);
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [productBatches, setProductBatches] = useState<ProductBatchRecord[]>([]);
  const [loading, setLoading] = useState(true); const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState(""); const [distributorFilter, setDistributorFilter] = useState("all"); const [statusFilter, setStatusFilter] = useState("all"); const [dialog, setDialog] = useState<Dialog>(null); const [draft, setDraft] = useState<Draft>(blank); const [error, setError] = useState(""); const [notice, setNotice] = useState("");
  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const [nextShipments, nextDistributors, nextProducts, nextBatches] = await Promise.all([
        getAllShipments(),
        getAllDistributors(),
        getAllProducts(),
        getAllProductBatches(),
      ]);
      if (!nextProducts.success) throw new Error(nextProducts.error);
      if (!nextBatches.success) throw new Error(nextBatches.error);
      setShipments(nextShipments);
      setDistributors(nextDistributors);
      setProducts(nextProducts.data);
      setProductBatches(nextBatches.data);
    } catch (reason) {
      setLoadError(safeActionError(reason, "Shipment data could not be loaded."));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => { void refresh(); }, 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);
  const rows = useMemo(() => { const term = query.trim().toLowerCase(); return shipments.filter((row) => { const distributor = distributors.find((item) => item.distributor_id === row.distributor_id); const batch = productBatches.find((item) => item.product_batch_id === row.product_batch_id); const product = products.find((item) => item.product_id === batch?.product_id); return (!term || [distributor?.name, batch?.batch_number, product?.name, row.status].some((value) => value?.toLowerCase().includes(term))) && (distributorFilter === "all" || String(row.distributor_id) === distributorFilter) && (statusFilter === "all" || row.status === statusFilter); }); }, [distributorFilter, distributors, productBatches, products, query, shipments, statusFilter]);
  const selected = dialog ? shipments.find((row) => row.shipment_id === dialog.id) : undefined;
  const related = (row: ShipmentRecord) => { const batch = productBatches.find((item) => item.product_batch_id === row.product_batch_id); return { distributor: distributors.find((item) => item.distributor_id === row.distributor_id), batch, product: products.find((item) => item.product_id === batch?.product_id) }; };
  function openEdit(row: ShipmentRecord) { setDraft({ shipment_date: dateInputValue(row.shipment_date), quantity_shipped: String(row.quantity_shipped), status: row.status, distributor_id: String(row.distributor_id), product_batch_id: String(row.product_batch_id) }); setError(""); setDialog({ kind: "form", id: row.shipment_id }); }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const quantity = Number(draft.quantity_shipped), distributorId = Number(draft.distributor_id), batchId = Number(draft.product_batch_id);
    if (!distributors.some((item) => item.distributor_id === distributorId) || !productBatches.some((item) => item.product_batch_id === batchId)) { setError("Choose an existing distributor and product batch."); return; }
    if (!Number.isInteger(quantity) || quantity < 0 || quantity > 2147483647) { setError("Quantity shipped must be a whole number greater than or equal to zero."); return; }
    const record = { shipment_date: draft.shipment_date || null, quantity_shipped: quantity, status: draft.status.trim() || "pending", distributor_id: distributorId, product_batch_id: batchId };
    try {
      if (dialog?.kind === "form" && dialog.id !== null) {
        await updateShipment(dialog.id, record);
        setNotice("Shipment updated.");
      } else {
        await createShipment(record);
        setNotice("Shipment added. Inventory quantities are unchanged by shipment creation.");
      }
      setDialog(null);
      notifyMemberBDataChanged();
      await refresh();
    } catch (reason) {
      setError(safeActionError(reason, "The shipment could not be saved."));
    }
  }
  async function remove() {
    if (dialog?.kind !== "delete" || !selected) return;
    try {
      await deleteShipment(selected.shipment_id);
      setNotice("Shipment removed.");
      setDialog(null);
      notifyMemberBDataChanged();
      await refresh();
    } catch (reason) {
      setLoadError(safeActionError(reason, "The shipment could not be deleted."));
    }
  }
  const columns = [
    { key: "id", label: "Shipment ID", className: "w-24", render: (row: ShipmentRecord) => <span className="font-mono text-xs text-muted">{row.shipment_id}</span> },
    { key: "date", label: "Shipment date", render: (row: ShipmentRecord) => dateInputValue(row.shipment_date) || <span className="text-muted">—</span> },
    { key: "distributor", label: "Distributor", render: (row: ShipmentRecord) => related(row).distributor?.name ?? "Unavailable distributor" },
    { key: "product", label: "Product", render: (row: ShipmentRecord) => related(row).product?.name ?? "Unavailable product" },
    { key: "batch", label: "Product batch", render: (row: ShipmentRecord) => <span className="font-mono text-xs">{related(row).batch?.batch_number ?? "Unavailable batch"}</span> },
    { key: "quantity", label: "Qty shipped", className: "text-right", render: (row: ShipmentRecord) => <span className="font-mono text-xs">{row.quantity_shipped.toLocaleString()}</span> },
    { key: "status", label: "Status", render: (row: ShipmentRecord) => <ShipmentStatusBadge status={row.status} /> },
    { key: "actions", label: "Actions", className: "w-32 text-right", render: (row: ShipmentRecord) => <RowActions label="shipment" onDelete={() => setDialog({ kind: "delete", id: row.shipment_id })} onEdit={() => openEdit(row)} onView={() => setDialog({ kind: "view", id: row.shipment_id })} /> },
  ];
  return <section className="space-y-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted">Outbound logistics</p><h2 className="mt-1 text-lg font-semibold text-ink">Shipments</h2><p className="mt-1 text-xs text-muted">Trace shipment status by distributor and finished product batch.</p></div><Button disabled={!distributors.length || !productBatches.length} onClick={() => { setDraft({ ...blank, distributor_id: distributors[0] ? String(distributors[0].distributor_id) : "", product_batch_id: productBatches[0] ? String(productBatches[0].product_batch_id) : "" }); setError(""); setDialog({ kind: "form", id: null }); }}><span className="text-lg leading-none">+</span>Add shipment</Button></div>
    {notice && <div className="rounded-xl border border-sage bg-sage/45 px-4 py-3 text-xs font-medium text-forest" role="status">{notice}</div>}
    {loadError && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800" role="alert">{loadError}</p>}
    {loading && <p className="text-xs text-muted" role="status">Loading shipment records…</p>}
    <div className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-3 shadow-card sm:flex-row sm:flex-wrap sm:p-4"><label className="relative block w-full sm:max-w-sm"><span className="sr-only">Search shipments</span><Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" name="search" size={16} /><Input className="pl-10" onChange={(e) => setQuery(e.target.value)} placeholder="Search distributor, product or batch" value={query} /></label><label className="w-full sm:max-w-[220px]"><span className="sr-only">Filter shipments by distributor</span><Select onChange={(e) => setDistributorFilter(e.target.value)} value={distributorFilter}><option value="all">All distributors</option>{distributors.map((item) => <option key={item.distributor_id} value={item.distributor_id}>{item.name}</option>)}</Select></label><label className="w-full sm:max-w-[170px]"><span className="sr-only">Filter shipments by status</span><Select onChange={(e) => setStatusFilter(e.target.value)} value={statusFilter}><option value="all">All statuses</option>{[...new Set([...statuses, ...shipments.map((row) => row.status)])].map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}</Select></label><span className="px-1 text-xs text-muted sm:ml-auto sm:self-center">{rows.length} shipments</span></div>
    <DataTable columns={columns} emptyDescription={loading ? "Shipment records are loading." : query || distributorFilter !== "all" || statusFilter !== "all" ? "Try another search or adjust the filters." : "Add a shipment to record product movement to a distributor."} emptyTitle={loading ? "Loading shipments" : rows.length ? "No matching shipments" : "No shipments yet"} footerLabel="Showing live MySQL records" rowKey={(row) => row.shipment_id} rows={rows} />
    {dialog?.kind === "form" && <Modal description="Shipment status defaults to pending. Shipment creation does not adjust inventory." onClose={() => setDialog(null)} title={dialog.id === null ? "Add shipment" : "Edit shipment"}><form className="space-y-4" onSubmit={save}><FormField error={error.includes("distributor") ? error : undefined} htmlFor="shipment-distributor" label="Distributor" required><Select id="shipment-distributor" onChange={(e) => setDraft({ ...draft, distributor_id: e.target.value })} required value={draft.distributor_id}><option value="">Choose distributor</option>{distributors.map((item) => <option key={item.distributor_id} value={item.distributor_id}>{item.name}</option>)}</Select></FormField><FormField error={error.includes("batch") ? error : undefined} htmlFor="shipment-batch" label="Product batch" required><Select id="shipment-batch" onChange={(e) => setDraft({ ...draft, product_batch_id: e.target.value })} required value={draft.product_batch_id}><option value="">Choose product batch</option>{productBatches.map((batch) => <option key={batch.product_batch_id} value={batch.product_batch_id}>{products.find((product) => product.product_id === batch.product_id)?.name ?? "Unknown product"} · {batch.batch_number}</option>)}</Select></FormField><div className="grid gap-4 sm:grid-cols-2"><FormField htmlFor="shipment-date" label="Shipment date" hint="Optional"><Input id="shipment-date" onChange={(e) => setDraft({ ...draft, shipment_date: e.target.value })} type="date" value={draft.shipment_date} /></FormField><FormField error={error.includes("Quantity") ? error : undefined} htmlFor="shipment-quantity" label="Quantity shipped" required><Input id="shipment-quantity" min="0" onChange={(e) => setDraft({ ...draft, quantity_shipped: e.target.value })} required step="1" type="number" value={draft.quantity_shipped} /></FormField></div><FormField htmlFor="shipment-status" label="Status" required><Select id="shipment-status" onChange={(e) => setDraft({ ...draft, status: e.target.value })} required value={draft.status}>{!statuses.includes(draft.status) && <option value={draft.status}>{draft.status}</option>}{statuses.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}</Select></FormField>{error && <p className="text-xs font-medium text-red-700" role="alert">{error}</p>}<div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end"><Button onClick={() => setDialog(null)} variant="outline">Cancel</Button><Button type="submit">{dialog.id === null ? "Add shipment" : "Save changes"}</Button></div></form></Modal>}
    {dialog?.kind === "view" && selected && <Modal description="Shipment record" onClose={() => setDialog(null)} title={`Shipment #${selected.shipment_id}`}><div className="grid gap-3 sm:grid-cols-2"><DetailField label="Shipment ID" value={selected.shipment_id} /><DetailField label="Shipment date" value={dateInputValue(selected.shipment_date)} /><DetailField label="Distributor" value={related(selected).distributor?.name} /><DetailField label="Product" value={related(selected).product?.name} /><DetailField label="Product batch" value={related(selected).batch?.batch_number} /><DetailField label="Quantity shipped" value={selected.quantity_shipped} /><div className="rounded-xl border border-line bg-[#FBFBF8] px-3.5 py-3"><p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-muted">Status</p><div className="mt-2"><ShipmentStatusBadge status={selected.status} /></div></div></div></Modal>}
    {dialog?.kind === "delete" && selected && <ConfirmDialog description={`Delete shipment #${selected.shipment_id}?`} onClose={() => setDialog(null)} onConfirm={remove} title="Delete shipment" />}
  </section>;
}
