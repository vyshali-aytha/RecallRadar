"use client";

import { useMemo, useState } from "react";
import { ConfirmDialog } from "@/components/crud/confirm-dialog";
import { DataTable } from "@/components/crud/data-table";
import { DetailField } from "@/components/crud/detail-field";
import { FormField } from "@/components/crud/form-field";
import { Modal } from "@/components/crud/modal";
import { RowActions } from "@/components/crud/row-actions";
import { BatchStatusBadge } from "@/components/batches/batch-status-badge";
import { Button, Input, Select } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/icon";
import { useMockData } from "@/lib/mock-data";
import type { ComponentBatch } from "@/lib/mock-data";

type ComponentBatchDraft = {
  batch_number: string;
  manufacture_date: string;
  expiry_date: string;
  quantity_received: string;
  status: string;
  component_id: string;
};

type ActiveDialog =
  | { kind: "form"; id: number | null }
  | { kind: "view"; id: number }
  | { kind: "delete"; id: number }
  | null;

const statusOptions = ["active", "quarantined", "depleted"];
const emptyDraft: ComponentBatchDraft = {
  batch_number: "",
  manufacture_date: "",
  expiry_date: "",
  quantity_received: "0",
  status: "active",
  component_id: "",
};

export function ComponentBatchesSection() {
  const { components, componentBatches, batchCompositions, addComponentBatch, updateComponentBatch, deleteComponentBatch } = useMockData();
  const [query, setQuery] = useState("");
  const [componentFilter, setComponentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null);
  const [draft, setDraft] = useState<ComponentBatchDraft>(emptyDraft);
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");

  const filteredBatches = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return componentBatches.filter((batch) => {
      const component = components.find((item) => item.component_id === batch.component_id);
      const matchesQuery = !normalized || [batch.batch_number, component?.name].some((value) => value?.toLowerCase().includes(normalized));
      const matchesComponent = componentFilter === "all" || String(batch.component_id) === componentFilter;
      const matchesStatus = statusFilter === "all" || batch.status === statusFilter;
      return matchesQuery && matchesComponent && matchesStatus;
    });
  }, [componentBatches, componentFilter, components, query, statusFilter]);

  const selectedBatch = activeDialog
    ? componentBatches.find((batch) => batch.component_batch_id === activeDialog.id)
    : undefined;
  const selectedComponent = selectedBatch
    ? components.find((component) => component.component_id === selectedBatch.component_id)
    : undefined;
  const linkedCompositions = activeDialog?.kind === "delete"
    ? batchCompositions.filter((entry) => entry.component_batch_id === activeDialog.id)
    : [];
  const blockedReason = linkedCompositions.length > 0
    ? "This component batch is used in product batch composition. Remove those composition entries before deleting it."
    : undefined;

  function openCreate() {
    setDraft({ ...emptyDraft, component_id: components[0] ? String(components[0].component_id) : "" });
    setFormError("");
    setActiveDialog({ kind: "form", id: null });
  }

  function openEdit(batch: ComponentBatch) {
    setDraft({
      batch_number: batch.batch_number,
      manufacture_date: batch.manufacture_date ?? "",
      expiry_date: batch.expiry_date ?? "",
      quantity_received: String(batch.quantity_received),
      status: batch.status,
      component_id: String(batch.component_id),
    });
    setFormError("");
    setActiveDialog({ kind: "form", id: batch.component_batch_id });
  }

  function saveBatch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const batchNumber = draft.batch_number.trim();
    const componentId = Number(draft.component_id);
    const quantity = Number(draft.quantity_received);
    if (!batchNumber) {
      setFormError("Batch number is required.");
      return;
    }
    if (!components.some((component) => component.component_id === componentId)) {
      setFormError("Choose a component for this batch.");
      return;
    }
    if (!Number.isInteger(quantity) || quantity < 0 || quantity > 2147483647) {
      setFormError("Quantity received must be a whole number greater than or equal to zero.");
      return;
    }
    const duplicate = componentBatches.some((batch) =>
      batch.component_id === componentId &&
      batch.batch_number.toLocaleLowerCase() === batchNumber.toLocaleLowerCase() &&
      batch.component_batch_id !== (activeDialog?.kind === "form" ? activeDialog.id : null),
    );
    if (duplicate) {
      setFormError("That batch number already exists for the selected component.");
      return;
    }

    const record = {
      batch_number: batchNumber,
      manufacture_date: draft.manufacture_date || null,
      expiry_date: draft.expiry_date || null,
      quantity_received: quantity,
      status: draft.status.trim() || "active",
      component_id: componentId,
    };
    if (activeDialog?.kind === "form" && activeDialog.id !== null) {
      updateComponentBatch(activeDialog.id, record);
      setNotice(`${batchNumber} was updated in mock data.`);
    } else {
      addComponentBatch(record);
      setNotice(`${batchNumber} was added to mock data.`);
    }
    setActiveDialog(null);
  }

  function confirmDelete() {
    if (activeDialog?.kind !== "delete" || blockedReason || !selectedBatch) return;
    deleteComponentBatch(selectedBatch.component_batch_id);
    setNotice(`${selectedBatch.batch_number} was removed from mock data.`);
    setActiveDialog(null);
  }

  const columns = [
    {
      key: "component_batch_id",
      label: "Batch ID",
      className: "w-20",
      render: (batch: ComponentBatch) => <span className="font-mono text-xs text-muted">{batch.component_batch_id}</span>,
    },
    {
      key: "batch_number",
      label: "Batch number",
      render: (batch: ComponentBatch) => <span className="font-mono text-xs font-semibold tracking-wide text-ink">{batch.batch_number}</span>,
    },
    {
      key: "component",
      label: "Component",
      render: (batch: ComponentBatch) => components.find((component) => component.component_id === batch.component_id)?.name ?? <span className="text-red-700">Component unavailable</span>,
    },
    {
      key: "manufacture_date",
      label: "Manufactured",
      render: (batch: ComponentBatch) => batch.manufacture_date ?? <span className="text-muted">—</span>,
    },
    {
      key: "expiry_date",
      label: "Expiry",
      render: (batch: ComponentBatch) => batch.expiry_date ?? <span className="text-muted">—</span>,
    },
    {
      key: "quantity_received",
      label: "Qty received",
      className: "w-28 text-right",
      render: (batch: ComponentBatch) => <span className="font-mono text-xs">{batch.quantity_received.toLocaleString()}</span>,
    },
    {
      key: "status",
      label: "Status",
      render: (batch: ComponentBatch) => <BatchStatusBadge status={batch.status} />,
    },
    {
      key: "actions",
      label: "Actions",
      className: "w-32 text-right",
      render: (batch: ComponentBatch) => (
        <RowActions
          label="component batch"
          onDelete={() => setActiveDialog({ kind: "delete", id: batch.component_batch_id })}
          onEdit={() => openEdit(batch)}
          onView={() => setActiveDialog({ kind: "view", id: batch.component_batch_id })}
        />
      ),
    },
  ];

  return (
    <section aria-labelledby="component-batches-heading" className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted">Incoming materials</p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight text-ink" id="component-batches-heading">Component batches</h2>
          <p className="mt-1 text-xs text-muted">Record received lots and their source components.</p>
        </div>
        <Button disabled={components.length === 0} onClick={openCreate} title={components.length === 0 ? "Add a component before creating a batch" : undefined}>
          <span className="text-lg leading-none">+</span>Add component batch
        </Button>
      </div>
      {notice && (
        <div className="flex items-center justify-between rounded-xl border border-sage bg-sage/45 px-4 py-3 text-xs font-medium text-forest" role="status">
          <span>{notice}</span>
          <button aria-label="Dismiss message" className="ml-3 text-forest/70 hover:text-forest" onClick={() => setNotice("")} type="button"><Icon name="close" size={15} /></button>
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-3 shadow-card sm:flex-row sm:items-center sm:p-4">
        <label className="relative block w-full sm:max-w-[290px]">
          <span className="sr-only">Search component batches</span>
          <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" name="search" size={16} />
          <Input className="pl-10" onChange={(event) => setQuery(event.target.value)} placeholder="Search batch or component" value={query} />
        </label>
        <label className="block w-full sm:max-w-[220px]">
          <span className="sr-only">Filter component batches by component</span>
          <Select onChange={(event) => setComponentFilter(event.target.value)} value={componentFilter}>
            <option value="all">All components</option>
            {components.map((component) => <option key={component.component_id} value={component.component_id}>{component.name}</option>)}
          </Select>
        </label>
        <label className="block w-full sm:max-w-[170px]">
          <span className="sr-only">Filter component batches by status</span>
          <Select onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}>
            <option value="all">All statuses</option>
            {statusOptions.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}
          </Select>
        </label>
        <span className="px-1 text-xs text-muted sm:ml-auto">{filteredBatches.length} batches</span>
      </div>

      <DataTable
        columns={columns}
        emptyDescription={query || componentFilter !== "all" || statusFilter !== "all" ? "Try another search or adjust the filters." : "Add a component batch to record an incoming lot."}
        emptyTitle={query || componentFilter !== "all" || statusFilter !== "all" ? "No batches match these filters" : "No component batches yet"}
        rowKey={(batch) => batch.component_batch_id}
        rows={filteredBatches}
      />

      {activeDialog?.kind === "form" && (
        <Modal description="Batch number is unique within its selected component." onClose={() => setActiveDialog(null)} title={activeDialog.id === null ? "Add component batch" : "Edit component batch"}>
          <form className="space-y-4" onSubmit={saveBatch}>
            <FormField error={formError.includes("Batch number") || formError.includes("already exists") ? formError : undefined} htmlFor="component-batch-number" label="Batch number" required>
              <Input autoFocus id="component-batch-number" maxLength={100} onChange={(event) => { setDraft({ ...draft, batch_number: event.target.value }); setFormError(""); }} placeholder="e.g. NSPC-TS-2026-0812" required value={draft.batch_number} />
            </FormField>
            <FormField error={formError.includes("component") ? formError : undefined} htmlFor="component-batch-component" label="Component" required>
              <Select id="component-batch-component" onChange={(event) => { setDraft({ ...draft, component_id: event.target.value }); setFormError(""); }} required value={draft.component_id}>
                <option value="">Choose component</option>
                {components.map((component) => <option key={component.component_id} value={component.component_id}>{component.name}</option>)}
              </Select>
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField htmlFor="component-batch-manufacture-date" label="Manufacture date" hint="Optional">
                <Input id="component-batch-manufacture-date" onChange={(event) => setDraft({ ...draft, manufacture_date: event.target.value })} type="date" value={draft.manufacture_date} />
              </FormField>
              <FormField htmlFor="component-batch-expiry-date" label="Expiry date" hint="Optional">
                <Input id="component-batch-expiry-date" onChange={(event) => setDraft({ ...draft, expiry_date: event.target.value })} type="date" value={draft.expiry_date} />
              </FormField>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField error={formError.includes("Quantity") ? formError : undefined} htmlFor="component-batch-quantity" label="Quantity received" required>
                <Input id="component-batch-quantity" min="0" onChange={(event) => { setDraft({ ...draft, quantity_received: event.target.value }); setFormError(""); }} required step="1" type="number" value={draft.quantity_received} />
              </FormField>
              <FormField htmlFor="component-batch-status" label="Status" required>
                <Select id="component-batch-status" onChange={(event) => setDraft({ ...draft, status: event.target.value })} required value={draft.status}>
                  {!statusOptions.includes(draft.status) && <option value={draft.status}>{draft.status}</option>}
                  {statusOptions.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}
                </Select>
              </FormField>
            </div>
            {formError && !formError.includes("Batch number") && !formError.includes("already exists") && !formError.includes("component") && !formError.includes("Quantity") && <p className="text-xs font-medium text-red-700" role="alert">{formError}</p>}
            <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end">
              <Button onClick={() => setActiveDialog(null)} variant="outline">Cancel</Button>
              <Button disabled={components.length === 0} type="submit">{activeDialog.id === null ? "Add batch" : "Save changes"}</Button>
            </div>
          </form>
        </Modal>
      )}

      {activeDialog?.kind === "view" && selectedBatch && (
        <Modal description="Component batch record" onClose={() => setActiveDialog(null)} title={selectedBatch.batch_number}>
          <div className="grid gap-3 sm:grid-cols-2">
            <DetailField label="Component batch ID" value={selectedBatch.component_batch_id} />
            <DetailField label="Component" value={selectedComponent?.name} />
            <DetailField label="Manufacture date" value={selectedBatch.manufacture_date} />
            <DetailField label="Expiry date" value={selectedBatch.expiry_date} />
            <DetailField label="Quantity received" value={selectedBatch.quantity_received} />
            <div className="rounded-xl border border-line bg-[#FBFBF8] px-3.5 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-muted">Status</p>
              <div className="mt-2"><BatchStatusBadge status={selectedBatch.status} /></div>
            </div>
          </div>
          <div className="mt-5 flex justify-end"><Button onClick={() => openEdit(selectedBatch)} variant="outline">Edit batch</Button></div>
        </Modal>
      )}

      {activeDialog?.kind === "delete" && selectedBatch && (
        <ConfirmDialog
          blockedReason={blockedReason}
          description={`Delete component batch ${selectedBatch.batch_number}? This removes it from temporary mock data.`}
          onClose={() => setActiveDialog(null)}
          onConfirm={confirmDelete}
          title="Delete component batch"
        />
      )}
    </section>
  );
}
