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
  createInventory,
  deleteInventory,
  getAllInventory,
  getAllInventoryLocations,
  updateInventory,
  type InventoryLocationRecord,
  type InventoryRecord,
} from "@/lib/member-b-actions";
import { getAllProductBatches, getAllProducts } from "@/lib/member-a-actions";
import type { ProductBatchRecord, ProductRecord } from "@/lib/member-a-types";
import { dateInputValue, notifyMemberBDataChanged, safeActionError } from "@/lib/member-b-client";

type Draft = { product_batch_id: string; location_id: string; quantity_on_hand: string };
type Dialog = { kind: "form"; id: number | null } | { kind: "view" | "delete"; id: number } | null;
const emptyDraft: Draft = { product_batch_id: "", location_id: "", quantity_on_hand: "0" };
const batchLabel = (batchNumber: string, productName?: string) => `${productName ?? "Unknown product"} · ${batchNumber}`;

export function InventoryRecordsSection() {
  const [inventoryRecords, setInventoryRecords] = useState<InventoryRecord[]>([]);
  const [inventoryLocations, setInventoryLocations] = useState<InventoryLocationRecord[]>([]);
  const [productBatches, setProductBatches] = useState<ProductBatchRecord[]>([]);
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const locations = inventoryLocations;
  const [loading, setLoading] = useState(true); const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState(""); const [locationFilter, setLocationFilter] = useState("all"); const [dialog, setDialog] = useState<Dialog>(null); const [draft, setDraft] = useState<Draft>(emptyDraft); const [error, setError] = useState(""); const [notice, setNotice] = useState("");
  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const [nextInventory, nextLocations, nextProducts, nextBatches] = await Promise.all([
        getAllInventory(),
        getAllInventoryLocations(),
        getAllProducts(),
        getAllProductBatches(),
      ]);
      if (!nextProducts.success) throw new Error(nextProducts.error);
      if (!nextBatches.success) throw new Error(nextBatches.error);
      setInventoryRecords(nextInventory);
      setInventoryLocations(nextLocations);
      setProducts(nextProducts.data);
      setProductBatches(nextBatches.data);
    } catch (reason) {
      setLoadError(safeActionError(reason, "Inventory data could not be loaded."));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => { void refresh(); }, 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);
  const rows = useMemo(() => inventoryRecords.filter((record) => { const batch = productBatches.find((item) => item.product_batch_id === record.product_batch_id); const product = products.find((item) => item.product_id === batch?.product_id); const location = inventoryLocations.find((item) => item.location_id === record.location_id); const q = query.trim().toLowerCase(); return (!q || [product?.name, batch?.batch_number, location?.name].some((value) => value?.toLowerCase().includes(q))) && (locationFilter === "all" || String(record.location_id) === locationFilter); }), [inventoryLocations, inventoryRecords, locationFilter, productBatches, products, query]);
  const selected = dialog ? inventoryRecords.find((record) => record.inventory_id === dialog.id) : undefined;
  function openCreate() { setDraft({ ...emptyDraft, product_batch_id: productBatches[0] ? String(productBatches[0].product_batch_id) : "", location_id: locations[0] ? String(locations[0].location_id) : "" }); setError(""); setDialog({ kind: "form", id: null }); }
  function openEdit(record: InventoryRecord) { setDraft({ product_batch_id: String(record.product_batch_id), location_id: String(record.location_id), quantity_on_hand: String(record.quantity_on_hand) }); setError(""); setDialog({ kind: "form", id: record.inventory_id }); }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const batchId = Number(draft.product_batch_id), locationId = Number(draft.location_id), quantity = Number(draft.quantity_on_hand);
    if (!productBatches.some((item) => item.product_batch_id === batchId) || !locations.some((item) => item.location_id === locationId)) { setError("Choose an existing product batch and location."); return; }
    if (!Number.isInteger(quantity) || quantity < 0 || quantity > 2147483647) { setError("Quantity on hand must be a whole number greater than or equal to zero."); return; }
    const duplicate = inventoryRecords.some((item) => item.product_batch_id === batchId && item.location_id === locationId && item.inventory_id !== (dialog?.kind === "form" ? dialog.id : null));
    if (duplicate) { setError("An inventory record already exists for this product batch and location."); return; }
    const record = { product_batch_id: batchId, location_id: locationId, quantity_on_hand: quantity };
    try {
      if (dialog?.kind === "form" && dialog.id !== null) {
        await updateInventory(dialog.id, record);
        setNotice("Inventory record updated.");
      } else {
        await createInventory(record);
        setNotice("Inventory record added.");
      }
      setDialog(null);
      notifyMemberBDataChanged();
      await refresh();
    } catch (reason) {
      setError(safeActionError(reason, "The inventory record could not be saved. Check that the selected batch and location are valid and that the pair is unique."));
    }
  }
  async function confirmDelete() {
    if (dialog?.kind !== "delete" || !selected) return;
    try {
      await deleteInventory(selected.inventory_id);
      setNotice("Inventory record removed.");
      setDialog(null);
      notifyMemberBDataChanged();
      await refresh();
    } catch (reason) {
      setLoadError(safeActionError(reason, "The inventory record could not be deleted."));
    }
  }
  const display = (record: InventoryRecord) => { const batch = productBatches.find((item) => item.product_batch_id === record.product_batch_id); const product = products.find((item) => item.product_id === batch?.product_id); return { batch, product, location: locations.find((item) => item.location_id === record.location_id) }; };
  const columns = [
    { key: "id", label: "Inventory ID", className: "w-24", render: (row: InventoryRecord) => <span className="font-mono text-xs text-muted">{row.inventory_id}</span> },
    { key: "product", label: "Product name", render: (row: InventoryRecord) => display(row).product?.name ?? "Unavailable product" },
    { key: "batch", label: "Product batch", render: (row: InventoryRecord) => <span className="font-mono text-xs">{display(row).batch?.batch_number ?? "Unavailable batch"}</span> },
    { key: "location", label: "Location", render: (row: InventoryRecord) => display(row).location?.name ?? "Unavailable location" },
    { key: "quantity", label: "Quantity on hand", className: "text-right", render: (row: InventoryRecord) => <span className="font-mono text-xs">{row.quantity_on_hand.toLocaleString()}</span> },
    { key: "updated", label: "Last updated", render: (row: InventoryRecord) => <span className="text-xs text-muted">{dateInputValue(row.last_updated)}</span> },
    { key: "actions", label: "Actions", className: "w-32 text-right", render: (row: InventoryRecord) => <RowActions label="inventory record" onDelete={() => setDialog({ kind: "delete", id: row.inventory_id })} onEdit={() => openEdit(row)} onView={() => setDialog({ kind: "view", id: row.inventory_id })} /> },
  ];
  return <section className="space-y-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted">Stock by location</p><h2 className="mt-1 text-lg font-semibold text-ink">Inventory records</h2><p className="mt-1 text-xs text-muted">Each product batch has one quantity record per location.</p></div><Button disabled={!productBatches.length || !locations.length} onClick={openCreate}><span className="text-lg leading-none">+</span>Add inventory</Button></div>
    {notice && <div className="rounded-xl border border-sage bg-sage/45 px-4 py-3 text-xs font-medium text-forest" role="status">{notice}</div>}
    {loadError && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800" role="alert">{loadError}</p>}
    {loading && <p className="text-xs text-muted" role="status">Loading inventory records…</p>}
    <div className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-3 shadow-card sm:flex-row sm:p-4"><label className="relative block w-full sm:max-w-sm"><span className="sr-only">Search inventory</span><Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" name="search" size={16} /><Input className="pl-10" onChange={(e) => setQuery(e.target.value)} placeholder="Search product, batch or location" value={query} /></label><label className="w-full sm:max-w-[240px]"><span className="sr-only">Filter by location</span><Select onChange={(e) => setLocationFilter(e.target.value)} value={locationFilter}><option value="all">All locations</option>{locations.map((item) => <option key={item.location_id} value={item.location_id}>{item.name}</option>)}</Select></label><span className="px-1 text-xs text-muted sm:ml-auto">{loadError ? "Count unavailable" : loading ? "Loading count…" : `${rows.length} records`}</span></div>
    <DataTable columns={columns} emptyDescription={loadError ? "Inventory records are unavailable until the database connection is restored." : loading ? "Inventory records are loading." : query || locationFilter !== "all" ? "Try a different search or location." : "Add an inventory record to start tracking available stock."} emptyTitle={loadError ? "Inventory unavailable" : loading ? "Loading inventory" : rows.length ? "No matching inventory" : "No inventory records yet"} footerLabel="Showing live MySQL records" rowKey={(row) => row.inventory_id} rows={rows} />
    {dialog?.kind === "form" && <Modal description="The database records the inventory update time." onClose={() => setDialog(null)} title={dialog.id === null ? "Add inventory record" : "Edit inventory record"}><form className="space-y-4" onSubmit={save}>
      <FormField error={error.includes("product batch") || error.includes("combination") ? error : undefined} htmlFor="inventory-batch" label="Product batch" required><Select id="inventory-batch" onChange={(e) => setDraft({ ...draft, product_batch_id: e.target.value })} required value={draft.product_batch_id}><option value="">Choose product batch</option>{productBatches.map((batch) => <option key={batch.product_batch_id} value={batch.product_batch_id}>{batchLabel(batch.batch_number, products.find((p) => p.product_id === batch.product_id)?.name)}</option>)}</Select></FormField>
      <FormField error={error.includes("location") || error.includes("combination") ? error : undefined} htmlFor="inventory-location" label="Location" required><Select id="inventory-location" onChange={(e) => setDraft({ ...draft, location_id: e.target.value })} required value={draft.location_id}><option value="">Choose location</option>{locations.map((item) => <option key={item.location_id} value={item.location_id}>{item.name}</option>)}</Select></FormField>
      <FormField error={error.includes("Quantity") ? error : undefined} htmlFor="inventory-quantity" label="Quantity on hand" required><Input id="inventory-quantity" min="0" onChange={(e) => setDraft({ ...draft, quantity_on_hand: e.target.value })} required step="1" type="number" value={draft.quantity_on_hand} /></FormField>
      {error && <p className="text-xs font-medium text-red-700" role="alert">{error}</p>}<div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end"><Button onClick={() => setDialog(null)} variant="outline">Cancel</Button><Button type="submit">{dialog.id === null ? "Add record" : "Save changes"}</Button></div>
    </form></Modal>}
    {dialog?.kind === "view" && selected && <Modal description="Inventory record" onClose={() => setDialog(null)} title={`Inventory #${selected.inventory_id}`}><div className="grid gap-3 sm:grid-cols-2"><DetailField label="Inventory ID" value={selected.inventory_id} /><DetailField label="Product" value={display(selected).product?.name} /><DetailField label="Product batch" value={display(selected).batch?.batch_number} /><DetailField label="Location" value={display(selected).location?.name} /><DetailField label="Quantity on hand" value={selected.quantity_on_hand} /><DetailField label="Last updated" value={dateInputValue(selected.last_updated)} /></div></Modal>}
    {dialog?.kind === "delete" && selected && <ConfirmDialog description={`Remove inventory record #${selected.inventory_id}?`} onClose={() => setDialog(null)} onConfirm={confirmDelete} title="Delete inventory record" />}
  </section>;
}
