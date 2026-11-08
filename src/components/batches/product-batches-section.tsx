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
import type { ProductBatch } from "@/lib/mock-data";

type ProductBatchDraft = {
  batch_number: string;
  production_date: string;
  quantity_produced: string;
  status: string;
  product_id: string;
};

type ActiveDialog =
  | { kind: "form"; id: number | null }
  | { kind: "view"; id: number }
  | { kind: "delete"; id: number }
  | null;

const statusOptions = ["active", "quarantined", "depleted"];
const emptyDraft: ProductBatchDraft = {
  batch_number: "",
  production_date: "",
  quantity_produced: "0",
  status: "active",
  product_id: "",
};

export function ProductBatchesSection() {
  const { products, productBatches, batchCompositions, inventoryRecords, shipments, recallImpacts, addProductBatch, updateProductBatch, deleteProductBatch } = useMockData();
  const [query, setQuery] = useState("");
  const [productFilter, setProductFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null);
  const [draft, setDraft] = useState<ProductBatchDraft>(emptyDraft);
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");

  const filteredBatches = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return productBatches.filter((batch) => {
      const product = products.find((item) => item.product_id === batch.product_id);
      const matchesQuery = !normalized || [batch.batch_number, product?.name, product?.sku].some((value) => value?.toLowerCase().includes(normalized));
      const matchesProduct = productFilter === "all" || String(batch.product_id) === productFilter;
      const matchesStatus = statusFilter === "all" || batch.status === statusFilter;
      return matchesQuery && matchesProduct && matchesStatus;
    });
  }, [productBatches, productFilter, products, query, statusFilter]);

  const selectedBatch = activeDialog
    ? productBatches.find((batch) => batch.product_batch_id === activeDialog.id)
    : undefined;
  const selectedProduct = selectedBatch
    ? products.find((product) => product.product_id === selectedBatch.product_id)
    : undefined;
  const linkedCompositions = activeDialog?.kind === "delete"
    ? batchCompositions.filter((entry) => entry.product_batch_id === activeDialog.id)
    : [];
  const referencedByInventory = activeDialog?.kind === "delete" && inventoryRecords.some((entry) => entry.product_batch_id === activeDialog.id);
  const referencedByShipment = activeDialog?.kind === "delete" && shipments.some((entry) => entry.product_batch_id === activeDialog.id);
  const referencedByRecallImpact = activeDialog?.kind === "delete" && recallImpacts.some((entry) => entry.product_batch_id === activeDialog.id);
  const blockedReason = linkedCompositions.length > 0
    ? "This product batch has component composition entries. Remove those entries before deleting the product batch."
    : referencedByInventory
      ? "This product batch is referenced by inventory records. Remove those records before deleting the product batch."
      : referencedByShipment
        ? "This product batch is referenced by shipments. Remove those shipments before deleting the product batch."
        : referencedByRecallImpact
          ? "This product batch is referenced by recall impact records. Remove those impacts before deleting the product batch."
          : undefined;

  function openCreate() {
    setDraft({ ...emptyDraft, product_id: products[0] ? String(products[0].product_id) : "" });
    setFormError("");
    setActiveDialog({ kind: "form", id: null });
  }

  function openEdit(batch: ProductBatch) {
    setDraft({
      batch_number: batch.batch_number,
      production_date: batch.production_date ?? "",
      quantity_produced: String(batch.quantity_produced),
      status: batch.status,
      product_id: String(batch.product_id),
    });
    setFormError("");
    setActiveDialog({ kind: "form", id: batch.product_batch_id });
  }

  function saveBatch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const batchNumber = draft.batch_number.trim();
    const productId = Number(draft.product_id);
    const quantity = Number(draft.quantity_produced);
    if (!batchNumber) {
      setFormError("Batch number is required.");
      return;
    }
    if (!products.some((product) => product.product_id === productId)) {
      setFormError("Choose a product for this batch.");
      return;
    }
    if (!Number.isInteger(quantity) || quantity < 0 || quantity > 2147483647) {
      setFormError("Quantity produced must be a whole number greater than or equal to zero.");
      return;
    }
    const duplicate = productBatches.some((batch) =>
      batch.product_id === productId &&
      batch.batch_number.toLocaleLowerCase() === batchNumber.toLocaleLowerCase() &&
      batch.product_batch_id !== (activeDialog?.kind === "form" ? activeDialog.id : null),
    );
    if (duplicate) {
      setFormError("That batch number already exists for the selected product.");
      return;
    }

    const record = {
      batch_number: batchNumber,
      production_date: draft.production_date || null,
      quantity_produced: quantity,
      status: draft.status.trim() || "active",
      product_id: productId,
    };
    if (activeDialog?.kind === "form" && activeDialog.id !== null) {
      updateProductBatch(activeDialog.id, record);
      setNotice(`${batchNumber} was updated in mock data.`);
    } else {
      addProductBatch(record);
      setNotice(`${batchNumber} was added to mock data.`);
    }
    setActiveDialog(null);
  }

  function confirmDelete() {
    if (activeDialog?.kind !== "delete" || blockedReason || !selectedBatch) return;
    if (!deleteProductBatch(selectedBatch.product_batch_id)) return;
    setNotice(`${selectedBatch.batch_number} was removed from mock data.`);
    setActiveDialog(null);
  }

  const columns = [
    {
      key: "product_batch_id",
      label: "Batch ID",
      className: "w-20",
      render: (batch: ProductBatch) => <span className="font-mono text-xs text-muted">{batch.product_batch_id}</span>,
    },
    {
      key: "batch_number",
      label: "Batch number",
      render: (batch: ProductBatch) => <span className="font-mono text-xs font-semibold tracking-wide text-ink">{batch.batch_number}</span>,
    },
    {
      key: "product",
      label: "Product",
      render: (batch: ProductBatch) => products.find((product) => product.product_id === batch.product_id)?.name ?? <span className="text-red-700">Product unavailable</span>,
    },
    {
      key: "production_date",
      label: "Production date",
      render: (batch: ProductBatch) => batch.production_date ?? <span className="text-muted">—</span>,
    },
    {
      key: "quantity_produced",
      label: "Qty produced",
      className: "w-28 text-right",
      render: (batch: ProductBatch) => <span className="font-mono text-xs">{batch.quantity_produced.toLocaleString()}</span>,
    },
    {
      key: "status",
      label: "Status",
      render: (batch: ProductBatch) => <BatchStatusBadge status={batch.status} />,
    },
    {
      key: "actions",
      label: "Actions",
      className: "w-32 text-right",
      render: (batch: ProductBatch) => (
        <RowActions
          label="product batch"
          onDelete={() => setActiveDialog({ kind: "delete", id: batch.product_batch_id })}
          onEdit={() => openEdit(batch)}
          onView={() => setActiveDialog({ kind: "view", id: batch.product_batch_id })}
        />
      ),
    },
  ];

  return (
    <section aria-labelledby="product-batches-heading" className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted">Finished goods</p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight text-ink" id="product-batches-heading">Product batches</h2>
          <p className="mt-1 text-xs text-muted">Track production lots for each product in the catalog.</p>
        </div>
        <Button disabled={products.length === 0} onClick={openCreate} title={products.length === 0 ? "Add a product before creating a batch" : undefined}>
          <span className="text-lg leading-none">+</span>Add product batch
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
          <span className="sr-only">Search product batches</span>
          <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" name="search" size={16} />
          <Input className="pl-10" onChange={(event) => setQuery(event.target.value)} placeholder="Search batch or product" value={query} />
        </label>
        <label className="block w-full sm:max-w-[220px]">
          <span className="sr-only">Filter product batches by product</span>
          <Select onChange={(event) => setProductFilter(event.target.value)} value={productFilter}>
            <option value="all">All products</option>
            {products.map((product) => <option key={product.product_id} value={product.product_id}>{product.name}</option>)}
          </Select>
        </label>
        <label className="block w-full sm:max-w-[170px]">
          <span className="sr-only">Filter product batches by status</span>
          <Select onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}>
            <option value="all">All statuses</option>
            {statusOptions.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}
          </Select>
        </label>
        <span className="px-1 text-xs text-muted sm:ml-auto">{filteredBatches.length} batches</span>
      </div>

      <DataTable
        columns={columns}
        emptyDescription={query || productFilter !== "all" || statusFilter !== "all" ? "Try another search or adjust the filters." : "Add a product batch to record a production run."}
        emptyTitle={query || productFilter !== "all" || statusFilter !== "all" ? "No batches match these filters" : "No product batches yet"}
        rowKey={(batch) => batch.product_batch_id}
        rows={filteredBatches}
      />

      {activeDialog?.kind === "form" && (
        <Modal description="Batch number is unique within its selected product." onClose={() => setActiveDialog(null)} title={activeDialog.id === null ? "Add product batch" : "Edit product batch"}>
          <form className="space-y-4" onSubmit={saveBatch}>
            <FormField error={formError.includes("Batch number") || formError.includes("already exists") ? formError : undefined} htmlFor="product-batch-number" label="Batch number" required>
              <Input autoFocus id="product-batch-number" maxLength={100} onChange={(event) => { setDraft({ ...draft, batch_number: event.target.value }); setFormError(""); }} placeholder="e.g. FGVM-2026-0915-A" required value={draft.batch_number} />
            </FormField>
            <FormField error={formError.includes("product") ? formError : undefined} htmlFor="product-batch-product" label="Product" required>
              <Select id="product-batch-product" onChange={(event) => { setDraft({ ...draft, product_id: event.target.value }); setFormError(""); }} required value={draft.product_id}>
                <option value="">Choose product</option>
                {products.map((product) => <option key={product.product_id} value={product.product_id}>{product.name}</option>)}
              </Select>
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField htmlFor="product-batch-production-date" label="Production date" hint="Optional">
                <Input id="product-batch-production-date" onChange={(event) => setDraft({ ...draft, production_date: event.target.value })} type="date" value={draft.production_date} />
              </FormField>
              <FormField error={formError.includes("Quantity") ? formError : undefined} htmlFor="product-batch-quantity" label="Quantity produced" required>
                <Input id="product-batch-quantity" min="0" onChange={(event) => { setDraft({ ...draft, quantity_produced: event.target.value }); setFormError(""); }} required step="1" type="number" value={draft.quantity_produced} />
              </FormField>
            </div>
            <FormField htmlFor="product-batch-status" label="Status" required>
              <Select id="product-batch-status" onChange={(event) => setDraft({ ...draft, status: event.target.value })} required value={draft.status}>
                {!statusOptions.includes(draft.status) && <option value={draft.status}>{draft.status}</option>}
                {statusOptions.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}
              </Select>
            </FormField>
            {formError && !formError.includes("Batch number") && !formError.includes("already exists") && !formError.includes("product") && !formError.includes("Quantity") && <p className="text-xs font-medium text-red-700" role="alert">{formError}</p>}
            <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end">
              <Button onClick={() => setActiveDialog(null)} variant="outline">Cancel</Button>
              <Button disabled={products.length === 0} type="submit">{activeDialog.id === null ? "Add batch" : "Save changes"}</Button>
            </div>
          </form>
        </Modal>
      )}

      {activeDialog?.kind === "view" && selectedBatch && (
        <Modal description="Product batch record" onClose={() => setActiveDialog(null)} title={selectedBatch.batch_number}>
          <div className="grid gap-3 sm:grid-cols-2">
            <DetailField label="Product batch ID" value={selectedBatch.product_batch_id} />
            <DetailField label="Product" value={selectedProduct?.name} />
            <DetailField label="Production date" value={selectedBatch.production_date} />
            <DetailField label="Quantity produced" value={selectedBatch.quantity_produced} />
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
          description={`Delete product batch ${selectedBatch.batch_number}? This removes it from temporary mock data.`}
          onClose={() => setActiveDialog(null)}
          onConfirm={confirmDelete}
          title="Delete product batch"
        />
      )}
    </section>
  );
}
