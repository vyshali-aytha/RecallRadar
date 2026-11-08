"use client";

import { useMemo, useState } from "react";
import { ConfirmDialog } from "@/components/crud/confirm-dialog";
import { DataTable } from "@/components/crud/data-table";
import { DetailField } from "@/components/crud/detail-field";
import { FormField } from "@/components/crud/form-field";
import { Modal } from "@/components/crud/modal";
import { RowActions } from "@/components/crud/row-actions";
import { Button, Input } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/icon";
import { useMockData } from "@/lib/mock-data";
import type { InventoryLocation } from "@/lib/mock-data";

type Draft = { name: string; type: string; address: string };
type Dialog = { kind: "form"; id: number | null } | { kind: "view" | "delete"; id: number } | null;
const blank: Draft = { name: "", type: "", address: "" };

export function InventoryLocationsSection() {
  const { inventoryLocations, inventoryRecords, addInventoryLocation, updateInventoryLocation, deleteInventoryLocation } = useMockData();
  const [query, setQuery] = useState(""); const [dialog, setDialog] = useState<Dialog>(null); const [draft, setDraft] = useState<Draft>(blank); const [error, setError] = useState(""); const [notice, setNotice] = useState("");
  const rows = useMemo(() => { const term = query.trim().toLowerCase(); return inventoryLocations.filter((row) => !term || [row.name, row.type, row.address].some((value) => value?.toLowerCase().includes(term))); }, [inventoryLocations, query]);
  const selected = dialog ? inventoryLocations.find((row) => row.location_id === dialog.id) : undefined;
  const blocked = dialog?.kind === "delete" && inventoryRecords.some((row) => row.location_id === dialog.id) ? "Inventory records reference this location. Remove or reassign those records before deleting it." : undefined;
  function openEdit(row: InventoryLocation) { setDraft({ name: row.name, type: row.type ?? "", address: row.address ?? "" }); setError(""); setDialog({ kind: "form", id: row.location_id }); }
  function save(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); const name = draft.name.trim(); if (!name) { setError("Location name is required."); return; } const record = { name, type: draft.type.trim() || null, address: draft.address.trim() || null }; if (dialog?.kind === "form" && dialog.id !== null) { updateInventoryLocation(dialog.id, record); setNotice(`${name} updated in mock data.`); } else { addInventoryLocation(record); setNotice(`${name} added to mock data.`); } setDialog(null); }
  function remove() { if (dialog?.kind !== "delete" || blocked || !selected) return; deleteInventoryLocation(selected.location_id); setNotice(`${selected.name} removed from mock data.`); setDialog(null); }
  const columns = [
    { key: "id", label: "Location ID", className: "w-24", render: (row: InventoryLocation) => <span className="font-mono text-xs text-muted">{row.location_id}</span> },
    { key: "name", label: "Location", render: (row: InventoryLocation) => <span className="font-medium">{row.name}</span> },
    { key: "type", label: "Type", render: (row: InventoryLocation) => row.type?.replaceAll("_", " ") ?? <span className="text-muted">—</span> },
    { key: "address", label: "Address", render: (row: InventoryLocation) => row.address ?? <span className="text-muted">—</span> },
    { key: "count", label: "Inventory records", className: "text-right", render: (row: InventoryLocation) => inventoryRecords.filter((item) => item.location_id === row.location_id).length },
    { key: "actions", label: "Actions", className: "w-32 text-right", render: (row: InventoryLocation) => <RowActions label="location" onDelete={() => setDialog({ kind: "delete", id: row.location_id })} onEdit={() => openEdit(row)} onView={() => setDialog({ kind: "view", id: row.location_id })} /> },
  ];
  return <section className="space-y-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted">Storage network</p><h2 className="mt-1 text-lg font-semibold text-ink">Inventory locations</h2><p className="mt-1 text-xs text-muted">Maintain warehouses, cold storage and inspection locations.</p></div><Button onClick={() => { setDraft(blank); setError(""); setDialog({ kind: "form", id: null }); }}><span className="text-lg leading-none">+</span>Add location</Button></div>
    {notice && <div className="rounded-xl border border-sage bg-sage/45 px-4 py-3 text-xs font-medium text-forest" role="status">{notice}</div>}
    <div className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-3 shadow-card sm:flex-row sm:items-center sm:p-4"><label className="relative block w-full sm:max-w-sm"><span className="sr-only">Search locations</span><Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" name="search" size={16} /><Input className="pl-10" onChange={(e) => setQuery(e.target.value)} placeholder="Search locations" value={query} /></label><span className="px-1 text-xs text-muted sm:ml-auto">{rows.length} locations</span></div>
    <DataTable columns={columns} emptyDescription={query ? "Try another search term." : "Add a location to define where inventory is held."} emptyTitle={query ? "No locations match" : "No locations yet"} rowKey={(row) => row.location_id} rows={rows} />
    {dialog?.kind === "form" && <Modal description="Name is required. Type and address are optional." onClose={() => setDialog(null)} title={dialog.id === null ? "Add inventory location" : "Edit inventory location"}><form className="space-y-4" onSubmit={save}><FormField error={error || undefined} htmlFor="location-name" label="Name" required><Input autoFocus id="location-name" maxLength={150} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required value={draft.name} /></FormField><FormField htmlFor="location-type" label="Type" hint="Optional, up to 50 characters"><Input id="location-type" maxLength={50} onChange={(e) => setDraft({ ...draft, type: e.target.value })} placeholder="e.g. warehouse" value={draft.type} /></FormField><FormField htmlFor="location-address" label="Address" hint="Optional, up to 255 characters"><Input id="location-address" maxLength={255} onChange={(e) => setDraft({ ...draft, address: e.target.value })} value={draft.address} /></FormField><div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end"><Button onClick={() => setDialog(null)} variant="outline">Cancel</Button><Button type="submit">{dialog.id === null ? "Add location" : "Save changes"}</Button></div></form></Modal>}
    {dialog?.kind === "view" && selected && <Modal description="Inventory location" onClose={() => setDialog(null)} title={selected.name}><div className="grid gap-3 sm:grid-cols-2"><DetailField label="Location ID" value={selected.location_id} /><DetailField label="Name" value={selected.name} /><DetailField label="Type" value={selected.type} /><DetailField label="Address" value={selected.address} /><DetailField label="Inventory records" value={inventoryRecords.filter((row) => row.location_id === selected.location_id).length} /></div></Modal>}
    {dialog?.kind === "delete" && selected && <ConfirmDialog blockedReason={blocked} description={`Delete ${selected.name} from temporary mock data?`} onClose={() => setDialog(null)} onConfirm={remove} title="Delete location" />}
  </section>;
}
