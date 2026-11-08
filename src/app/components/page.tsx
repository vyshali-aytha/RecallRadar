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
import { Badge, Button, Input, Select } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/icon";
import { useMockData } from "@/lib/mock-data";
import type { ComponentRecord } from "@/lib/mock-data";

type ComponentDraft = {
  name: string;
  category: string;
  supplier_id: string;
};

type ActiveDialog =
  | { kind: "form"; id: number | null }
  | { kind: "view"; id: number }
  | { kind: "delete"; id: number }
  | null;

const emptyDraft: ComponentDraft = { name: "", category: "", supplier_id: "" };

export default function ComponentsPage() {
  const { suppliers, components, bomEntries, componentBatches, addComponent, updateComponent, deleteComponent } = useMockData();
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null);
  const [draft, setDraft] = useState<ComponentDraft>(emptyDraft);
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");

  const categories = useMemo(
    () => [...new Set(components.map((component) => component.category).filter((value): value is string => Boolean(value)))].sort(),
    [components],
  );
  const filteredComponents = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return components.filter((component) => {
      const supplier = suppliers.find((item) => item.supplier_id === component.supplier_id);
      const matchesQuery = !normalized ||
        [component.name, component.category, supplier?.name].some((value) => value?.toLowerCase().includes(normalized));
      const matchesCategory = categoryFilter === "all" || component.category === categoryFilter;
      return matchesQuery && matchesCategory;
    });
  }, [categoryFilter, components, query, suppliers]);

  const selectedComponent = activeDialog
    ? components.find((component) => component.component_id === activeDialog.id)
    : undefined;
  const selectedSupplier = selectedComponent
    ? suppliers.find((supplier) => supplier.supplier_id === selectedComponent.supplier_id)
    : undefined;
  const linkedBom = activeDialog?.kind === "delete"
    ? bomEntries.filter((entry) => entry.component_id === activeDialog.id)
    : [];
  const linkedBatches = activeDialog?.kind === "delete"
    ? componentBatches.filter((batch) => batch.component_id === activeDialog.id)
    : [];
  const blockedReason = linkedBom.length > 0
    ? "This component is used in a product BOM. Remove its BOM entries before deleting the component."
    : linkedBatches.length > 0
      ? "This component has supplier batches. Remove those batches before deleting the component."
      : undefined;

  function openCreate() {
    setDraft({ ...emptyDraft, supplier_id: suppliers[0] ? String(suppliers[0].supplier_id) : "" });
    setFormError("");
    setActiveDialog({ kind: "form", id: null });
  }

  function openEdit(component: ComponentRecord) {
    setDraft({
      name: component.name,
      category: component.category ?? "",
      supplier_id: String(component.supplier_id),
    });
    setFormError("");
    setActiveDialog({ kind: "form", id: component.component_id });
  }

  function saveComponent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = draft.name.trim();
    const supplierId = Number(draft.supplier_id);
    if (!name) {
      setFormError("Enter a component name.");
      return;
    }
    if (!suppliers.some((supplier) => supplier.supplier_id === supplierId)) {
      setFormError("Choose a supplier for this component.");
      return;
    }

    const record = {
      name,
      category: draft.category.trim() || null,
      supplier_id: supplierId,
    };
    if (activeDialog?.kind === "form" && activeDialog.id !== null) {
      updateComponent(activeDialog.id, record);
      setNotice(`${name} was updated in mock data.`);
    } else {
      addComponent(record);
      setNotice(`${name} was added to mock data.`);
    }
    setActiveDialog(null);
  }

  function confirmDelete() {
    if (activeDialog?.kind !== "delete" || blockedReason || !selectedComponent) return;
    deleteComponent(selectedComponent.component_id);
    setNotice(`${selectedComponent.name} was removed from mock data.`);
    setActiveDialog(null);
  }

  const columns = [
    {
      key: "component_id",
      label: "Component ID",
      className: "w-32",
      render: (component: ComponentRecord) => <span className="font-mono text-xs text-muted">{component.component_id}</span>,
    },
    {
      key: "name",
      label: "Component",
      render: (component: ComponentRecord) => <span className="font-semibold text-ink">{component.name}</span>,
    },
    {
      key: "category",
      label: "Category",
      render: (component: ComponentRecord) => component.category ? <Badge tone="sage">{component.category}</Badge> : <span className="text-muted">—</span>,
    },
    {
      key: "supplier",
      label: "Supplier",
      render: (component: ComponentRecord) => suppliers.find((supplier) => supplier.supplier_id === component.supplier_id)?.name ?? <span className="text-red-700">Supplier unavailable</span>,
    },
    {
      key: "actions",
      label: "Actions",
      className: "w-32 text-right",
      render: (component: ComponentRecord) => (
        <RowActions
          label="component"
          onDelete={() => setActiveDialog({ kind: "delete", id: component.component_id })}
          onEdit={() => openEdit(component)}
          onView={() => setActiveDialog({ kind: "view", id: component.component_id })}
        />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeading
        action={<Button disabled={suppliers.length === 0} onClick={openCreate} title={suppliers.length === 0 ? "Add a supplier before adding a component" : undefined}><span className="text-lg leading-none">+</span>Add component</Button>}
        description="Track the parts and materials that flow from suppliers into finished products."
        title="Components"
      />
      <MockDataNotice />
      {notice && (
        <div className="flex items-center justify-between rounded-xl border border-sage bg-sage/45 px-4 py-3 text-xs font-medium text-forest" role="status">
          <span>{notice}</span>
          <button aria-label="Dismiss message" className="ml-3 text-forest/70 hover:text-forest" onClick={() => setNotice("")} type="button"><Icon name="close" size={15} /></button>
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-3 shadow-card sm:flex-row sm:items-center sm:p-4">
        <label className="relative block w-full sm:max-w-sm">
          <span className="sr-only">Search components</span>
          <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" name="search" size={16} />
          <Input className="pl-10" onChange={(event) => setQuery(event.target.value)} placeholder="Search component or supplier" value={query} />
        </label>
        <label className="block w-full sm:ml-auto sm:max-w-[230px]">
          <span className="sr-only">Filter by component category</span>
          <Select onChange={(event) => setCategoryFilter(event.target.value)} value={categoryFilter}>
            <option value="all">All categories</option>
            {categories.map((category) => <option key={category} value={category}>{category}</option>)}
          </Select>
        </label>
        <p className="px-1 text-xs text-muted sm:ml-1">{filteredComponents.length} component{filteredComponents.length === 1 ? "" : "s"}</p>
      </div>

      <DataTable
        columns={columns}
        emptyDescription={query || categoryFilter !== "all" ? "Adjust your search or choose another category." : "Add a component and link it to its supplier."}
        emptyTitle={query || categoryFilter !== "all" ? "No components match these filters" : "No components yet"}
        rowKey={(component) => component.component_id}
        rows={filteredComponents}
      />

      {activeDialog?.kind === "form" && (
        <Modal description="Every component must be assigned to a supplier." onClose={() => setActiveDialog(null)} title={activeDialog.id === null ? "Add component" : "Edit component"}>
          <form className="space-y-4" onSubmit={saveComponent}>
            <FormField error={formError && !draft.name.trim() ? formError : undefined} htmlFor="component-name" label="Component name" required>
              <Input autoFocus id="component-name" maxLength={150} onChange={(event) => { setDraft({ ...draft, name: event.target.value }); setFormError(""); }} placeholder="e.g. Temperature Sensor" required value={draft.name} />
            </FormField>
            <FormField htmlFor="component-category" label="Category" hint="Optional">
              <Input id="component-category" maxLength={100} onChange={(event) => setDraft({ ...draft, category: event.target.value })} placeholder="e.g. Sensors" value={draft.category} />
            </FormField>
            <FormField error={formError.includes("supplier") ? formError : undefined} htmlFor="component-supplier" label="Supplier" required>
              <Select id="component-supplier" onChange={(event) => { setDraft({ ...draft, supplier_id: event.target.value }); setFormError(""); }} required value={draft.supplier_id}>
                <option value="">Choose supplier</option>
                {suppliers.map((supplier) => <option key={supplier.supplier_id} value={supplier.supplier_id}>{supplier.name}</option>)}
              </Select>
            </FormField>
            {formError && !formError.includes("supplier") && draft.name.trim() && <p className="text-xs font-medium text-red-700" role="alert">{formError}</p>}
            <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end">
              <Button onClick={() => setActiveDialog(null)} variant="outline">Cancel</Button>
              <Button disabled={suppliers.length === 0} type="submit">{activeDialog.id === null ? "Add component" : "Save changes"}</Button>
            </div>
          </form>
        </Modal>
      )}

      {activeDialog?.kind === "view" && selectedComponent && (
        <Modal description="Component and supplier record" onClose={() => setActiveDialog(null)} title={selectedComponent.name}>
          <div className="grid gap-3 sm:grid-cols-2">
            <DetailField label="Component ID" value={selectedComponent.component_id} />
            <DetailField label="Category" value={selectedComponent.category} />
            <DetailField label="Supplier" value={selectedSupplier?.name} />
            <DetailField label="Supplier email" value={selectedSupplier?.contact_email} />
          </div>
          <div className="mt-5 flex justify-end">
            <Button onClick={() => openEdit(selectedComponent)} variant="outline">Edit component</Button>
          </div>
        </Modal>
      )}

      {activeDialog?.kind === "delete" && selectedComponent && (
        <ConfirmDialog
          blockedReason={blockedReason}
          description={`Delete ${selectedComponent.name}? This action removes the component from temporary mock data.`}
          onClose={() => setActiveDialog(null)}
          onConfirm={confirmDelete}
          title="Delete component"
        />
      )}
    </div>
  );
}
