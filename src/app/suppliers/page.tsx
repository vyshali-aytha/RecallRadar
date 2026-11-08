"use client";

import { useMemo, useState } from "react";
import { ConfirmDialog } from "@/components/crud/confirm-dialog";
import { DataTable } from "@/components/crud/data-table";
import { DetailField } from "@/components/crud/detail-field";
import { FormField } from "@/components/crud/form-field";
import { Modal } from "@/components/crud/modal";
import { MockDataNotice } from "@/components/crud/mock-data-notice";
import { PageHeading } from "@/components/crud/page-heading";
import { RowActions } from "@/components/crud/row-actions";
import { Button, Input } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/icon";
import { useMockData } from "@/lib/mock-data";
import type { Supplier } from "@/lib/mock-data";

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
  const { suppliers, components, addSupplier, updateSupplier, deleteSupplier } = useMockData();
  const [query, setQuery] = useState("");
  const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null);
  const [draft, setDraft] = useState<SupplierDraft>(emptyDraft);
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");

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
  const linkedComponents = activeDialog?.kind === "delete"
    ? components.filter((component) => component.supplier_id === activeDialog.id)
    : [];
  const blockedReason = linkedComponents.length > 0
    ? `This supplier is assigned to ${linkedComponents.map((component) => component.name).join(", ")}. Reassign or remove those components before deleting the supplier.`
    : undefined;

  function openCreate() {
    setDraft(emptyDraft);
    setFormError("");
    setActiveDialog({ kind: "form", id: null });
  }

  function openEdit(supplier: Supplier) {
    setDraft({
      name: supplier.name,
      contact_email: supplier.contact_email ?? "",
      phone: supplier.phone ?? "",
      address: supplier.address ?? "",
    });
    setFormError("");
    setActiveDialog({ kind: "form", id: supplier.supplier_id });
  }

  function saveSupplier(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = draft.name.trim();
    if (!name) {
      setFormError("Enter a supplier name.");
      return;
    }

    const record = {
      name,
      contact_email: optionalValue(draft.contact_email),
      phone: optionalValue(draft.phone),
      address: optionalValue(draft.address),
    };

    if (activeDialog?.kind === "form" && activeDialog.id !== null) {
      updateSupplier(activeDialog.id, record);
      setNotice(`${name} was updated in mock data.`);
    } else {
      addSupplier(record);
      setNotice(`${name} was added to mock data.`);
    }
    setActiveDialog(null);
  }

  function confirmDelete() {
    if (activeDialog?.kind !== "delete" || blockedReason || !selectedSupplier) return;
    deleteSupplier(selectedSupplier.supplier_id);
    setNotice(`${selectedSupplier.name} was removed from mock data.`);
    setActiveDialog(null);
  }

  const columns = [
    {
      key: "supplier_id",
      label: "Supplier ID",
      className: "w-28",
      render: (supplier: Supplier) => <span className="font-mono text-xs text-muted">{supplier.supplier_id}</span>,
    },
    {
      key: "name",
      label: "Supplier",
      render: (supplier: Supplier) => <span className="font-semibold text-ink">{supplier.name}</span>,
    },
    {
      key: "contact_email",
      label: "Email",
      render: (supplier: Supplier) => supplier.contact_email ?? <span className="text-muted">—</span>,
    },
    {
      key: "phone",
      label: "Phone",
      render: (supplier: Supplier) => supplier.phone ?? <span className="text-muted">—</span>,
    },
    {
      key: "address",
      label: "Address",
      className: "max-w-[240px]",
      render: (supplier: Supplier) => <span className="block truncate text-xs text-muted">{supplier.address ?? "—"}</span>,
    },
    {
      key: "actions",
      label: "Actions",
      className: "w-32 text-right",
      render: (supplier: Supplier) => (
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
      <MockDataNotice />
      {notice && (
        <div className="flex items-center justify-between rounded-xl border border-sage bg-sage/45 px-4 py-3 text-xs font-medium text-forest" role="status">
          <span>{notice}</span>
          <button aria-label="Dismiss message" className="ml-3 text-forest/70 hover:text-forest" onClick={() => setNotice("")} type="button">
            <Icon name="close" size={15} />
          </button>
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-3 shadow-card sm:flex-row sm:items-center sm:justify-between sm:p-4">
        <label className="relative block w-full sm:max-w-sm">
          <span className="sr-only">Search suppliers</span>
          <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" name="search" size={16} />
          <Input onChange={(event) => setQuery(event.target.value)} placeholder="Search suppliers" value={query} className="pl-10" />
        </label>
        <p className="px-1 text-xs text-muted">{filteredSuppliers.length} supplier{filteredSuppliers.length === 1 ? "" : "s"}</p>
      </div>

      <DataTable
        columns={columns}
        emptyDescription={query ? "Try another search term, or clear your search." : "Add your first supplier to start building a traceable network."}
        emptyTitle={query ? "No suppliers match your search" : "No suppliers yet"}
        rowKey={(supplier) => supplier.supplier_id}
        rows={filteredSuppliers}
      />

      {activeDialog?.kind === "form" && (
        <Modal
          description="Supplier details are kept in temporary mock data during this preview."
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
              <Button onClick={() => setActiveDialog(null)} variant="outline">Cancel</Button>
              <Button type="submit">{activeDialog.id === null ? "Add supplier" : "Save changes"}</Button>
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
          blockedReason={blockedReason}
          description={`Delete ${selectedSupplier.name}? This action removes the record from temporary mock data.`}
          onClose={() => setActiveDialog(null)}
          onConfirm={confirmDelete}
          title="Delete supplier"
        />
      )}
    </div>
  );
}
