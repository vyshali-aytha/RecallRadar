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
import type { BomEntry, Product } from "@/lib/mock-data";

type ProductDraft = {
  name: string;
  category: string;
  sku: string;
};

type ActiveDialog =
  | { kind: "form"; id: number | null }
  | { kind: "view"; id: number }
  | { kind: "delete"; id: number }
  | null;

const emptyDraft: ProductDraft = { name: "", category: "", sku: "" };

export default function ProductsPage() {
  const {
    products,
    components,
    productBatches,
    bomEntries,
    addProduct,
    updateProduct,
    deleteProduct,
    addBomEntry,
    updateBomEntry,
    deleteBomEntry,
  } = useMockData();
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null);
  const [draft, setDraft] = useState<ProductDraft>(emptyDraft);
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const [addingBom, setAddingBom] = useState(false);
  const [bomComponentId, setBomComponentId] = useState("");
  const [bomQuantity, setBomQuantity] = useState("1.00");
  const [bomError, setBomError] = useState("");
  const [editingComponentId, setEditingComponentId] = useState<number | null>(null);
  const [editingQuantity, setEditingQuantity] = useState("");
  const [removingBomId, setRemovingBomId] = useState<number | null>(null);

  const categories = useMemo(
    () => [...new Set(products.map((product) => product.category).filter((value): value is string => Boolean(value)))].sort(),
    [products],
  );
  const filteredProducts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return products.filter((product) => {
      const matchesQuery = !normalized ||
        [product.name, product.category, product.sku].some((value) => value?.toLowerCase().includes(normalized));
      const matchesCategory = categoryFilter === "all" || product.category === categoryFilter;
      return matchesQuery && matchesCategory;
    });
  }, [categoryFilter, products, query]);

  const selectedProduct = activeDialog
    ? products.find((product) => product.product_id === activeDialog.id)
    : undefined;
  const selectedBom: BomEntry[] = activeDialog?.kind === "view"
    ? bomEntries.filter((entry) => entry.product_id === activeDialog.id)
    : [];
  const linkedBom = activeDialog?.kind === "delete"
    ? bomEntries.filter((entry) => entry.product_id === activeDialog.id)
    : [];
  const linkedBatches = activeDialog?.kind === "delete"
    ? productBatches.filter((batch) => batch.product_id === activeDialog.id)
    : [];
  const blockedReason = linkedBom.length > 0
    ? "This product has Bill of Materials entries. Remove those component relationships from the product details before deleting the product."
    : linkedBatches.length > 0
      ? "This product has production batches. Remove those batches before deleting the product."
      : undefined;
  const availableComponents = activeDialog?.kind === "view"
    ? components.filter((component) => !selectedBom.some((entry) => entry.component_id === component.component_id))
    : [];

  function openCreate() {
    setDraft(emptyDraft);
    setFormError("");
    setActiveDialog({ kind: "form", id: null });
  }

  function openEdit(product: Product) {
    setDraft({ name: product.name, category: product.category ?? "", sku: product.sku });
    setFormError("");
    setActiveDialog({ kind: "form", id: product.product_id });
  }

  function openView(product: Product) {
    setAddingBom(false);
    setBomComponentId("");
    setBomQuantity("1.00");
    setBomError("");
    setEditingComponentId(null);
    setRemovingBomId(null);
    setActiveDialog({ kind: "view", id: product.product_id });
  }

  function closeDialog() {
    setActiveDialog(null);
    setAddingBom(false);
    setEditingComponentId(null);
    setRemovingBomId(null);
  }

  function saveProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = draft.name.trim();
    const sku = draft.sku.trim();
    if (!name || !sku) {
      setFormError("Product name and SKU are required.");
      return;
    }
    const duplicate = products.some((product) =>
      product.sku.toLowerCase() === sku.toLowerCase() &&
      product.product_id !== (activeDialog?.kind === "form" ? activeDialog.id : null),
    );
    if (duplicate) {
      setFormError("That SKU is already in use. Enter a unique SKU.");
      return;
    }

    const record = { name, category: draft.category.trim() || null, sku };
    if (activeDialog?.kind === "form" && activeDialog.id !== null) {
      updateProduct(activeDialog.id, record);
      setNotice(`${name} was updated in mock data.`);
    } else {
      addProduct(record);
      setNotice(`${name} was added to mock data.`);
    }
    setActiveDialog(null);
  }

  function confirmDelete() {
    if (activeDialog?.kind !== "delete" || blockedReason || !selectedProduct) return;
    deleteProduct(selectedProduct.product_id);
    setNotice(`${selectedProduct.name} was removed from mock data.`);
    setActiveDialog(null);
  }

  function saveBomEntry(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const componentId = Number(bomComponentId);
    const quantity = Number(bomQuantity);
    if (!componentId || !Number.isFinite(quantity) || quantity <= 0) {
      setBomError("Choose a component and enter a quantity greater than zero.");
      return;
    }
    if (activeDialog?.kind !== "view") return;
    addBomEntry({ product_id: activeDialog.id, component_id: componentId, quantity_required: quantity });
    setAddingBom(false);
    setBomComponentId("");
    setBomQuantity("1.00");
    setBomError("");
    setNotice("Component added to the BOM in mock data.");
  }

  function saveBomEdit(productId: number, componentId: number) {
    const quantity = Number(editingQuantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setBomError("Quantity required must be greater than zero.");
      return;
    }
    updateBomEntry(productId, componentId, quantity);
    setEditingComponentId(null);
    setBomError("");
    setNotice("BOM quantity updated in mock data.");
  }

  function removeBomEntry(productId: number, componentId: number) {
    deleteBomEntry(productId, componentId);
    setRemovingBomId(null);
    setNotice("BOM entry removed from mock data.");
  }

  const columns = [
    {
      key: "product_id",
      label: "Product ID",
      className: "w-28",
      render: (product: Product) => <span className="font-mono text-xs text-muted">{product.product_id}</span>,
    },
    {
      key: "name",
      label: "Product",
      render: (product: Product) => <span className="font-semibold text-ink">{product.name}</span>,
    },
    {
      key: "category",
      label: "Category",
      render: (product: Product) => product.category ? <Badge tone="sage">{product.category}</Badge> : <span className="text-muted">—</span>,
    },
    {
      key: "sku",
      label: "SKU",
      render: (product: Product) => <span className="font-mono text-xs tracking-wide text-ink/75">{product.sku}</span>,
    },
    {
      key: "actions",
      label: "Actions",
      className: "w-32 text-right",
      render: (product: Product) => (
        <RowActions
          label="product"
          onDelete={() => setActiveDialog({ kind: "delete", id: product.product_id })}
          onEdit={() => openEdit(product)}
          onView={() => openView(product)}
        />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeading
        action={<Button onClick={openCreate}><span className="text-lg leading-none">+</span>Add product</Button>}
        description="Maintain the product catalog and the component recipes that define each product."
        title="Products"
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
          <span className="sr-only">Search products</span>
          <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" name="search" size={16} />
          <Input className="pl-10" onChange={(event) => setQuery(event.target.value)} placeholder="Search name or SKU" value={query} />
        </label>
        <label className="block w-full sm:ml-auto sm:max-w-[230px]">
          <span className="sr-only">Filter by product category</span>
          <Select onChange={(event) => setCategoryFilter(event.target.value)} value={categoryFilter}>
            <option value="all">All categories</option>
            {categories.map((category) => <option key={category} value={category}>{category}</option>)}
          </Select>
        </label>
        <p className="px-1 text-xs text-muted sm:ml-1">{filteredProducts.length} product{filteredProducts.length === 1 ? "" : "s"}</p>
      </div>

      <DataTable
        columns={columns}
        emptyDescription={query || categoryFilter !== "all" ? "Adjust your search or choose another category." : "Add a product to begin organizing your catalog."}
        emptyTitle={query || categoryFilter !== "all" ? "No products match these filters" : "No products yet"}
        rowKey={(product) => product.product_id}
        rows={filteredProducts}
      />

      {activeDialog?.kind === "form" && (
        <Modal description="Product details are held in temporary mock data." onClose={closeDialog} title={activeDialog.id === null ? "Add product" : "Edit product"}>
          <form className="space-y-4" onSubmit={saveProduct}>
            <FormField error={formError} htmlFor="product-name" label="Product name" required>
              <Input autoFocus id="product-name" maxLength={150} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="e.g. FrostGuard Vaccine Monitor" required value={draft.name} />
            </FormField>
            <FormField htmlFor="product-category" label="Category" hint="Optional">
              <Input id="product-category" maxLength={100} onChange={(event) => setDraft({ ...draft, category: event.target.value })} placeholder="e.g. Cold-Chain Monitoring" value={draft.category} />
            </FormField>
            <FormField error={formError.includes("SKU") ? formError : undefined} htmlFor="product-sku" label="SKU" required>
              <Input autoCapitalize="characters" id="product-sku" maxLength={50} onChange={(event) => { setDraft({ ...draft, sku: event.target.value }); setFormError(""); }} placeholder="e.g. FGVM-TEMP-001" required value={draft.sku} />
            </FormField>
            {!formError.includes("SKU") && formError && <p className="text-xs font-medium text-red-700" role="alert">{formError}</p>}
            <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end">
              <Button onClick={closeDialog} variant="outline">Cancel</Button>
              <Button type="submit">{activeDialog.id === null ? "Add product" : "Save changes"}</Button>
            </div>
          </form>
        </Modal>
      )}

      {activeDialog?.kind === "view" && selectedProduct && (
        <Modal description="Product details and bill of materials" onClose={closeDialog} title={selectedProduct.name} width="lg">
          <div className="grid gap-3 sm:grid-cols-3">
            <DetailField label="Product ID" value={selectedProduct.product_id} />
            <DetailField label="Category" value={selectedProduct.category} />
            <DetailField label="SKU" value={selectedProduct.sku} />
          </div>

          <section className="mt-7" aria-labelledby="bom-heading">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
              <div>
                <h3 className="text-sm font-semibold text-ink" id="bom-heading">Bill of Materials</h3>
                <p className="mt-1 text-[11px] text-muted">Components and quantities required for one product.</p>
              </div>
              {!addingBom && (
                <Button disabled={availableComponents.length === 0} onClick={() => { setAddingBom(true); setBomError(""); }} size="sm" variant="secondary">
                  <span className="text-base leading-none">+</span>Add component
                </Button>
              )}
            </div>

            {addingBom && (
              <form className="mt-4 grid gap-3 rounded-xl border border-sage bg-sage/20 p-3 sm:grid-cols-[1fr_145px_auto] sm:items-end" onSubmit={saveBomEntry}>
                <FormField error={bomError && !bomComponentId ? bomError : undefined} htmlFor="bom-component" label="Component" required>
                  <Select id="bom-component" onChange={(event) => setBomComponentId(event.target.value)} required value={bomComponentId}>
                    <option value="">Choose component</option>
                    {availableComponents.map((component) => <option key={component.component_id} value={component.component_id}>{component.name}</option>)}
                  </Select>
                </FormField>
                <FormField error={bomError && bomComponentId ? bomError : undefined} htmlFor="bom-quantity" label="Quantity required" required>
                  <Input id="bom-quantity" min="0.01" onChange={(event) => setBomQuantity(event.target.value)} required step="0.01" type="number" value={bomQuantity} />
                </FormField>
                <div className="flex gap-2 sm:pb-0.5">
                  <Button size="sm" type="submit">Add</Button>
                  <Button onClick={() => { setAddingBom(false); setBomError(""); }} size="sm" variant="outline">Cancel</Button>
                </div>
              </form>
            )}

            {bomError && !addingBom && <p className="mt-3 text-xs font-medium text-red-700" role="alert">{bomError}</p>}

            {selectedBom.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-line bg-[#FBFBF8] px-4 py-8 text-center">
                <p className="text-xs font-semibold text-ink">No components in this BOM</p>
                <p className="mt-1 text-[11px] text-muted">Add a component and its required quantity.</p>
              </div>
            ) : (
              <div className="mt-4 overflow-hidden rounded-xl border border-line">
                <div className="grid grid-cols-[1fr_115px_132px] bg-[#FBFBF8] px-3.5 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted sm:grid-cols-[1fr_140px_160px]">
                  <span>Component</span><span>Qty / product</span><span className="text-right">Actions</span>
                </div>
                <div className="divide-y divide-line">
                  {selectedBom.map((entry) => {
                    const component = components.find((item) => item.component_id === entry.component_id);
                    if (!component) return null;
                    const isEditing = editingComponentId === entry.component_id;
                    const isRemoving = removingBomId === entry.component_id;
                    return (
                      <div className="grid grid-cols-[1fr_115px_132px] items-center gap-2 px-3.5 py-3 sm:grid-cols-[1fr_140px_160px]" key={entry.component_id}>
                        <span className="min-w-0 truncate text-xs font-medium text-ink">{component.name}</span>
                        {isEditing ? (
                          <Input aria-label={`Quantity required for ${component.name}`} className="min-h-9 px-2 text-xs" min="0.01" onChange={(event) => setEditingQuantity(event.target.value)} step="0.01" type="number" value={editingQuantity} />
                        ) : (
                          <span className="font-mono text-xs text-ink/75">{entry.quantity_required.toFixed(2)}</span>
                        )}
                        <div className="flex justify-end gap-1">
                          {isRemoving ? (
                            <>
                              <button className="rounded-md px-2 py-1 text-[10px] font-semibold text-red-700 hover:bg-red-50" onClick={() => removeBomEntry(entry.product_id, entry.component_id)} type="button">Remove</button>
                              <button className="rounded-md px-2 py-1 text-[10px] font-medium text-muted hover:bg-stone-100" onClick={() => setRemovingBomId(null)} type="button">Keep</button>
                            </>
                          ) : isEditing ? (
                            <>
                              <button className="rounded-md px-2 py-1 text-[10px] font-semibold text-forest hover:bg-sage/50" onClick={() => saveBomEdit(entry.product_id, entry.component_id)} type="button">Save</button>
                              <button className="rounded-md px-2 py-1 text-[10px] font-medium text-muted hover:bg-stone-100" onClick={() => setEditingComponentId(null)} type="button">Cancel</button>
                            </>
                          ) : (
                            <>
                              <button className="rounded-md px-2 py-1 text-[10px] font-semibold text-forest hover:bg-sage/50" onClick={() => { setEditingComponentId(entry.component_id); setEditingQuantity(entry.quantity_required.toFixed(2)); setBomError(""); }} type="button">Edit</button>
                              <button className="rounded-md px-2 py-1 text-[10px] font-medium text-muted hover:bg-red-50 hover:text-red-700" onClick={() => setRemovingBomId(entry.component_id)} type="button">Remove</button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {bomError && editingComponentId !== null && <p className="mt-2 text-xs font-medium text-red-700" role="alert">{bomError}</p>}
            {availableComponents.length === 0 && selectedBom.length > 0 && !addingBom && (
              <p className="mt-2 text-[11px] text-muted">All available components are already in this BOM.</p>
            )}
          </section>
          <div className="mt-6 flex justify-end border-t border-line pt-4">
            <Button onClick={() => openEdit(selectedProduct)} variant="outline">Edit product</Button>
          </div>
        </Modal>
      )}

      {activeDialog?.kind === "delete" && selectedProduct && (
        <ConfirmDialog
          blockedReason={blockedReason}
          description={`Delete ${selectedProduct.name}? This removes the record from temporary mock data.`}
          onClose={closeDialog}
          onConfirm={confirmDelete}
          title="Delete product"
        />
      )}
    </div>
  );
}
