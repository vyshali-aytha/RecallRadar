"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ConfirmDialog } from "@/components/crud/confirm-dialog";
import { DataTable } from "@/components/crud/data-table";
import { DetailField } from "@/components/crud/detail-field";
import { FormField } from "@/components/crud/form-field";
import { Modal } from "@/components/crud/modal";
import { PageHeading } from "@/components/crud/page-heading";
import { RowActions } from "@/components/crud/row-actions";
import { Button, Input } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/icon";
import { createSupplier, deleteSupplier, getAllSuppliers, updateSupplier } from "@/lib/member-a-actions";
import type { SupplierInput, SupplierRecord } from "@/lib/member-a-types";

type SupplierDraft = {
  name: string;
  contact_email: string;
  phone: string;
  address: string;
};

type ActiveDialog =
  | { kind: "form"; id: number | null }
  | { kind: "view"; id: number }
  | { kind: "delete"; id: number }
  | null;

const emptyDraft: SupplierDraft = { name: "", contact_email: "", phone: "", address: "" };

function optionalValue(value: string) {
  return value.trim() || null;
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null);
  const [draft, setDraft] = useState<SupplierDraft>(emptyDraft);
  const [formError, setFormError] = useState("");
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; message: string } | null>(null);

  const refreshSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getAllSuppliers();
      if (result.success) {
        setSuppliers(result.data);
        setLoadError("");
      } else {
        setLoadError(result.error);
      }
    } catch {
      setLoadError("The supplier list could not be loaded. Check the connection and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void refreshSuppliers(); }, 0);
    return () => window.clearTimeout(timer);
  }, [refreshSuppliers]);

  const filteredSuppliers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return suppliers;
    return suppliers.filter((supplier) =>
      [supplier.name, supplier.contact_email, supplier.phone, supplier.address]
        .some((value) => value?.toLowerCase().includes(normalized)),
    );
  }, [query, suppliers]);

  const selectedSupplier = activeDialog
    ? suppliers.find((supplier) => supplier.supplier_id === activeDialog.id)
    : undefined;
  function openCreate() {
    setDraft(emptyDraft);
    setFormError("");
    setFeedback(null);
    setActiveDialog({ kind: "form", id: null });
  }

  function openEdit(supplier: SupplierRecord) {
    setDraft({
      name: supplier.name,
      contact_email: supplier.contact_email ?? "",
      phone: supplier.phone ?? "",
      address: supplier.address ?? "",
    });
    setFormError("");
    setFeedback(null);
    setActiveDialog({ kind: "form", id: supplier.supplier_id });
  }

  async function saveSupplier(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const name = draft.name.trim();
    if (!name) {
      setFormError("Enter a supplier name.");
      return;
    }

    const record: SupplierInput = {
      name,
      contact_email: optionalValue(draft.contact_email),
      phone: optionalValue(draft.phone),
      address: optionalValue(draft.address),
    };

    setSaving(true);
    setFormError("");
    setFeedback(null);
    try {
      const result = activeDialog?.kind === "form" && activeDialog.id !== null
        ? await updateSupplier(activeDialog.id, record)
        : await createSupplier(record);
      if (!result.success) {
        setFormError(result.error);
        return;
      }

      setActiveDialog(null);
      setFeedback({ kind: "success", message: activeDialog?.kind === "form" && activeDialog.id !== null ? `${name} was updated in MySQL.` : `${name} was added to MySQL.` });
      await refreshSuppliers();
    } catch {
      setFormError("The supplier could not be saved. Check the connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (activeDialog?.kind !== "delete" || !selectedSupplier || deleting) return;
    setDeleting(true);
    setFeedback(null);
    try {
      const result = await deleteSupplier(selectedSupplier.supplier_id);
      if (!result.success) {
        setActiveDialog(null);
        setFeedback({ kind: "error", message: result.error });
        return;
      }
      setActiveDialog(null);
      setFeedback({ kind: "success", message: `${selectedSupplier.name} was deleted from MySQL.` });
      await refreshSuppliers();
    } catch {
      setActiveDialog(null);
      setFeedback({ kind: "error", message: "The supplier could not be deleted. It may be referenced by components or the database may be unavailable." });
    } finally {
      setDeleting(false);
    }
  }

  const columns = [
    {
      key: "supplier_id",
      label: "Supplier ID",
      className: "w-28",
      render: (supplier: SupplierRecord) => <span className="font-mono text-xs text-muted">{supplier.supplier_id}</span>,
    },
    {
      key: "name",
      label: "Supplier",
      render: (supplier: SupplierRecord) => <span className="font-semibold text-ink">{supplier.name}</span>,
    },
    {
      key: "contact_email",
      label: "Email",
      render: (supplier: SupplierRecord) => supplier.contact_email ?? <span className="text-muted">—</span>,
    },
    {
      key: "phone",
      label: "Phone",
      render: (supplier: SupplierRecord) => supplier.phone ?? <span className="text-muted">—</span>,
    },
    {
      key: "address",
      label: "Address",
      className: "max-w-[240px]",
      render: (supplier: SupplierRecord) => <span className="block truncate text-xs text-muted">{supplier.address ?? "—"}</span>,
    },
    {
      key: "actions",
      label: "Actions",
      className: "w-32 text-right",
      render: (supplier: SupplierRecord) => (
        <RowActions
          label="supplier"
          onDelete={() => setActiveDialog({ kind: "delete", id: supplier.supplier_id })}
          onEdit={() => openEdit(supplier)}
          onView={() => setActiveDialog({ kind: "view", id: supplier.supplier_id })}
        />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeading
        action={<Button onClick={openCreate}><span className="text-lg leading-none">+</span>Add supplier</Button>}
        description="Manage the partners that supply components across your product network."
        title="Suppliers"
      />
      <div className="flex flex-wrap items-center gap-2.5 rounded-xl border border-sage bg-sage/45 px-3.5 py-3 text-xs text-forest" role="note">
        <Icon name="database" size={15} />
        <span>Supplier records are read from and saved to MySQL.</span>
      </div>
      {feedback && (
        <div className={`flex items-center justify-between rounded-xl px-4 py-3 text-xs font-medium ${feedback.kind === "success" ? "border border-sage bg-sage/45 text-forest" : "border border-red-200 bg-red-50 text-red-800"}`} role={feedback.kind === "success" ? "status" : "alert"}>
          <span>{feedback.message}</span>
          <button aria-label="Dismiss message" className="ml-3 opacity-70 hover:opacity-100" onClick={() => setFeedback(null)} type="button">
            <Icon name="close" size={15} />
          </button>
        </div>
      )}
      {loadError && (
        <div className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800 sm:flex-row sm:items-center sm:justify-between" role="alert">
          <span>Suppliers could not be loaded: {loadError}</span>
          <Button className="min-h-9 shrink-0" onClick={() => void refreshSuppliers()} size="sm" variant="outline">Retry</Button>
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-3 shadow-card sm:flex-row sm:items-center sm:justify-between sm:p-4">
        <label className="relative block w-full sm:max-w-sm">
          <span className="sr-only">Search suppliers</span>
          <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" name="search" size={16} />
          <Input onChange={(event) => setQuery(event.target.value)} placeholder="Search suppliers" value={query} className="pl-10" />
        </label>
        <p aria-live="polite" className="px-1 text-xs text-muted">{loading ? "Loading suppliers…" : `${filteredSuppliers.length} supplier${filteredSuppliers.length === 1 ? "" : "s"}`}</p>
      </div>

      <DataTable
        columns={columns}
        emptyDescription={loading ? "Loading supplier records from MySQL…" : loadError ? "Retry the database read to view supplier records." : query ? "Try another search term, or clear your search." : "Add your first supplier to start building a traceable network."}
        emptyTitle={loading ? "Loading suppliers" : loadError ? "Supplier records unavailable" : query ? "No suppliers match your search" : "No suppliers yet"}
        rowKey={(supplier) => supplier.supplier_id}
        rows={filteredSuppliers}
        footerLabel="Live MySQL records"
      />

      {activeDialog?.kind === "form" && (
        <Modal
          description="Supplier details are saved to the RecallRadar MySQL database."
          onClose={() => setActiveDialog(null)}
          title={activeDialog.id === null ? "Add supplier" : "Edit supplier"}
        >
          <form className="space-y-4" onSubmit={saveSupplier}>
            <FormField error={formError} htmlFor="supplier-name" label="Supplier name" required>
              <Input autoFocus id="supplier-name" maxLength={150} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="e.g. Northstar Precision Components" required value={draft.name} />
            </FormField>
            <FormField htmlFor="supplier-email" label="Contact email" hint="Optional">
              <Input autoComplete="email" id="supplier-email" maxLength={255} onChange={(event) => setDraft({ ...draft, contact_email: event.target.value })} placeholder="name@company.com" type="email" value={draft.contact_email} />
            </FormField>
            <FormField htmlFor="supplier-phone" label="Phone" hint="Optional">
              <Input autoComplete="tel" id="supplier-phone" maxLength={30} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} placeholder="+1-555-0100" value={draft.phone} />
            </FormField>
            <FormField htmlFor="supplier-address" label="Address" hint="Optional">
              <Input autoComplete="street-address" id="supplier-address" maxLength={255} onChange={(event) => setDraft({ ...draft, address: event.target.value })} placeholder="Street, city, region" value={draft.address} />
            </FormField>
            <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end">
              <Button disabled={saving} onClick={() => setActiveDialog(null)} variant="outline">Cancel</Button>
              <Button disabled={saving} type="submit">{saving ? "Saving…" : activeDialog.id === null ? "Add supplier" : "Save changes"}</Button>
            </div>
          </form>
        </Modal>
      )}

      {activeDialog?.kind === "view" && selectedSupplier && (
        <Modal description="Supplier record" onClose={() => setActiveDialog(null)} title={selectedSupplier.name}>
          <div className="grid gap-3 sm:grid-cols-2">
            <DetailField label="Supplier ID" value={selectedSupplier.supplier_id} />
            <DetailField label="Contact email" value={selectedSupplier.contact_email} />
            <DetailField label="Phone" value={selectedSupplier.phone} />
            <DetailField label="Address" value={selectedSupplier.address} />
          </div>
          <div className="mt-5 flex justify-end">
            <Button onClick={() => openEdit(selectedSupplier)} variant="outline">Edit supplier</Button>
          </div>
        </Modal>
      )}

      {activeDialog?.kind === "delete" && selectedSupplier && (
        <ConfirmDialog
          description={`Delete ${selectedSupplier.name} from MySQL? Related components may prevent deletion.`}
          onClose={() => setActiveDialog(null)}
          onConfirm={confirmDelete}
          title="Delete supplier"
          confirmLabel={deleting ? "Deleting…" : "Delete supplier"}
          pending={deleting}
        />
      )}
    </div>
  );
}
