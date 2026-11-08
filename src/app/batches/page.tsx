"use client";

import { useState } from "react";
import { MockDataNotice } from "@/components/crud/mock-data-notice";
import { PageHeading } from "@/components/crud/page-heading";
import { BatchCompositionSection } from "@/components/batches/batch-composition-section";
import { ComponentBatchesSection } from "@/components/batches/component-batches-section";
import { ProductBatchesSection } from "@/components/batches/product-batches-section";
import { Badge } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/icon";
import { useMockData } from "@/lib/mock-data";

type BatchSection = "component" | "product" | "composition";

const tabs: { id: BatchSection; label: string; icon: "layers" | "package" | "activity" }[] = [
  { id: "component", label: "Component batches", icon: "layers" },
  { id: "product", label: "Product batches", icon: "package" },
  { id: "composition", label: "Batch composition", icon: "activity" },
];

export default function BatchesPage() {
  const [activeSection, setActiveSection] = useState<BatchSection>("component");
  const { componentBatches, productBatches, batchCompositions } = useMockData();
  const counts: Record<BatchSection, number> = {
    component: componentBatches.length,
    product: productBatches.length,
    composition: batchCompositions.length,
  };

  return (
    <div className="space-y-6">
      <PageHeading
        description="Manage incoming component lots, finished production runs, and the batch-level links between them."
        title="Batches"
      />
      <MockDataNotice />

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
                {counts[tab.id]}
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
