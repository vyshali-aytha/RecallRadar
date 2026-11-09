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
import {
  createProductBatch,
  deleteProductBatch,
  getAllProductBatches,
  getAllProducts,
  updateProductBatch,
} from "@/lib/member-a-actions";
import type { ProductBatchInput, ProductBatchRecord, ProductRecord } from "@/lib/member-a-types";

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
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [productBatches, setProductBatches] = useState<ProductBatchRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [productFilter, setProductFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null);
  const [draft, setDraft] = useState<ProductBatchDraft>(emptyDraft);
  const [formError, setFormError] = useState("");
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; message: string } | null>(null);

  const refreshRecords = useCallback(async () => {
    setLoading(true);
    try {
      const [batchResult, productResult] = await Promise.all([getAllProductBatches(), getAllProducts()]);
      const errors: string[] = [];
      if (batchResult.success) setProductBatches(batchResult.data);
      else errors.push(`Product batches: ${batchResult.error}`);
      if (productResult.success) setProducts(productResult.data);
      else errors.push(`Products: ${productResult.error}`);
      setLoadError(errors.join(" "));
    } catch {
      setLoadError("Product batches and product options could not be loaded. Check the database connection and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void refreshRecords(); }, 0);
    return () => window.clearTimeout(timer);
  }, [refreshRecords]);

  const statuses = useMemo(
    () => [...new Set([...statusOptions, ...productBatches.map((batch) => batch.status)])].sort(),
    [productBatches],
  );

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

  function openCreate() {
    setDraft({ ...emptyDraft, product_id: products[0] ? String(products[0].product_id) : "" });
    setFormError("");
    setFeedback(null);
    setActiveDialog({ kind: "form", id: null });
  }

  function openEdit(batch: ProductBatchRecord) {
    setDraft({
      batch_number: batch.batch_number,
      production_date: batch.production_date ?? "",
      quantity_produced: String(batch.quantity_produced),
      status: batch.status,
      product_id: String(batch.product_id),
    });
    setFormError("");
    setFeedback(null);
    setActiveDialog({ kind: "form", id: batch.product_batch_id });
  }

  async function saveBatch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || activeDialog?.kind !== "form") return;
    const batchNumber = draft.batch_number.trim();
    const productId = Number(draft.product_id);
    const quantity = Number(draft.quantity_produced);
    if (!batchNumber) {
      setFormError("Batch number is required.");
      return;
    }
    if (!products.some((product) => product.product_id === productId)) {
      setFormError("Choose a valid product from the database.");
      return;
    }
    if (!Number.isInteger(quantity) || quantity < 0 || quantity > 2147483647) {
      setFormError("Quantity produced must be a whole number from 0 to 2,147,483,647.");
      return;
    }
    const duplicate = productBatches.some((batch) =>
      batch.product_id === productId &&
      batch.batch_number.toLocaleLowerCase() === batchNumber.toLocaleLowerCase() &&
      batch.product_batch_id !== activeDialog.id,
    );
    if (duplicate) {
      setFormError("That batch number already exists for the selected product.");
      return;
    }

    const record: ProductBatchInput = {
      batch_number: batchNumber,
      production_date: draft.production_date || null,
      quantity_produced: quantity,
      status: draft.status.trim() || "active",
      product_id: productId,
    };
    setSaving(true);
    setFormError("");
    setFeedback(null);
    try {
      const editId = activeDialog.id;
      const result = editId === null
        ? await createProductBatch(record)
        : await updateProductBatch(editId, record);
      if (!result.success) {
        setFormError(result.error);
        return;
      }
      setActiveDialog(null);
      setFeedback({ kind: "success", message: editId === null ? `${batchNumber} was added to MySQL.` : `${batchNumber} was updated in MySQL.` });
      await refreshRecords();
    } catch {
      setFormError("The product batch could not be saved. Check the database connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (activeDialog?.kind !== "delete" || !selectedBatch || deleting) return;
    setDeleting(true);
    setFeedback(null);
    try {
      const result = await deleteProductBatch(selectedBatch.product_batch_id);
      if (!result.success) {
        setActiveDialog(null);
        setFeedback({ kind: "error", message: result.error });
        return;
      }
      setActiveDialog(null);
      setFeedback({ kind: "success", message: `${selectedBatch.batch_number} was deleted from MySQL.` });
      await refreshRecords();
    } catch {
      setActiveDialog(null);
      setFeedback({ kind: "error", message: "The product batch could not be deleted. Related composition, inventory, shipment or recall records may reference it." });
    } finally {
      setDeleting(false);
    }
  }

  const columns = [
    {
      key: "product_batch_id",
      label: "Batch ID",
      className: "w-20",
      render: (batch: ProductBatchRecord) => <span className="font-mono text-xs text-muted">{batch.product_batch_id}</span>,
    },
    {
      key: "batch_number",
      label: "Batch number",
      render: (batch: ProductBatchRecord) => <span className="font-mono text-xs font-semibold tracking-wide text-ink">{batch.batch_number}</span>,
    },
    {
      key: "product",
      label: "Product",
      render: (batch: ProductBatchRecord) => products.find((product) => product.product_id === batch.product_id)?.name ?? <span className="text-red-700">Product unavailable</span>,
    },
    {
      key: "production_date",
      label: "Production date",
      render: (batch: ProductBatchRecord) => batch.production_date ?? <span className="text-muted">—</span>,
    },
    {
      key: "quantity_produced",
      label: "Qty produced",
      className: "w-28 text-right",
      render: (batch: ProductBatchRecord) => <span className="font-mono text-xs">{batch.quantity_produced.toLocaleString()}</span>,
    },
    {
      key: "status",
      label: "Status",
      render: (batch: ProductBatchRecord) => <BatchStatusBadge status={batch.status} />,
    },
    {
      key: "actions",
      label: "Actions",
      className: "w-32 text-right",
      render: (batch: ProductBatchRecord) => (
        <RowActions
          label="product batch"
          onDelete={() => { setFeedback(null); setActiveDialog({ kind: "delete", id: batch.product_batch_id }); }}
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
        <Button disabled={loading || Boolean(loadError) || products.length === 0} onClick={openCreate} title={products.length === 0 ? "Add a product before creating a batch" : undefined}>
          <span className="text-lg leading-none">+</span>Add product batch
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2.5 rounded-xl border border-sage bg-sage/45 px-3.5 py-3 text-xs text-forest" role="note">
        <Icon name="database" size={15} />
        <span>Product batches and product options are loaded from MySQL.</span>
      </div>
      {feedback && (
        <div className={`flex items-center justify-between rounded-xl px-4 py-3 text-xs font-medium ${feedback.kind === "success" ? "border border-sage bg-sage/45 text-forest" : "border border-red-200 bg-red-50 text-red-800"}`} role={feedback.kind === "success" ? "status" : "alert"}>
          <span>{feedback.message}</span>
          <button aria-label="Dismiss message" className="ml-3 opacity-70 hover:opacity-100" onClick={() => setFeedback(null)} type="button"><Icon name="close" size={15} /></button>
        </div>
      )}
      {loadError && (
        <div className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800 sm:flex-row sm:items-center sm:justify-between" role="alert">
          <span>Product batch data could not be loaded: {loadError}</span>
          <Button className="min-h-9 shrink-0" disabled={loading} onClick={() => void refreshRecords()} size="sm" variant="outline">{loading ? "Loading…" : "Retry"}</Button>
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
            {statuses.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}
          </Select>
        </label>
        <span aria-live="polite" className="px-1 text-xs text-muted sm:ml-auto">{loading ? "Loading batches…" : `${filteredBatches.length} batches`}</span>
      </div>

      <DataTable
        columns={columns}
        emptyDescription={loading ? "Loading product batches from MySQL…" : loadError ? "Retry to load product batches and products from MySQL." : query || productFilter !== "all" || statusFilter !== "all" ? "Try another search or adjust the filters." : "Add a product batch to record a production run."}
        emptyTitle={loading ? "Loading product batches" : loadError ? "Product batches unavailable" : query || productFilter !== "all" || statusFilter !== "all" ? "No batches match these filters" : "No product batches yet"}
        rowKey={(batch) => batch.product_batch_id}
        rows={filteredBatches}
        footerLabel="Live MySQL records"
      />

      {activeDialog?.kind === "form" && (
        <Modal description="Batch number is unique within its selected product." onClose={() => !saving && setActiveDialog(null)} title={activeDialog.id === null ? "Add product batch" : "Edit product batch"}>
          <form className="space-y-4" onSubmit={saveBatch}>
            <FormField error={formError.toLowerCase().includes("batch number") || formError.includes("unique") ? formError : undefined} htmlFor="product-batch-number" label="Batch number" required>
              <Input autoFocus id="product-batch-number" maxLength={100} onChange={(event) => { setDraft({ ...draft, batch_number: event.target.value }); setFormError(""); }} placeholder="e.g. FGVM-2026-0915-A" required value={draft.batch_number} />
            </FormField>
            <FormField error={formError.toLowerCase().includes("product") || formError.includes("related record") ? formError : undefined} htmlFor="product-batch-product" label="Product" required>
              <Select id="product-batch-product" disabled={loading || products.length === 0} onChange={(event) => { setDraft({ ...draft, product_id: event.target.value }); setFormError(""); }} required value={draft.product_id}>
                <option value="">{loading ? "Loading products…" : "Choose product"}</option>
                {products.map((product) => <option key={product.product_id} value={product.product_id}>{product.name}</option>)}
              </Select>
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField htmlFor="product-batch-production-date" label="Production date" hint="Optional">
                <Input id="product-batch-production-date" onChange={(event) => setDraft({ ...draft, production_date: event.target.value })} type="date" value={draft.production_date} />
              </FormField>
              <FormField error={formError.includes("Quantity") ? formError : undefined} htmlFor="product-batch-quantity" label="Quantity produced" required>
                <Input id="product-batch-quantity" max="2147483647" min="0" onChange={(event) => { setDraft({ ...draft, quantity_produced: event.target.value }); setFormError(""); }} required step="1" type="number" value={draft.quantity_produced} />
              </FormField>
            </div>
            <FormField error={formError.includes("Status") ? formError : undefined} htmlFor="product-batch-status" label="Status" required>
              <Input id="product-batch-status" maxLength={30} onChange={(event) => { setDraft({ ...draft, status: event.target.value }); setFormError(""); }} required value={draft.status} />
            </FormField>
            {formError && !formError.toLowerCase().includes("batch number") && !formError.includes("unique") && !formError.toLowerCase().includes("product") && !formError.includes("related record") && !formError.includes("Quantity") && !formError.includes("Status") && <p className="text-xs font-medium text-red-700" role="alert">{formError}</p>}
            <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end">
              <Button disabled={saving} onClick={() => setActiveDialog(null)} variant="outline">Cancel</Button>
              <Button disabled={saving || loading || Boolean(loadError) || products.length === 0} type="submit">{saving ? "Saving…" : activeDialog.id === null ? "Add batch" : "Save changes"}</Button>
            </div>
          </form>
        </Modal>
      )}

      {activeDialog?.kind === "view" && selectedBatch && (
        <Modal description="Product batch record" onClose={() => setActiveDialog(null)} title={selectedBatch.batch_number}>
          <div className="grid gap-3 sm:grid-cols-2">
            <DetailField label="Product batch ID" value={selectedBatch.product_batch_id} />
            <DetailField label="Product" value={selectedProduct?.name ?? "Product unavailable"} />
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
          description={`Delete product batch ${selectedBatch.batch_number} from MySQL? Related composition, inventory, shipment or recall records may prevent deletion.`}
          onClose={() => !deleting && setActiveDialog(null)}
          onConfirm={() => void confirmDelete()}
          title="Delete product batch"
          confirmLabel={deleting ? "Deleting…" : "Delete product batch"}
          pending={deleting}
        />
      )}
    </section>
  );
}
