"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ConfirmDialog } from "@/components/crud/confirm-dialog";
import { DataTable } from "@/components/crud/data-table";
import { DetailField } from "@/components/crud/detail-field";
import { FormField } from "@/components/crud/form-field";
import { Modal } from "@/components/crud/modal";
import { Button, Input, Select } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/icon";
import {
  createProductBatchComponent,
  deleteProductBatchComponent,
  getAllComponentBatches,
  getAllComponents,
  getAllProductBatchComponents,
  getAllProductBatches,
  getAllProducts,
  updateProductBatchComponent,
} from "@/lib/member-a-actions";
import type {
  ComponentBatchRecord,
  ComponentRecord,
  ProductBatchComponentInput,
  ProductBatchComponentRecord,
  ProductBatchRecord,
  ProductRecord,
} from "@/lib/member-a-types";
import { notifyApplicationDataChanged } from "@/lib/member-b-client";

type ActiveDialog =
  | { kind: "add" }
  | { kind: "edit"; productBatchId: number; componentBatchId: number }
  | { kind: "delete"; productBatchId: number; componentBatchId: number }
  | null;

type CompositionRow = ProductBatchComponentRecord & {
  productName: string;
  productBatchNumber: string;
  componentName: string;
  componentBatchNumber: string;
};

const quantityLimit = 9999999999.99;

function compositionKey(productBatchId: number, componentBatchId: number) {
  return `${productBatchId}:${componentBatchId}`;
}

function productBatchLabel(productName: string | undefined, batchNumber: string) {
  return `${productName ?? "Unknown product"} — ${batchNumber}`;
}

function componentBatchLabel(componentName: string | undefined, batchNumber: string) {
  return `${componentName ?? "Unknown component"} — ${batchNumber}`;
}

function isValidQuantity(value: string) {
  return /^\d{1,10}(?:\.\d{1,2})?$/.test(value.trim()) && Number(value) > 0;
}

function formatQuantity(value: string | number) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(2) : String(value);
}

export function BatchCompositionSection() {
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [components, setComponents] = useState<ComponentRecord[]>([]);
  const [productBatches, setProductBatches] = useState<ProductBatchRecord[]>([]);
  const [componentBatches, setComponentBatches] = useState<ComponentBatchRecord[]>([]);
  const [batchCompositions, setBatchCompositions] = useState<ProductBatchComponentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [productBatchFilter, setProductBatchFilter] = useState("all");
  const [componentBatchFilter, setComponentBatchFilter] = useState("all");
  const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null);
  const [productBatchId, setProductBatchId] = useState("");
  const [componentBatchId, setComponentBatchId] = useState("");
  const [quantityUsed, setQuantityUsed] = useState("1.00");
  const [editQuantity, setEditQuantity] = useState("");
  const [formError, setFormError] = useState("");
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; message: string } | null>(null);

  const refreshRecords = useCallback(async () => {
    setLoading(true);
    try {
      const [compositionResult, productBatchResult, componentBatchResult, productResult, componentResult] = await Promise.all([
        getAllProductBatchComponents(),
        getAllProductBatches(),
        getAllComponentBatches(),
        getAllProducts(),
        getAllComponents(),
      ]);
      const errors: string[] = [];
      if (compositionResult.success) setBatchCompositions(compositionResult.data);
      else errors.push(`Compositions: ${compositionResult.error}`);
      if (productBatchResult.success) setProductBatches(productBatchResult.data);
      else errors.push(`Product batches: ${productBatchResult.error}`);
      if (componentBatchResult.success) setComponentBatches(componentBatchResult.data);
      else errors.push(`Component batches: ${componentBatchResult.error}`);
      if (productResult.success) setProducts(productResult.data);
      else errors.push(`Products: ${productResult.error}`);
      if (componentResult.success) setComponents(componentResult.data);
      else errors.push(`Components: ${componentResult.error}`);
      setLoadError(errors.join(" "));
    } catch {
      setLoadError("Composition and batch details could not be loaded. Check the database connection and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void refreshRecords(); }, 0);
    return () => window.clearTimeout(timer);
  }, [refreshRecords]);

  const rows = useMemo<CompositionRow[]>(() => batchCompositions.map((entry) => {
    const productBatch = productBatches.find((batch) => batch.product_batch_id === entry.product_batch_id);
    const componentBatch = componentBatches.find((batch) => batch.component_batch_id === entry.component_batch_id);
    const product = productBatch ? products.find((item) => item.product_id === productBatch.product_id) : undefined;
    const component = componentBatch ? components.find((item) => item.component_id === componentBatch.component_id) : undefined;
    return {
      ...entry,
      productName: product?.name ?? "Unknown product",
      productBatchNumber: productBatch?.batch_number ?? `Batch #${entry.product_batch_id}`,
      componentName: component?.name ?? "Unknown component",
      componentBatchNumber: componentBatch?.batch_number ?? `Batch #${entry.component_batch_id}`,
    };
  }), [batchCompositions, componentBatches, components, productBatches, products]);

  const filteredRows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesSearch = !normalized || [
        row.productName,
        row.productBatchNumber,
        row.componentName,
        row.componentBatchNumber,
      ].some((value) => value.toLowerCase().includes(normalized));
      const matchesProductBatch = productBatchFilter === "all" || String(row.product_batch_id) === productBatchFilter;
      const matchesComponentBatch = componentBatchFilter === "all" || String(row.component_batch_id) === componentBatchFilter;
      return matchesSearch && matchesProductBatch && matchesComponentBatch;
    });
  }, [componentBatchFilter, productBatchFilter, query, rows]);

  const selectedProductBatchId = Number(productBatchId);
  const availableComponentBatches = componentBatches.filter((batch) =>
    !batchCompositions.some((entry) =>
      entry.product_batch_id === selectedProductBatchId &&
      entry.component_batch_id === batch.component_batch_id,
    ),
  );

  const selectedComposition = activeDialog && "productBatchId" in activeDialog
    ? batchCompositions.find((entry) =>
      entry.product_batch_id === activeDialog.productBatchId &&
      entry.component_batch_id === activeDialog.componentBatchId,
    )
    : undefined;
  const selectedProductBatch = selectedComposition
    ? productBatches.find((batch) => batch.product_batch_id === selectedComposition.product_batch_id)
    : undefined;
  const selectedComponentBatch = selectedComposition
    ? componentBatches.find((batch) => batch.component_batch_id === selectedComposition.component_batch_id)
    : undefined;

  function openAdd() {
    const initialProductBatch = productBatches[0];
    const initialComponentBatch = initialProductBatch
      ? componentBatches.find((batch) => !batchCompositions.some((entry) =>
        entry.product_batch_id === initialProductBatch.product_batch_id &&
        entry.component_batch_id === batch.component_batch_id,
      ))
      : undefined;
    setProductBatchId(initialProductBatch ? String(initialProductBatch.product_batch_id) : "");
    setComponentBatchId(initialComponentBatch ? String(initialComponentBatch.component_batch_id) : "");
    setQuantityUsed("1.00");
    setFormError("");
    setFeedback(null);
    setActiveDialog({ kind: "add" });
  }

  function handleProductBatchChange(value: string) {
    setProductBatchId(value);
    const nextProductBatchId = Number(value);
    const firstAvailable = componentBatches.find((batch) => !batchCompositions.some((entry) =>
      entry.product_batch_id === nextProductBatchId && entry.component_batch_id === batch.component_batch_id,
    ));
    setComponentBatchId(firstAvailable ? String(firstAvailable.component_batch_id) : "");
    setFormError("");
  }

  async function saveComposition(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const nextProductBatchId = Number(productBatchId);
    const nextComponentBatchId = Number(componentBatchId);
    if (!productBatches.some((batch) => batch.product_batch_id === nextProductBatchId)) {
      setFormError("Choose a valid product batch.");
      return;
    }
    if (!componentBatches.some((batch) => batch.component_batch_id === nextComponentBatchId)) {
      setFormError("Choose a valid component batch.");
      return;
    }
    if (!isValidQuantity(quantityUsed)) {
      setFormError("Quantity used must be greater than zero, have at most 10 integer digits, and no more than two decimal places.");
      return;
    }
    if (batchCompositions.some((entry) => entry.product_batch_id === nextProductBatchId && entry.component_batch_id === nextComponentBatchId)) {
      setFormError("This product batch and component batch pair already exists. Choose another component batch.");
      return;
    }

    const input: ProductBatchComponentInput = {
      product_batch_id: nextProductBatchId,
      component_batch_id: nextComponentBatchId,
      quantity_used: quantityUsed,
    };
    setSaving(true);
    setFormError("");
    setFeedback(null);
    try {
      const result = await createProductBatchComponent(input);
      if (!result.success) {
        setFormError(result.error);
        return;
      }
      setActiveDialog(null);
      setFeedback({ kind: "success", message: "Component batch added to the product batch composition in MySQL." });
      notifyApplicationDataChanged();
      await refreshRecords();
    } catch {
      setFormError("The composition could not be added. Check the database connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  function openEdit(entry: ProductBatchComponentRecord) {
    setEditQuantity(formatQuantity(entry.quantity_used));
    setFormError("");
    setFeedback(null);
    setActiveDialog({ kind: "edit", productBatchId: entry.product_batch_id, componentBatchId: entry.component_batch_id });
  }

  async function saveQuantity(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (activeDialog?.kind !== "edit" || saving) return;
    if (!isValidQuantity(editQuantity)) {
      setFormError("Quantity used must be greater than zero, have at most 10 integer digits, and no more than two decimal places.");
      return;
    }
    setSaving(true);
    setFormError("");
    setFeedback(null);
    try {
      const result = await updateProductBatchComponent(activeDialog.productBatchId, activeDialog.componentBatchId, editQuantity);
      if (!result.success) {
        setFormError(result.error);
        return;
      }
      setActiveDialog(null);
      setFeedback({ kind: "success", message: "Composition quantity updated in MySQL." });
      notifyApplicationDataChanged();
      await refreshRecords();
    } catch {
      setFormError("The composition quantity could not be updated. Check the database connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmRemove() {
    if (activeDialog?.kind !== "delete" || deleting) return;
    setDeleting(true);
    setFeedback(null);
    try {
      const result = await deleteProductBatchComponent(activeDialog.productBatchId, activeDialog.componentBatchId);
      if (!result.success) {
        setActiveDialog(null);
        setFeedback({ kind: "error", message: result.error });
        return;
      }
      setActiveDialog(null);
      setFeedback({ kind: "success", message: "Composition relationship removed from MySQL." });
      notifyApplicationDataChanged();
      await refreshRecords();
    } catch {
      setActiveDialog(null);
      setFeedback({ kind: "error", message: "The composition could not be removed. Check the database connection and try again." });
    } finally {
      setDeleting(false);
    }
  }

  const columns = [
    {
      key: "product_batch",
      label: "Product batch",
      render: (row: CompositionRow) => <span className="font-mono text-xs font-semibold text-ink">{row.productBatchNumber}</span>,
    },
    {
      key: "product",
      label: "Product",
      render: (row: CompositionRow) => <span className="text-xs text-ink">{row.productName}</span>,
    },
    {
      key: "component_batch",
      label: "Component batch",
      render: (row: CompositionRow) => <span className="font-mono text-xs font-semibold text-ink">{row.componentBatchNumber}</span>,
    },
    {
      key: "component",
      label: "Component",
      render: (row: CompositionRow) => <span className="text-xs text-ink">{row.componentName}</span>,
    },
    {
      key: "quantity_used",
      label: "Quantity used",
      className: "w-32 text-right",
      render: (row: CompositionRow) => <span className="font-mono text-xs">{formatQuantity(row.quantity_used)}</span>,
    },
    {
      key: "actions",
      label: "Actions",
      className: "w-28 text-right",
      render: (row: CompositionRow) => (
        <div className="flex justify-end gap-1">
          <button
            aria-label={`Edit composition for ${row.productBatchNumber}`}
            className="flex size-8 items-center justify-center rounded-lg text-muted transition hover:bg-sage/55 hover:text-forest focus-visible:outline focus-visible:outline-2 focus-visible:outline-forest"
            onClick={() => openEdit(row)}
            title="Edit quantity"
            type="button"
          >
            <Icon name="pencil" size={15} />
          </button>
          <button
            aria-label={`Remove ${row.componentBatchNumber} from ${row.productBatchNumber}`}
            className="flex size-8 items-center justify-center rounded-lg text-muted transition hover:bg-red-50 hover:text-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-forest"
            onClick={() => { setFeedback(null); setActiveDialog({ kind: "delete", productBatchId: row.product_batch_id, componentBatchId: row.component_batch_id }); }}
            title="Remove composition"
            type="button"
          >
            <Icon name="trash" size={15} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <section aria-labelledby="batch-composition-heading" className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted">Assembly traceability</p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight text-ink" id="batch-composition-heading">Batch composition</h2>
          <p className="mt-1 text-xs text-muted">Connect each finished product batch to the component batches used to build it.</p>
        </div>
        <Button disabled={loading || Boolean(loadError) || productBatches.length === 0 || componentBatches.length === 0} onClick={openAdd} title={productBatches.length === 0 || componentBatches.length === 0 ? "Create product and component batches first" : undefined}>
          <span className="text-lg leading-none">+</span>Add composition
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2.5 rounded-xl border border-sage bg-sage/45 px-3.5 py-3 text-xs text-forest" role="note">
        <Icon name="database" size={15} />
        <span>Product batch composition and related batch details are loaded from MySQL.</span>
      </div>
      {feedback && (
        <div className={`flex items-center justify-between rounded-xl px-4 py-3 text-xs font-medium ${feedback.kind === "success" ? "border border-sage bg-sage/45 text-forest" : "border border-red-200 bg-red-50 text-red-800"}`} role={feedback.kind === "success" ? "status" : "alert"}>
          <span>{feedback.message}</span>
          <button aria-label="Dismiss message" className="ml-3 opacity-70 hover:opacity-100" onClick={() => setFeedback(null)} type="button"><Icon name="close" size={15} /></button>
        </div>
      )}
      {loadError && (
        <div className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800 sm:flex-row sm:items-center sm:justify-between" role="alert">
          <span>Composition data could not be loaded: {loadError}</span>
          <Button className="min-h-9 shrink-0" disabled={loading} onClick={() => void refreshRecords()} size="sm" variant="outline">{loading ? "Loading…" : "Retry"}</Button>
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-3 shadow-card sm:flex-row sm:items-center sm:p-4">
        <label className="relative block w-full sm:max-w-[270px]">
          <span className="sr-only">Search batch composition</span>
          <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" name="search" size={16} />
          <Input className="pl-10" onChange={(event) => setQuery(event.target.value)} placeholder="Search products or batches" value={query} />
        </label>
        <label className="block w-full sm:max-w-[245px]">
          <span className="sr-only">Filter by product batch</span>
          <Select onChange={(event) => setProductBatchFilter(event.target.value)} value={productBatchFilter}>
            <option value="all">All product batches</option>
            {productBatches.map((batch) => {
              const product = products.find((item) => item.product_id === batch.product_id);
              return <option key={batch.product_batch_id} value={batch.product_batch_id}>{productBatchLabel(product?.name, batch.batch_number)}</option>;
            })}
          </Select>
        </label>
        <label className="block w-full sm:max-w-[245px]">
          <span className="sr-only">Filter by component batch</span>
          <Select onChange={(event) => setComponentBatchFilter(event.target.value)} value={componentBatchFilter}>
            <option value="all">All component batches</option>
            {componentBatches.map((batch) => {
              const component = components.find((item) => item.component_id === batch.component_id);
              return <option key={batch.component_batch_id} value={batch.component_batch_id}>{componentBatchLabel(component?.name, batch.batch_number)}</option>;
            })}
          </Select>
        </label>
        <span aria-live="polite" className="px-1 text-xs text-muted sm:ml-auto">{loading ? "Loading compositions…" : `${filteredRows.length} compositions`}</span>
      </div>

      <DataTable
        columns={columns}
        emptyDescription={loading ? "Loading composition records from MySQL…" : loadError ? "Retry to load compositions and related batch records from MySQL." : query || productBatchFilter !== "all" || componentBatchFilter !== "all" ? "Try another search or adjust the batch filters." : "Add a component batch to a product batch to record its composition."}
        emptyTitle={loading ? "Loading compositions" : loadError ? "Composition data unavailable" : query || productBatchFilter !== "all" || componentBatchFilter !== "all" ? "No compositions match these filters" : "No batch compositions yet"}
        rowKey={(row) => compositionKey(row.product_batch_id, row.component_batch_id)}
        rows={filteredRows}
        footerLabel="Live MySQL records"
      />

      {activeDialog?.kind === "add" && (
        <Modal description="Each product batch and component batch pair can appear only once." onClose={() => !saving && setActiveDialog(null)} title="Add batch composition">
          <form className="space-y-4" onSubmit={saveComposition}>
            <FormField error={formError.toLowerCase().includes("product batch") ? formError : undefined} htmlFor="composition-product-batch" label="Product batch" required>
              <Select id="composition-product-batch" disabled={loading} onChange={(event) => handleProductBatchChange(event.target.value)} required value={productBatchId}>
                <option value="">Choose product batch</option>
                {productBatches.map((batch) => {
                  const product = products.find((item) => item.product_id === batch.product_id);
                  return <option key={batch.product_batch_id} value={batch.product_batch_id}>{productBatchLabel(product?.name, batch.batch_number)}</option>;
                })}
              </Select>
            </FormField>
            <FormField error={formError.toLowerCase().includes("component batch") || formError.includes("pair already") ? formError : undefined} htmlFor="composition-component-batch" label="Component batch" required>
              <Select id="composition-component-batch" disabled={loading} onChange={(event) => { setComponentBatchId(event.target.value); setFormError(""); }} required value={componentBatchId}>
                <option value="">Choose component batch</option>
                {availableComponentBatches.map((batch) => {
                  const component = components.find((item) => item.component_id === batch.component_id);
                  return <option key={batch.component_batch_id} value={batch.component_batch_id}>{componentBatchLabel(component?.name, batch.batch_number)}</option>;
                })}
              </Select>
              {productBatchId && availableComponentBatches.length === 0 && (
                <p className="mt-1.5 text-[11px] text-muted">Every component batch is already assigned to this product batch.</p>
              )}
            </FormField>
            <FormField error={formError.includes("Quantity") ? formError : undefined} htmlFor="composition-quantity-used" label="Quantity used" required>
              <Input id="composition-quantity-used" max={quantityLimit} min="0.01" onChange={(event) => { setQuantityUsed(event.target.value); setFormError(""); }} required step="0.01" type="number" value={quantityUsed} />
            </FormField>
            {formError && !formError.toLowerCase().includes("product batch") && !formError.toLowerCase().includes("component batch") && !formError.includes("pair already") && !formError.includes("Quantity") && <p className="text-xs font-medium text-red-700" role="alert">{formError}</p>}
            <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end">
              <Button disabled={saving} onClick={() => setActiveDialog(null)} variant="outline">Cancel</Button>
              <Button disabled={saving || loading || Boolean(loadError) || !productBatchId || !componentBatchId || availableComponentBatches.length === 0} type="submit">{saving ? "Saving…" : "Add composition"}</Button>
            </div>
          </form>
        </Modal>
      )}

      {activeDialog?.kind === "edit" && selectedComposition && (
        <Modal description="Only the quantity can change; the linked batch pair remains fixed." onClose={() => !saving && setActiveDialog(null)} title="Edit composition quantity">
          <form className="space-y-4" onSubmit={saveQuantity}>
            <DetailField label="Product batch" value={productBatchLabel(products.find((product) => product.product_id === selectedProductBatch?.product_id)?.name, selectedProductBatch?.batch_number ?? "")} />
            <DetailField label="Component batch" value={componentBatchLabel(components.find((component) => component.component_id === selectedComponentBatch?.component_id)?.name, selectedComponentBatch?.batch_number ?? "")} />
            <FormField error={formError} htmlFor="edit-composition-quantity" label="Quantity used" required>
              <Input autoFocus id="edit-composition-quantity" max={quantityLimit} min="0.01" onChange={(event) => { setEditQuantity(event.target.value); setFormError(""); }} required step="0.01" type="number" value={editQuantity} />
            </FormField>
            <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end">
              <Button disabled={saving} onClick={() => setActiveDialog(null)} variant="outline">Cancel</Button>
              <Button disabled={saving} type="submit">{saving ? "Saving…" : "Save quantity"}</Button>
            </div>
          </form>
        </Modal>
      )}

      {activeDialog?.kind === "delete" && selectedComposition && (
        <ConfirmDialog
          description={`Remove ${selectedComponentBatch?.batch_number ?? "this component batch"} from ${selectedProductBatch?.batch_number ?? "this product batch"}? This deletes the composition relationship from MySQL.`}
          onClose={() => !deleting && setActiveDialog(null)}
          onConfirm={() => void confirmRemove()}
          title="Remove batch composition"
          confirmLabel={deleting ? "Removing…" : "Remove composition"}
          pending={deleting}
        />
      )}
    </section>
  );
}
