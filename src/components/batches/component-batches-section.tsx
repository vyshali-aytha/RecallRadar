"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ConfirmDialog } from "@/components/crud/confirm-dialog";
import { DataTable } from "@/components/crud/data-table";
import { DetailField } from "@/components/crud/detail-field";
import { FormField } from "@/components/crud/form-field";
import { Modal } from "@/components/crud/modal";
import { RowActions } from "@/components/crud/row-actions";
import { BatchStatusBadge } from "@/components/batches/batch-status-badge";
import { Button, Input, Select } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/icon";
import { createComponentBatch, deleteComponentBatch, getAllComponentBatches, getAllComponents, updateComponentBatch } from "@/lib/member-a-actions";
import type { ComponentBatchInput, ComponentBatchRecord, ComponentRecord } from "@/lib/member-a-types";

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
  const [components, setComponents] = useState<ComponentRecord[]>([]);
  const [componentBatches, setComponentBatches] = useState<ComponentBatchRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [componentFilter, setComponentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null);
  const [draft, setDraft] = useState<ComponentBatchDraft>(emptyDraft);
  const [formError, setFormError] = useState("");
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; message: string } | null>(null);

  const refreshData = useCallback(async () => {
    setLoading(true);
    try {
      const batchResult = await getAllComponentBatches();
      const componentResult = await getAllComponents();
      const errors: string[] = [];
      if (batchResult.success) setComponentBatches(batchResult.data);
      else errors.push(`Component batches: ${batchResult.error}`);
      if (componentResult.success) setComponents(componentResult.data);
      else errors.push(`Components: ${componentResult.error}`);
      setLoadError(errors.join(" "));
    } catch {
      setLoadError("Component batches and component choices could not be loaded. Check the database connection and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void refreshData(); }, 0);
    return () => window.clearTimeout(timer);
  }, [refreshData]);

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
  function openCreate() {
    setDraft({ ...emptyDraft, component_id: components[0] ? String(components[0].component_id) : "" });
    setFormError("");
    setFeedback(null);
    setActiveDialog({ kind: "form", id: null });
  }

  function openEdit(batch: ComponentBatchRecord) {
    setDraft({
      batch_number: batch.batch_number,
      manufacture_date: batch.manufacture_date ?? "",
      expiry_date: batch.expiry_date ?? "",
      quantity_received: String(batch.quantity_received),
      status: batch.status,
      component_id: String(batch.component_id),
    });
    setFormError("");
    setFeedback(null);
    setActiveDialog({ kind: "form", id: batch.component_batch_id });
  }

  async function saveBatch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
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

    const record: ComponentBatchInput = {
      batch_number: batchNumber,
      manufacture_date: draft.manufacture_date || null,
      expiry_date: draft.expiry_date || null,
      quantity_received: quantity,
      status: draft.status.trim() || "active",
      component_id: componentId,
    };

    setSaving(true);
    setFormError("");
    setFeedback(null);
    try {
      const editId = activeDialog?.kind === "form" ? activeDialog.id : null;
      const result = editId !== null
        ? await updateComponentBatch(editId, record)
        : await createComponentBatch(record);
      if (!result.success) {
        setFormError(result.error);
        return;
      }
      setActiveDialog(null);
      setFeedback({ kind: "success", message: editId !== null ? `${batchNumber} was updated in MySQL.` : `${batchNumber} was added to MySQL.` });
      await refreshData();
    } catch {
      setFormError("The component batch could not be saved. Check the database connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (activeDialog?.kind !== "delete" || !selectedBatch || deleting) return;
    setDeleting(true);
    setFeedback(null);
    try {
      const result = await deleteComponentBatch(selectedBatch.component_batch_id);
      if (!result.success) {
        setActiveDialog(null);
        setFeedback({ kind: "error", message: result.error });
        return;
      }
      setActiveDialog(null);
      setFeedback({ kind: "success", message: `${selectedBatch.batch_number} was deleted from MySQL.` });
      await refreshData();
    } catch {
      setActiveDialog(null);
      setFeedback({ kind: "error", message: "The component batch could not be deleted. It may be referenced by a product composition or recall." });
    } finally {
      setDeleting(false);
    }
  }

  const columns = [
    {
      key: "component_batch_id",
      label: "Batch ID",
      className: "w-20",
      render: (batch: ComponentBatchRecord) => <span className="font-mono text-xs text-muted">{batch.component_batch_id}</span>,
    },
    {
      key: "batch_number",
      label: "Batch number",
      render: (batch: ComponentBatchRecord) => <span className="font-mono text-xs font-semibold tracking-wide text-ink">{batch.batch_number}</span>,
    },
    {
      key: "component",
      label: "Component",
      render: (batch: ComponentBatchRecord) => components.find((component) => component.component_id === batch.component_id)?.name ?? <span className="text-red-700">Component unavailable</span>,
    },
    {
      key: "manufacture_date",
      label: "Manufactured",
      render: (batch: ComponentBatchRecord) => batch.manufacture_date ?? <span className="text-muted">—</span>,
    },
    {
      key: "expiry_date",
      label: "Expiry",
      render: (batch: ComponentBatchRecord) => batch.expiry_date ?? <span className="text-muted">—</span>,
    },
    {
      key: "quantity_received",
      label: "Qty received",
      className: "w-28 text-right",
      render: (batch: ComponentBatchRecord) => <span className="font-mono text-xs">{batch.quantity_received.toLocaleString()}</span>,
    },
    {
      key: "status",
      label: "Status",
      render: (batch: ComponentBatchRecord) => <BatchStatusBadge status={batch.status} />,
    },
    {
      key: "actions",
      label: "Actions",
      className: "w-32 text-right",
      render: (batch: ComponentBatchRecord) => (
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
        <Button disabled={loading || Boolean(loadError) || components.length === 0} onClick={openCreate} title={components.length === 0 ? "Add a component before creating a batch" : undefined}>
          <span className="text-lg leading-none">+</span>Add component batch
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2.5 rounded-xl border border-sage bg-sage/45 px-3.5 py-3 text-xs text-forest" role="note">
        <Icon name="database" size={15} />
        <span>Component batches and component choices are loaded from MySQL.</span>
      </div>
      {feedback && (
        <div className={`flex items-center justify-between rounded-xl px-4 py-3 text-xs font-medium ${feedback.kind === "success" ? "border border-sage bg-sage/45 text-forest" : "border border-red-200 bg-red-50 text-red-800"}`} role={feedback.kind === "success" ? "status" : "alert"}>
          <span>{feedback.message}</span>
          <button aria-label="Dismiss message" className="ml-3 opacity-70 hover:opacity-100" onClick={() => setFeedback(null)} type="button"><Icon name="close" size={15} /></button>
        </div>
      )}
      {loadError && (
        <div className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800 sm:flex-row sm:items-center sm:justify-between" role="alert">
          <span>Database records could not be fully loaded: {loadError}</span>
          <Button className="min-h-9 shrink-0" disabled={loading} onClick={() => void refreshData()} size="sm" variant="outline">{loading ? "Loading…" : "Retry"}</Button>
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
        <span aria-live="polite" className="px-1 text-xs text-muted sm:ml-auto">{loading ? "Loading batches…" : `${filteredBatches.length} batches`}</span>
      </div>

      <DataTable
        columns={columns}
        emptyDescription={loading ? "Loading component batches from MySQL…" : loadError ? "Retry to load component batches and component choices." : query || componentFilter !== "all" || statusFilter !== "all" ? "Try another search or adjust the filters." : "Add a component batch to record an incoming lot."}
        emptyTitle={loading ? "Loading component batches" : loadError ? "Component batches unavailable" : query || componentFilter !== "all" || statusFilter !== "all" ? "No batches match these filters" : "No component batches yet"}
        rowKey={(batch) => batch.component_batch_id}
        rows={filteredBatches}
        footerLabel="Live MySQL records"
      />

      {activeDialog?.kind === "form" && (
        <Modal description="Batch number is unique within its selected component. Changes are saved to MySQL." onClose={() => !saving && setActiveDialog(null)} title={activeDialog.id === null ? "Add component batch" : "Edit component batch"}>
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
              <FormField error={formError.includes("Manufacture date") ? formError : undefined} htmlFor="component-batch-manufacture-date" label="Manufacture date" hint="Optional">
                <Input id="component-batch-manufacture-date" onChange={(event) => setDraft({ ...draft, manufacture_date: event.target.value })} type="date" value={draft.manufacture_date} />
              </FormField>
              <FormField error={formError.includes("Expiry date") ? formError : undefined} htmlFor="component-batch-expiry-date" label="Expiry date" hint="Optional">
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
            {formError && !formError.includes("Batch number") && !formError.includes("already exists") && !formError.includes("component") && !formError.includes("Quantity") && !formError.includes("Manufacture date") && !formError.includes("Expiry date") && <p className="text-xs font-medium text-red-700" role="alert">{formError}</p>}
            <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end">
              <Button disabled={saving} onClick={() => setActiveDialog(null)} variant="outline">Cancel</Button>
              <Button disabled={saving || loading || Boolean(loadError) || components.length === 0} type="submit">{saving ? "Saving…" : activeDialog.id === null ? "Add batch" : "Save changes"}</Button>
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
          description={`Delete component batch ${selectedBatch.batch_number} from MySQL? Product compositions or recalls may prevent deletion.`}
          onClose={() => !deleting && setActiveDialog(null)}
          onConfirm={confirmDelete}
          title="Delete component batch"
          confirmLabel={deleting ? "Deleting…" : "Delete component batch"}
          pending={deleting}
        />
      )}
    </section>
  );
}
