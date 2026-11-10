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
  createDistributor,
  deleteDistributor,
  getAllDistributors,
  getAllShipments,
  updateDistributor,
  type DistributorRecord,
  type ShipmentRecord,
} from "@/lib/member-b-actions";
import { getAllProductBatches, getAllProducts } from "@/lib/member-a-actions";
import type { ProductBatchRecord, ProductRecord } from "@/lib/member-a-types";
import { dateInputValue, notifyMemberBDataChanged, safeActionError } from "@/lib/member-b-client";

type Draft = { name: string; region: string; contact_email: string };
type Dialog = { kind: "form"; id: number | null } | { kind: "view" | "delete"; id: number } | null;
const blank: Draft = { name: "", region: "", contact_email: "" };

export function DistributorsSection() {
  const [distributors, setDistributors] = useState<DistributorRecord[]>([]);
  const [shipments, setShipments] = useState<ShipmentRecord[]>([]);
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [productBatches, setProductBatches] = useState<ProductBatchRecord[]>([]);
  const [loading, setLoading] = useState(true); const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState(""); const [regionFilter, setRegionFilter] = useState("all"); const [dialog, setDialog] = useState<Dialog>(null); const [draft, setDraft] = useState<Draft>(blank); const [error, setError] = useState(""); const [notice, setNotice] = useState("");
  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const [nextDistributors, nextShipments, nextProducts, nextBatches] = await Promise.all([
        getAllDistributors(),
        getAllShipments(),
        getAllProducts(),
        getAllProductBatches(),
      ]);
      if (!nextProducts.success) throw new Error(nextProducts.error);
      if (!nextBatches.success) throw new Error(nextBatches.error);
      setDistributors(nextDistributors);
      setShipments(nextShipments);
      setProducts(nextProducts.data);
      setProductBatches(nextBatches.data);
    } catch (reason) {
      setLoadError(safeActionError(reason, "Distributor data could not be loaded."));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => { void refresh(); }, 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);
  const regions = [...new Set(distributors.map((item) => item.region).filter((region): region is string => Boolean(region)))].sort();
  const rows = useMemo(() => { const term = query.trim().toLowerCase(); return distributors.filter((row) => (!term || [row.name, row.region, row.contact_email].some((value) => value?.toLowerCase().includes(term))) && (regionFilter === "all" || row.region === regionFilter)); }, [distributors, query, regionFilter]);
  const selected = dialog ? distributors.find((row) => row.distributor_id === dialog.id) : undefined;
  const history = selected ? shipments.filter((row) => row.distributor_id === selected.distributor_id) : [];
  const blocked = dialog?.kind === "delete" && shipments.some((row) => row.distributor_id === dialog.id) ? "Shipments reference this distributor. Remove those shipments before deleting this distributor." : undefined;
  function openEdit(row: DistributorRecord) { setDraft({ name: row.name, region: row.region ?? "", contact_email: row.contact_email ?? "" }); setError(""); setDialog({ kind: "form", id: row.distributor_id }); }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = draft.name.trim();
    if (!name) { setError("Distributor name is required."); return; }
    const record = { name, region: draft.region.trim() || null, contact_email: draft.contact_email.trim() || null };
    try {
      if (dialog?.kind === "form" && dialog.id !== null) {
        await updateDistributor(dialog.id, record);
        setNotice(`${name} updated.`);
      } else {
        await createDistributor(record);
        setNotice(`${name} added.`);
      }
      setDialog(null);
      notifyMemberBDataChanged();
      await refresh();
    } catch (reason) {
      setError(safeActionError(reason, "The distributor could not be saved."));
    }
  }
  async function remove() {
    if (dialog?.kind !== "delete" || blocked || !selected) return;
    try {
      await deleteDistributor(selected.distributor_id);
      setNotice(`${selected.name} removed.`);
      setDialog(null);
      notifyMemberBDataChanged();
      await refresh();
    } catch (reason) {
      setLoadError(safeActionError(reason, "The distributor could not be deleted. Related shipments may still exist."));
    }
  }
  const columns = [
    { key: "id", label: "Distributor ID", className: "w-28", render: (row: DistributorRecord) => <span className="font-mono text-xs text-muted">{row.distributor_id}</span> },
    { key: "name", label: "Name", render: (row: DistributorRecord) => <span className="font-medium">{row.name}</span> },
    { key: "region", label: "Region", render: (row: DistributorRecord) => row.region ?? <span className="text-muted">—</span> },
    { key: "email", label: "Contact email", render: (row: DistributorRecord) => row.contact_email ?? <span className="text-muted">—</span> },
    { key: "shipments", label: "Shipments", className: "text-right", render: (row: DistributorRecord) => shipments.filter((shipment) => shipment.distributor_id === row.distributor_id).length },
    { key: "actions", label: "Actions", className: "w-32 text-right", render: (row: DistributorRecord) => <RowActions label="distributor" onDelete={() => setDialog({ kind: "delete", id: row.distributor_id })} onEdit={() => openEdit(row)} onView={() => setDialog({ kind: "view", id: row.distributor_id })} /> },
  ];
  return <section className="space-y-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted">Downstream network</p><h2 className="mt-1 text-lg font-semibold text-ink">Distributors</h2><p className="mt-1 text-xs text-muted">Manage partners receiving finished product batches.</p></div><Button onClick={() => { setDraft(blank); setError(""); setDialog({ kind: "form", id: null }); }}><span className="text-lg leading-none">+</span>Add distributor</Button></div>
    {notice && <div className="rounded-xl border border-sage bg-sage/45 px-4 py-3 text-xs font-medium text-forest" role="status">{notice}</div>}
    {loadError && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800" role="alert">{loadError}</p>}
    {loading && <p className="text-xs text-muted" role="status">Loading distributor records…</p>}
    <div className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-3 shadow-card sm:flex-row sm:p-4"><label className="relative block w-full sm:max-w-sm"><span className="sr-only">Search distributors</span><Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" name="search" size={16} /><Input className="pl-10" onChange={(e) => setQuery(e.target.value)} placeholder="Search distributors" value={query} /></label><label className="w-full sm:max-w-[220px]"><span className="sr-only">Filter distributors by region</span><Select onChange={(e) => setRegionFilter(e.target.value)} value={regionFilter}><option value="all">All regions</option>{regions.map((region) => <option key={region} value={region}>{region}</option>)}</Select></label><span className="px-1 text-xs text-muted sm:ml-auto">{rows.length} distributors</span></div>
    <DataTable columns={columns} emptyDescription={loading ? "Distributor records are loading." : query || regionFilter !== "all" ? "Try a different search or region." : "Add a distributor to start a downstream network."} emptyTitle={loading ? "Loading distributors" : rows.length ? "No matching distributors" : "No distributors yet"} footerLabel="Showing live MySQL records" rowKey={(row) => row.distributor_id} rows={rows} />
    {dialog?.kind === "form" && <Modal description="Name is required. Region and email are optional." onClose={() => setDialog(null)} title={dialog.id === null ? "Add distributor" : "Edit distributor"}><form className="space-y-4" onSubmit={save}><FormField error={error || undefined} htmlFor="distributor-name" label="Name" required><Input autoFocus id="distributor-name" maxLength={150} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required value={draft.name} /></FormField><FormField htmlFor="distributor-region" label="Region" hint="Optional, up to 100 characters"><Input id="distributor-region" maxLength={100} onChange={(e) => setDraft({ ...draft, region: e.target.value })} value={draft.region} /></FormField><FormField htmlFor="distributor-email" label="Contact email" hint="Optional"><Input id="distributor-email" maxLength={255} onChange={(e) => setDraft({ ...draft, contact_email: e.target.value })} type="email" value={draft.contact_email} /></FormField><div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end"><Button onClick={() => setDialog(null)} variant="outline">Cancel</Button><Button type="submit">{dialog.id === null ? "Add distributor" : "Save changes"}</Button></div></form></Modal>}
    {dialog?.kind === "view" && selected && <Modal description="Distributor profile and outbound shipment history" onClose={() => setDialog(null)} title={selected.name} width="lg"><div className="grid gap-3 sm:grid-cols-3"><DetailField label="Distributor ID" value={selected.distributor_id} /><DetailField label="Region" value={selected.region} /><DetailField label="Contact email" value={selected.contact_email} /></div><div className="mt-6"><h3 className="text-sm font-semibold text-ink">Shipment history <span className="ml-1 text-xs font-normal text-muted">({history.length})</span></h3>{history.length ? <div className="mt-3 space-y-2">{history.map((shipment) => { const batch = productBatches.find((item) => item.product_batch_id === shipment.product_batch_id); const product = products.find((item) => item.product_id === batch?.product_id); return <div className="flex flex-col gap-2 rounded-xl border border-line bg-[#FBFBF8] p-3 sm:flex-row sm:items-center sm:justify-between" key={shipment.shipment_id}><div><p className="text-sm font-medium text-ink">{product?.name ?? "Unknown product"}</p><p className="mt-1 font-mono text-xs text-muted">{batch?.batch_number ?? "Unavailable batch"} · {dateInputValue(shipment.shipment_date) || "Date not set"} · {shipment.quantity_shipped} units</p></div><ShipmentStatusBadge status={shipment.status} /></div>; })}</div> : <p className="mt-3 rounded-xl border border-dashed border-line p-5 text-center text-xs text-muted">No shipments for this distributor yet.</p>}</div></Modal>}
    {dialog?.kind === "delete" && selected && <ConfirmDialog blockedReason={blocked} description={`Permanently delete ${selected.name}?`} onClose={() => setDialog(null)} onConfirm={remove} title="Delete distributor" />}
  </section>;
}
