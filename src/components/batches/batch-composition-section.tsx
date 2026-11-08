"use client";

import { useMemo, useState } from "react";
import { ConfirmDialog } from "@/components/crud/confirm-dialog";
import { DataTable } from "@/components/crud/data-table";
import { DetailField } from "@/components/crud/detail-field";
import { FormField } from "@/components/crud/form-field";
import { Modal } from "@/components/crud/modal";
import { Button, Input, Select } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/icon";
import { useMockData } from "@/lib/mock-data";
import type { BatchComposition } from "@/lib/mock-data";

type ActiveDialog =
  | { kind: "add" }
  | { kind: "edit"; productBatchId: number; componentBatchId: number }
  | { kind: "delete"; productBatchId: number; componentBatchId: number }
  | null;

type CompositionRow = BatchComposition & {
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

export function BatchCompositionSection() {
  const {
    products,
    components,
    productBatches,
    componentBatches,
    batchCompositions,
    addBatchComposition,
    updateBatchComposition,
    deleteBatchComposition,
  } = useMockData();
  const [query, setQuery] = useState("");
  const [productBatchFilter, setProductBatchFilter] = useState("all");
  const [componentBatchFilter, setComponentBatchFilter] = useState("all");
  const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null);
  const [productBatchId, setProductBatchId] = useState("");
  const [componentBatchId, setComponentBatchId] = useState("");
  const [quantityUsed, setQuantityUsed] = useState("1.00");
  const [editQuantity, setEditQuantity] = useState("");
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");

  const rows = useMemo<CompositionRow[]>(() => batchCompositions.flatMap((entry) => {
    const productBatch = productBatches.find((batch) => batch.product_batch_id === entry.product_batch_id);
    const componentBatch = componentBatches.find((batch) => batch.component_batch_id === entry.component_batch_id);
    if (!productBatch || !componentBatch) return [];
    const product = products.find((item) => item.product_id === productBatch.product_id);
    const component = components.find((item) => item.component_id === componentBatch.component_id);
    return [{
      ...entry,
      productName: product?.name ?? "Unknown product",
      productBatchNumber: productBatch.batch_number,
      componentName: component?.name ?? "Unknown component",
      componentBatchNumber: componentBatch.batch_number,
    }];
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
  const deleteProductBatch = selectedComposition
    ? productBatches.find((batch) => batch.product_batch_id === selectedComposition.product_batch_id)
    : undefined;
  const deleteComponentBatch = selectedComposition
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
    setActiveDialog({ kind: "add" });
  }

  function handleProductBatchChange(value: string) {
    setProductBatchId(value);
    const nextProductBatchId = Number(value);
    const firstAvailable = componentBatches.find((batch) => !batchCompositions.some((entry) =>
      entry.product_batch_id === nextProductBatchId &&
      entry.component_batch_id === batch.component_batch_id,
    ));
    setComponentBatchId(firstAvailable ? String(firstAvailable.component_batch_id) : "");
    setFormError("");
  }

  function saveComposition(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextProductBatchId = Number(productBatchId);
    const nextComponentBatchId = Number(componentBatchId);
    const quantity = Number(quantityUsed);
    if (!productBatches.some((batch) => batch.product_batch_id === nextProductBatchId)) {
      setFormError("Choose a product batch.");
      return;
    }
    if (!componentBatches.some((batch) => batch.component_batch_id === nextComponentBatchId)) {
      setFormError("Choose a component batch.");
      return;
    }
    if (!Number.isFinite(quantity) || quantity <= 0 || quantity > quantityLimit || Math.round(quantity * 100) / 100 !== quantity) {
      setFormError("Quantity used must be greater than zero and have no more than two decimal places.");
      return;
    }
    const duplicate = batchCompositions.some((entry) =>
      entry.product_batch_id === nextProductBatchId && entry.component_batch_id === nextComponentBatchId,
    );
    if (duplicate) {
      setFormError("This component batch is already assigned to the selected product batch. Choose another batch.");
      return;
    }
    const added = addBatchComposition({
      product_batch_id: nextProductBatchId,
      component_batch_id: nextComponentBatchId,
      quantity_used: quantity,
    });
    if (!added) {
      setFormError("This product batch and component batch pair already exists. No duplicate was added.");
      return;
    }
    setNotice("Component batch added to the product batch composition in mock data.");
    setActiveDialog(null);
  }

  function openEdit(entry: BatchComposition) {
    setEditQuantity(entry.quantity_used.toFixed(2));
    setFormError("");
    setActiveDialog({
      kind: "edit",
      productBatchId: entry.product_batch_id,
      componentBatchId: entry.component_batch_id,
    });
  }

  function saveQuantity(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (activeDialog?.kind !== "edit") return;
    const quantity = Number(editQuantity);
    if (!Number.isFinite(quantity) || quantity <= 0 || quantity > quantityLimit || Math.round(quantity * 100) / 100 !== quantity) {
      setFormError("Quantity used must be greater than zero and have no more than two decimal places.");
      return;
    }
    updateBatchComposition(activeDialog.productBatchId, activeDialog.componentBatchId, quantity);
    setNotice("Composition quantity updated in mock data.");
    setActiveDialog(null);
  }

  function confirmRemove() {
    if (activeDialog?.kind !== "delete") return;
    deleteBatchComposition(activeDialog.productBatchId, activeDialog.componentBatchId);
    setNotice("Composition removed from mock data.");
    setActiveDialog(null);
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
      render: (row: CompositionRow) => <span className="font-mono text-xs">{row.quantity_used.toFixed(2)}</span>,
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
            onClick={() => setActiveDialog({ kind: "delete", productBatchId: row.product_batch_id, componentBatchId: row.component_batch_id })}
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
        <Button disabled={productBatches.length === 0 || componentBatches.length === 0} onClick={openAdd} title={productBatches.length === 0 || componentBatches.length === 0 ? "Create product and component batches first" : undefined}>
          <span className="text-lg leading-none">+</span>Add composition
        </Button>
      </div>
      {notice && (
        <div className="flex items-center justify-between rounded-xl border border-sage bg-sage/45 px-4 py-3 text-xs font-medium text-forest" role="status">
          <span>{notice}</span>
          <button aria-label="Dismiss message" className="ml-3 text-forest/70 hover:text-forest" onClick={() => setNotice("")} type="button"><Icon name="close" size={15} /></button>
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
        <span className="px-1 text-xs text-muted sm:ml-auto">{filteredRows.length} compositions</span>
      </div>

      <DataTable
        columns={columns}
        emptyDescription={query || productBatchFilter !== "all" || componentBatchFilter !== "all" ? "Try another search or adjust the batch filters." : "Add a component batch to a product batch to record its composition."}
        emptyTitle={query || productBatchFilter !== "all" || componentBatchFilter !== "all" ? "No compositions match these filters" : "No batch compositions yet"}
        rowKey={(row) => compositionKey(row.product_batch_id, row.component_batch_id)}
        rows={filteredRows}
      />

      {activeDialog?.kind === "add" && (
        <Modal description="Each product batch and component batch pair can appear only once." onClose={() => setActiveDialog(null)} title="Add batch composition">
          <form className="space-y-4" onSubmit={saveComposition}>
            <FormField error={formError.includes("product batch") ? formError : undefined} htmlFor="composition-product-batch" label="Product batch" required>
              <Select id="composition-product-batch" onChange={(event) => handleProductBatchChange(event.target.value)} required value={productBatchId}>
                <option value="">Choose product batch</option>
                {productBatches.map((batch) => {
                  const product = products.find((item) => item.product_id === batch.product_id);
                  return <option key={batch.product_batch_id} value={batch.product_batch_id}>{productBatchLabel(product?.name, batch.batch_number)}</option>;
                })}
              </Select>
            </FormField>
            <FormField error={formError.includes("component batch") || formError.includes("already assigned") || formError.includes("pair already") ? formError : undefined} htmlFor="composition-component-batch" label="Component batch" required>
              <Select id="composition-component-batch" onChange={(event) => { setComponentBatchId(event.target.value); setFormError(""); }} required value={componentBatchId}>
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
            {formError && !formError.includes("product batch") && !formError.includes("component batch") && !formError.includes("already assigned") && !formError.includes("pair already") && !formError.includes("Quantity") && <p className="text-xs font-medium text-red-700" role="alert">{formError}</p>}
            <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end">
              <Button onClick={() => setActiveDialog(null)} variant="outline">Cancel</Button>
              <Button disabled={!productBatchId || !componentBatchId || availableComponentBatches.length === 0} type="submit">Add composition</Button>
            </div>
          </form>
        </Modal>
      )}

      {activeDialog?.kind === "edit" && selectedComposition && (
        <Modal description="Only the quantity can change; the linked batch pair remains fixed." onClose={() => setActiveDialog(null)} title="Edit composition quantity">
          <form className="space-y-4" onSubmit={saveQuantity}>
            <DetailField
              label="Product batch"
              value={productBatchLabel(
                products.find((product) => product.product_id === productBatches.find((batch) => batch.product_batch_id === selectedComposition.product_batch_id)?.product_id)?.name,
                productBatches.find((batch) => batch.product_batch_id === selectedComposition.product_batch_id)?.batch_number ?? "",
              )}
            />
            <DetailField
              label="Component batch"
              value={componentBatchLabel(
                components.find((component) => component.component_id === componentBatches.find((batch) => batch.component_batch_id === selectedComposition.component_batch_id)?.component_id)?.name,
                componentBatches.find((batch) => batch.component_batch_id === selectedComposition.component_batch_id)?.batch_number ?? "",
              )}
            />
            <FormField error={formError} htmlFor="edit-composition-quantity" label="Quantity used" required>
              <Input autoFocus id="edit-composition-quantity" max={quantityLimit} min="0.01" onChange={(event) => { setEditQuantity(event.target.value); setFormError(""); }} required step="0.01" type="number" value={editQuantity} />
            </FormField>
            <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end">
              <Button onClick={() => setActiveDialog(null)} variant="outline">Cancel</Button>
              <Button type="submit">Save quantity</Button>
            </div>
          </form>
        </Modal>
      )}

      {activeDialog?.kind === "delete" && selectedComposition && (
        <ConfirmDialog
          description={`Remove ${deleteComponentBatch?.batch_number ?? "this component batch"} from ${deleteProductBatch?.batch_number ?? "this product batch"}? This removes only the composition entry from mock data.`}
          onClose={() => setActiveDialog(null)}
          onConfirm={confirmRemove}
          title="Remove batch composition"
        />
      )}
    </section>
  );
}
