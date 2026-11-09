"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ConfirmDialog } from "@/components/crud/confirm-dialog";
import { DataTable } from "@/components/crud/data-table";
import { DetailField } from "@/components/crud/detail-field";
import { FormField } from "@/components/crud/form-field";
import { Modal } from "@/components/crud/modal";
import { PageHeading } from "@/components/crud/page-heading";
import { RowActions } from "@/components/crud/row-actions";
import { Badge, Button, Input, Select } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/icon";
import {
  createProduct as createProductAction,
  createProductComponent as createProductComponentAction,
  deleteProduct as deleteProductAction,
  deleteProductComponent as deleteProductComponentAction,
  getAllComponents,
  getAllProductComponents,
  getAllProducts,
  updateProduct as updateProductAction,
  updateProductComponent as updateProductComponentAction,
} from "@/lib/member-a-actions";
import type { ComponentRecord, ProductComponentInput, ProductComponentRecord, ProductInput, ProductRecord } from "@/lib/member-a-types";

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

function isValidBomQuantity(value: string) {
  return /^\d{1,10}(?:\.\d{1,2})?$/.test(value.trim()) && Number(value) > 0;
}

function formatBomQuantity(value: string | number) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(2) : String(value);
}

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [components, setComponents] = useState<ComponentRecord[]>([]);
  const [bomEntries, setBomEntries] = useState<ProductComponentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null);
  const [draft, setDraft] = useState<ProductDraft>(emptyDraft);
  const [formError, setFormError] = useState("");
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const [bomLoading, setBomLoading] = useState(true);
  const [bomSaving, setBomSaving] = useState(false);
  const [bomDeletingComponentId, setBomDeletingComponentId] = useState<number | null>(null);
  const [bomLoadError, setBomLoadError] = useState("");
  const [bomFeedback, setBomFeedback] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const [addingBom, setAddingBom] = useState(false);
  const [bomComponentId, setBomComponentId] = useState("");
  const [bomQuantity, setBomQuantity] = useState("1.00");
  const [bomError, setBomError] = useState("");
  const [editingComponentId, setEditingComponentId] = useState<number | null>(null);
  const [editingQuantity, setEditingQuantity] = useState("");
  const [removingBomId, setRemovingBomId] = useState<number | null>(null);

  const refreshProducts = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getAllProducts();
      if (result.success) {
        setProducts(result.data);
        setLoadError("");
      } else {
        setLoadError(result.error);
      }
    } catch {
      setLoadError("Products could not be loaded. Check the database connection and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshBomData = useCallback(async () => {
    setBomLoading(true);
    try {
      const componentResult = await getAllComponents();
      const bomResult = await getAllProductComponents();
      const errors: string[] = [];
      if (componentResult.success) setComponents(componentResult.data);
      else errors.push(`Components: ${componentResult.error}`);
      if (bomResult.success) setBomEntries(bomResult.data);
      else errors.push(`Bill of Materials: ${bomResult.error}`);
      setBomLoadError(errors.join(" "));
    } catch {
      setBomLoadError("BOM records and component options could not be loaded. Check the database connection and try again.");
    } finally {
      setBomLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void refreshProducts(); }, 0);
    return () => window.clearTimeout(timer);
  }, [refreshProducts]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void refreshBomData(); }, 0);
    return () => window.clearTimeout(timer);
  }, [refreshBomData]);

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
  const selectedBom: ProductComponentRecord[] = activeDialog?.kind === "view"
    ? bomEntries.filter((entry) => entry.product_id === activeDialog.id)
    : [];
  const availableComponents = activeDialog?.kind === "view"
    ? components.filter((component) => !selectedBom.some((entry) => entry.component_id === component.component_id))
    : [];

  function openCreate() {
    setDraft(emptyDraft);
    setFormError("");
    setFeedback(null);
    setActiveDialog({ kind: "form", id: null });
  }

  function openEdit(product: ProductRecord) {
    setDraft({ name: product.name, category: product.category ?? "", sku: product.sku });
    setFormError("");
    setFeedback(null);
    setActiveDialog({ kind: "form", id: product.product_id });
  }

  function openView(product: ProductRecord) {
    setAddingBom(false);
    setBomComponentId("");
    setBomQuantity("1.00");
    setBomError("");
    setEditingComponentId(null);
    setRemovingBomId(null);
    setBomFeedback(null);
    setActiveDialog({ kind: "view", id: product.product_id });
  }

  function closeDialog() {
    setActiveDialog(null);
    setAddingBom(false);
    setEditingComponentId(null);
    setRemovingBomId(null);
  }

  async function saveProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
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

    const record: ProductInput = { name, category: draft.category.trim() || null, sku };
    setSaving(true);
    setFormError("");
    setFeedback(null);
    try {
      const editId = activeDialog?.kind === "form" ? activeDialog.id : null;
      const result = editId !== null
        ? await updateProductAction(editId, record)
        : await createProductAction(record);
      if (!result.success) {
        setFormError(result.error);
        return;
      }
      setActiveDialog(null);
      setFeedback({ kind: "success", message: editId !== null ? `${name} was updated in MySQL.` : `${name} was added to MySQL.` });
      await refreshProducts();
    } catch {
      setFormError("The product could not be saved. Check the database connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (activeDialog?.kind !== "delete" || !selectedProduct || deleting) return;
    setDeleting(true);
    setFeedback(null);
    try {
      const result = await deleteProductAction(selectedProduct.product_id);
      if (!result.success) {
        setActiveDialog(null);
        setFeedback({ kind: "error", message: result.error });
        return;
      }
      setActiveDialog(null);
      setFeedback({ kind: "success", message: `${selectedProduct.name} was deleted from MySQL.` });
      await refreshProducts();
    } catch {
      setActiveDialog(null);
      setFeedback({ kind: "error", message: "The product could not be deleted. It may be referenced by a BOM or production batch." });
    } finally {
      setDeleting(false);
    }
  }

  async function saveBomEntry(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (bomSaving || activeDialog?.kind !== "view") return;
    const componentId = Number(bomComponentId);
    if (!products.some((product) => product.product_id === activeDialog.id)) {
      setBomError("The selected product is no longer available. Refresh the product list and try again.");
      return;
    }
    if (!components.some((component) => component.component_id === componentId)) {
      setBomError("Choose a valid component.");
      return;
    }
    if (!isValidBomQuantity(bomQuantity)) {
      setBomError("Quantity required must be greater than zero, have at most 10 integer digits, and no more than two decimal places.");
      return;
    }
    if (selectedBom.some((entry) => entry.component_id === componentId)) {
      setBomError("This component is already in the selected product’s BOM.");
      return;
    }

    const record: ProductComponentInput = {
      product_id: activeDialog.id,
      component_id: componentId,
      quantity_required: bomQuantity,
    };
    setBomSaving(true);
    setBomError("");
    setBomFeedback(null);
    try {
      const result = await createProductComponentAction(record);
      if (!result.success) {
        setBomError(result.error);
        setBomFeedback({ kind: "error", message: result.error });
        return;
      }
      setAddingBom(false);
      setBomComponentId("");
      setBomQuantity("1.00");
      setBomError("");
      setBomFeedback({ kind: "success", message: "Component added to the product BOM in MySQL." });
      await refreshBomData();
    } catch {
      const message = "The BOM entry could not be added. Check the database connection and try again.";
      setBomError(message);
      setBomFeedback({ kind: "error", message });
    } finally {
      setBomSaving(false);
    }
  }

  async function saveBomEdit(productId: number, componentId: number) {
    if (bomSaving) return;
    if (!products.some((product) => product.product_id === productId) || !components.some((component) => component.component_id === componentId)) {
      setBomError("The selected product or component is no longer available. Refresh the records and try again.");
      return;
    }
    if (!isValidBomQuantity(editingQuantity)) {
      setBomError("Quantity required must be greater than zero, have at most 10 integer digits, and no more than two decimal places.");
      return;
    }

    setBomSaving(true);
    setBomError("");
    setBomFeedback(null);
    try {
      const result = await updateProductComponentAction(productId, componentId, editingQuantity);
      if (!result.success) {
        setBomError(result.error);
        setBomFeedback({ kind: "error", message: result.error });
        return;
      }
      setEditingComponentId(null);
      setBomError("");
      setBomFeedback({ kind: "success", message: "BOM quantity updated in MySQL." });
      await refreshBomData();
    } catch {
      const message = "The BOM quantity could not be updated. Check the database connection and try again.";
      setBomError(message);
      setBomFeedback({ kind: "error", message });
    } finally {
      setBomSaving(false);
    }
  }

  async function removeBomEntry(productId: number, componentId: number) {
    if (bomDeletingComponentId !== null) return;
    setBomDeletingComponentId(componentId);
    setBomError("");
    setBomFeedback(null);
    try {
      const result = await deleteProductComponentAction(productId, componentId);
      if (!result.success) {
        setBomError(result.error);
        setBomFeedback({ kind: "error", message: result.error });
        return;
      }
      setRemovingBomId(null);
      setBomError("");
      setBomFeedback({ kind: "success", message: "BOM relationship deleted from MySQL." });
      await refreshBomData();
    } catch {
      const message = "The BOM relationship could not be deleted. Check the database connection and try again.";
      setBomError(message);
      setBomFeedback({ kind: "error", message });
    } finally {
      setBomDeletingComponentId(null);
    }
  }

  const columns = [
    {
      key: "product_id",
      label: "Product ID",
      className: "w-28",
      render: (product: ProductRecord) => <span className="font-mono text-xs text-muted">{product.product_id}</span>,
    },
    {
      key: "name",
      label: "Product",
      render: (product: ProductRecord) => <span className="font-semibold text-ink">{product.name}</span>,
    },
    {
      key: "category",
      label: "Category",
      render: (product: ProductRecord) => product.category ? <Badge tone="sage">{product.category}</Badge> : <span className="text-muted">—</span>,
    },
    {
      key: "sku",
      label: "SKU",
      render: (product: ProductRecord) => <span className="font-mono text-xs tracking-wide text-ink/75">{product.sku}</span>,
    },
    {
      key: "actions",
      label: "Actions",
      className: "w-32 text-right",
      render: (product: ProductRecord) => (
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
        action={<Button disabled={loading || Boolean(loadError)} onClick={openCreate}><span className="text-lg leading-none">+</span>Add product</Button>}
        description="Maintain the product catalog and the component recipes that define each product."
        title="Products"
      />
      <div className="flex flex-wrap items-center gap-2.5 rounded-xl border border-sage bg-sage/45 px-3.5 py-3 text-xs text-forest" role="note">
        <Icon name="database" size={15} />
        <span>Product records, components and BOM relationships are loaded from MySQL.</span>
      </div>
      {feedback && (
        <div className={`flex items-center justify-between rounded-xl px-4 py-3 text-xs font-medium ${feedback.kind === "success" ? "border border-sage bg-sage/45 text-forest" : "border border-red-200 bg-red-50 text-red-800"}`} role={feedback.kind === "success" ? "status" : "alert"}>
          <span>{feedback.message}</span>
          <button aria-label="Dismiss message" className="ml-3 opacity-70 hover:opacity-100" onClick={() => setFeedback(null)} type="button"><Icon name="close" size={15} /></button>
        </div>
      )}
      {loadError && (
        <div className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800 sm:flex-row sm:items-center sm:justify-between" role="alert">
          <span>Products could not be loaded: {loadError}</span>
          <Button className="min-h-9 shrink-0" disabled={loading} onClick={() => void refreshProducts()} size="sm" variant="outline">{loading ? "Loading…" : "Retry"}</Button>
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
        <p aria-live="polite" className="px-1 text-xs text-muted sm:ml-1">{loading ? "Loading products…" : `${filteredProducts.length} product${filteredProducts.length === 1 ? "" : "s"}`}</p>
      </div>

      <DataTable
        columns={columns}
        emptyDescription={loading ? "Loading product records from MySQL…" : loadError ? "Retry to load products from MySQL." : query || categoryFilter !== "all" ? "Adjust your search or choose another category." : "Add a product to begin organizing your catalog."}
        emptyTitle={loading ? "Loading products" : loadError ? "Products unavailable" : query || categoryFilter !== "all" ? "No products match these filters" : "No products yet"}
        rowKey={(product) => product.product_id}
        rows={filteredProducts}
        footerLabel="Live MySQL records"
      />

      {activeDialog?.kind === "form" && (
        <Modal description="Product catalog details are saved to MySQL." onClose={() => !saving && closeDialog()} title={activeDialog.id === null ? "Add product" : "Edit product"}>
          <form className="space-y-4" onSubmit={saveProduct}>
            <FormField error={formError} htmlFor="product-name" label="Product name" required>
              <Input autoFocus id="product-name" maxLength={150} onChange={(event) => { setDraft({ ...draft, name: event.target.value }); setFormError(""); }} placeholder="e.g. FrostGuard Vaccine Monitor" required value={draft.name} />
            </FormField>
            <FormField htmlFor="product-category" label="Category" hint="Optional">
              <Input id="product-category" maxLength={100} onChange={(event) => { setDraft({ ...draft, category: event.target.value }); setFormError(""); }} placeholder="e.g. Cold-Chain Monitoring" value={draft.category} />
            </FormField>
            <FormField error={formError.includes("SKU") ? formError : undefined} htmlFor="product-sku" label="SKU" required>
              <Input autoCapitalize="characters" id="product-sku" maxLength={50} onChange={(event) => { setDraft({ ...draft, sku: event.target.value }); setFormError(""); }} placeholder="e.g. FGVM-TEMP-001" required value={draft.sku} />
            </FormField>
            {!formError.includes("SKU") && formError && <p className="text-xs font-medium text-red-700" role="alert">{formError}</p>}
            <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end">
              <Button disabled={saving} onClick={closeDialog} variant="outline">Cancel</Button>
              <Button disabled={saving || loading || Boolean(loadError)} type="submit">{saving ? "Saving…" : activeDialog.id === null ? "Add product" : "Save changes"}</Button>
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
                <Button disabled={bomLoading || Boolean(bomLoadError) || bomSaving || availableComponents.length === 0} onClick={() => { setAddingBom(true); setBomError(""); }} size="sm" variant="secondary">
                  <span className="text-base leading-none">+</span>Add component
                </Button>
              )}
            </div>

            {bomFeedback && (
              <div className={`mt-3 flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-medium ${bomFeedback.kind === "success" ? "border border-sage bg-sage/45 text-forest" : "border border-red-200 bg-red-50 text-red-800"}`} role={bomFeedback.kind === "success" ? "status" : "alert"}>
                <span>{bomFeedback.message}</span>
                <button aria-label="Dismiss BOM message" className="ml-3 opacity-70 hover:opacity-100" onClick={() => setBomFeedback(null)} type="button"><Icon name="close" size={14} /></button>
              </div>
            )}
            {bomLoadError && (
              <div className="mt-3 flex flex-col gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-xs text-red-800 sm:flex-row sm:items-center sm:justify-between" role="alert">
                <span>Bill of Materials could not be loaded: {bomLoadError}</span>
                <Button className="min-h-8 shrink-0" disabled={bomLoading} onClick={() => void refreshBomData()} size="sm" variant="outline">{bomLoading ? "Loading…" : "Retry"}</Button>
              </div>
            )}

            {addingBom && (
              <form className="mt-4 grid gap-3 rounded-xl border border-sage bg-sage/20 p-3 sm:grid-cols-[1fr_145px_auto] sm:items-end" onSubmit={saveBomEntry}>
                <FormField error={bomError && !bomComponentId ? bomError : undefined} htmlFor="bom-component" label="Component" required>
                  <Select id="bom-component" onChange={(event) => setBomComponentId(event.target.value)} required value={bomComponentId}>
                    <option value="">Choose component</option>
                    {availableComponents.map((component) => <option key={component.component_id} value={component.component_id}>{component.name}</option>)}
                  </Select>
                </FormField>
                <FormField error={bomError && bomComponentId ? bomError : undefined} htmlFor="bom-quantity" label="Quantity required" required>
                  <Input id="bom-quantity" max="9999999999.99" min="0.01" onChange={(event) => setBomQuantity(event.target.value)} required step="0.01" type="number" value={bomQuantity} />
                </FormField>
                <div className="flex gap-2 sm:pb-0.5">
                  <Button disabled={bomSaving || bomLoading || Boolean(bomLoadError)} size="sm" type="submit">{bomSaving ? "Saving…" : "Add"}</Button>
                  <Button disabled={bomSaving} onClick={() => { setAddingBom(false); setBomError(""); }} size="sm" variant="outline">Cancel</Button>
                </div>
              </form>
            )}

            {bomError && !addingBom && <p className="mt-3 text-xs font-medium text-red-700" role="alert">{bomError}</p>}

            {bomLoading && selectedBom.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-line bg-[#FBFBF8] px-4 py-8 text-center" role="status">
                <p className="text-xs font-semibold text-ink">Loading BOM records</p>
                <p className="mt-1 text-[11px] text-muted">Loading this product’s component recipe from MySQL…</p>
              </div>
            ) : !bomLoadError && selectedBom.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-line bg-[#FBFBF8] px-4 py-8 text-center">
                <p className="text-xs font-semibold text-ink">No components in this BOM</p>
                <p className="mt-1 text-[11px] text-muted">Add a component and its required quantity.</p>
              </div>
            ) : selectedBom.length > 0 ? (
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
                          <Input aria-label={`Quantity required for ${component.name}`} className="min-h-9 px-2 text-xs" max="9999999999.99" min="0.01" onChange={(event) => setEditingQuantity(event.target.value)} step="0.01" type="number" value={editingQuantity} />
                        ) : (
                          <span className="font-mono text-xs text-ink/75">{formatBomQuantity(entry.quantity_required)}</span>
                        )}
                        <div className="flex justify-end gap-1">
                          {isRemoving ? (
                            <>
                              <button className="rounded-md px-2 py-1 text-[10px] font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50" disabled={bomDeletingComponentId !== null} onClick={() => void removeBomEntry(entry.product_id, entry.component_id)} type="button">{bomDeletingComponentId === entry.component_id ? "Removing…" : "Remove"}</button>
                              <button className="rounded-md px-2 py-1 text-[10px] font-medium text-muted hover:bg-stone-100 disabled:opacity-50" disabled={bomDeletingComponentId !== null} onClick={() => setRemovingBomId(null)} type="button">Keep</button>
                            </>
                          ) : isEditing ? (
                            <>
                              <button className="rounded-md px-2 py-1 text-[10px] font-semibold text-forest hover:bg-sage/50 disabled:opacity-50" disabled={bomSaving} onClick={() => void saveBomEdit(entry.product_id, entry.component_id)} type="button">{bomSaving ? "Saving…" : "Save"}</button>
                              <button className="rounded-md px-2 py-1 text-[10px] font-medium text-muted hover:bg-stone-100 disabled:opacity-50" disabled={bomSaving} onClick={() => setEditingComponentId(null)} type="button">Cancel</button>
                            </>
                          ) : (
                            <>
                              <button className="rounded-md px-2 py-1 text-[10px] font-semibold text-forest hover:bg-sage/50 disabled:opacity-50" disabled={bomSaving || bomDeletingComponentId !== null} onClick={() => { setEditingComponentId(entry.component_id); setEditingQuantity(formatBomQuantity(entry.quantity_required)); setBomError(""); }} type="button">Edit</button>
                              <button className="rounded-md px-2 py-1 text-[10px] font-medium text-muted hover:bg-red-50 hover:text-red-700" onClick={() => setRemovingBomId(entry.component_id)} type="button">Remove</button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
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
          description={`Delete ${selectedProduct.name} from MySQL? BOM entries or production batches may prevent deletion.`}
          onClose={() => !deleting && closeDialog()}
          onConfirm={confirmDelete}
          title="Delete product"
          confirmLabel={deleting ? "Deleting…" : "Delete product"}
          pending={deleting}
        />
      )}
    </div>
  );
}
