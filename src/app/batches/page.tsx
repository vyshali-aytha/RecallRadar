"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeading } from "@/components/crud/page-heading";
import { BatchCompositionSection } from "@/components/batches/batch-composition-section";
import { ComponentBatchesSection } from "@/components/batches/component-batches-section";
import { ProductBatchesSection } from "@/components/batches/product-batches-section";
import { Badge } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/icon";
import {
  getAllComponentBatches,
  getAllProductBatches,
  getAllProductBatchComponents,
} from "@/lib/member-a-actions";
import { APPLICATION_DATA_CHANGED_EVENT, safeActionError } from "@/lib/member-b-client";

type BatchSection = "component" | "product" | "composition";

const tabs: { id: BatchSection; label: string; icon: "layers" | "package" | "activity" }[] = [
  { id: "component", label: "Component batches", icon: "layers" },
  { id: "product", label: "Product batches", icon: "package" },
  { id: "composition", label: "Batch composition", icon: "activity" },
];

export default function BatchesPage() {
  const [activeSection, setActiveSection] = useState<BatchSection>("component");
  const [counts, setCounts] = useState<Record<BatchSection, number>>({ component: 0, product: 0, composition: 0 });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const refreshCounts = useCallback(async () => {
    setLoading(true);
    try {
      const [components, products, compositions] = await Promise.all([
        getAllComponentBatches(),
        getAllProductBatches(),
        getAllProductBatchComponents(),
      ]);
      if (!components.success) throw new Error(components.error);
      if (!products.success) throw new Error(products.error);
      if (!compositions.success) throw new Error(compositions.error);
      setCounts({
        component: components.data.length,
        product: products.data.length,
        composition: compositions.data.length,
      });
      setLoadError("");
    } catch (error) {
      setLoadError(safeActionError(error, "Batch counts could not be loaded."));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => { void refreshCounts(); }, 0);
    window.addEventListener(APPLICATION_DATA_CHANGED_EVENT, refreshCounts);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(APPLICATION_DATA_CHANGED_EVENT, refreshCounts);
    };
  }, [refreshCounts]);

  return (
    <div className="space-y-6">
      <PageHeading
        description="Manage incoming component lots, finished production runs, and the batch-level links between them."
        title="Batches"
      />
      {loading && <p className="text-xs text-muted" role="status">Loading batch counts…</p>}
      {loadError && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800" role="alert">{loadError}</p>}

      <div aria-label="Batch management sections" className="grid grid-cols-1 gap-1.5 rounded-2xl border border-line bg-white p-1.5 shadow-card sm:grid-cols-3" role="tablist">
        {tabs.map((tab) => {
          const selected = activeSection === tab.id;
          return (
            <button
              aria-controls={`${tab.id}-batch-panel`}
              aria-selected={selected}
              className={`flex min-h-12 items-center justify-between gap-3 rounded-xl px-3.5 text-left text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-forest sm:px-4 ${selected ? "bg-forest text-white shadow-sm" : "text-muted hover:bg-stone-50 hover:text-ink"}`}
              id={`${tab.id}-batch-tab`}
              key={tab.id}
              onClick={() => setActiveSection(tab.id)}
              role="tab"
              type="button"
            >
              <span className="flex min-w-0 items-center gap-2.5">
                <Icon className={selected ? "text-sage" : "text-muted"} name={tab.icon} size={17} />
                <span className="truncate uppercase tracking-[0.06em]">{tab.label}</span>
              </span>
              <Badge className={selected ? "border border-white/15 bg-white/10 text-white" : ""} tone={selected ? "forest" : "neutral"}>
                {loading ? "…" : counts[tab.id]}
              </Badge>
            </button>
          );
        })}
      </div>

      <div
        aria-labelledby={`${activeSection}-batch-tab`}
        className="min-w-0"
        id={`${activeSection}-batch-panel`}
        role="tabpanel"
        tabIndex={0}
      >
        {activeSection === "component" && <ComponentBatchesSection />}
        {activeSection === "product" && <ProductBatchesSection />}
        {activeSection === "composition" && <BatchCompositionSection />}
      </div>
    </div>
  );
}
