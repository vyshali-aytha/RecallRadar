"use client";

import { useState } from "react";
import { AffectedInventorySection } from "@/components/recall-impact/affected-inventory-section";
import { ImpactRecordsSection } from "@/components/recall-impact/impact-records-section";
import { TraceabilitySection } from "@/components/recall-impact/traceability-section";
import { MockDataNotice } from "@/components/crud/mock-data-notice";
import { PageHeading } from "@/components/crud/page-heading";
import { Badge, Card } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/icon";
import { useMockData } from "@/lib/mock-data";

type Section = "overview" | "records" | "traceability" | "inventory";
const tabs: { id: Section; label: string; icon: "chart" | "database" | "activity" | "warehouse" }[] = [
  { id: "overview", label: "Impact overview", icon: "chart" },
  { id: "records", label: "Impact records", icon: "database" },
  { id: "traceability", label: "Traceability", icon: "activity" },
  { id: "inventory", label: "Affected inventory", icon: "warehouse" },
];

export default function RecallImpactPage() {
  const [active, setActive] = useState<Section>("overview");
  const { recallImpacts, recalls, productBatches, inventoryRecords } = useMockData();
  const affectedBatchIds = new Set(recallImpacts.map((impact) => impact.product_batch_id));
  const impactedRecallIds = new Set(recallImpacts.map((impact) => impact.recall_id));
  const totalAffectedInventoryUnits = inventoryRecords.filter((record) => affectedBatchIds.has(record.product_batch_id)).reduce((sum, record) => sum + record.quantity_on_hand, 0);
  const overview = [
    { label: "Impact records", value: recallImpacts.length, icon: "database" as const, detail: "Recorded recall and batch links" },
    { label: "Affected product batches", value: affectedBatchIds.size, icon: "package" as const, detail: "Distinct batches identified" },
    { label: "Recalls with impact", value: impactedRecallIds.size, icon: "shield" as const, detail: `Of ${recalls.length} recall records` },
    { label: "Affected inventory units", value: totalAffectedInventoryUnits.toLocaleString(), icon: "warehouse" as const, detail: "Current units across affected batches" },
  ];
  const counts: Record<Section, number> = { overview: recallImpacts.length, records: recallImpacts.length, traceability: recalls.length, inventory: inventoryRecords.filter((record) => affectedBatchIds.has(record.product_batch_id)).length };

  return <div className="space-y-6">
    <PageHeading description="Trace recall impacts through production batches, component sources and current inventory." title="Recall impact & traceability" />
    <MockDataNotice />
    <div aria-label="Recall impact sections" className="grid grid-cols-1 gap-1.5 rounded-2xl border border-line bg-white p-1.5 shadow-card sm:grid-cols-2 xl:grid-cols-4" role="tablist">{tabs.map((tab) => { const selected = active === tab.id; return <button aria-controls={`${tab.id}-impact-panel`} aria-selected={selected} className={`flex min-h-12 items-center justify-between gap-2 rounded-xl px-3 text-left text-xs font-semibold transition ${selected ? "bg-forest text-white shadow-sm" : "text-muted hover:bg-stone-50 hover:text-ink"}`} id={`${tab.id}-impact-tab`} key={tab.id} onClick={() => setActive(tab.id)} role="tab" type="button"><span className="flex min-w-0 items-center gap-2"><Icon className={selected ? "text-sage" : "text-muted"} name={tab.icon} size={16} /><span className="truncate uppercase tracking-[0.05em]">{tab.label}</span></span><Badge className={selected ? "border border-white/15 bg-white/10 text-white" : ""} tone={selected ? "forest" : "neutral"}>{counts[tab.id]}</Badge></button>; })}</div>
    <div aria-labelledby={`${active}-impact-tab`} className="min-w-0" id={`${active}-impact-panel`} role="tabpanel" tabIndex={0}>
      {active === "overview" && <section className="space-y-5"><div><p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted">Current coverage</p><h2 className="mt-1 text-lg font-semibold text-ink">Impact overview</h2><p className="mt-1 text-xs text-muted">All metrics are calculated from the shared temporary mock records.</p></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{overview.map((metric) => <Card className="flex items-start justify-between gap-3" key={metric.label}><div><p className="text-xs font-medium text-muted">{metric.label}</p><p className="mt-2 text-3xl font-semibold tracking-tight text-ink">{metric.value}</p><p className="mt-2 text-[11px] text-muted">{metric.detail}</p></div><span className="flex size-10 items-center justify-center rounded-xl bg-sage/60 text-forest"><Icon name={metric.icon} size={19} /></span></Card>)}</div><p className="text-xs leading-5 text-muted">Affected inventory is derived by matching each impact’s <span className="font-mono">product_batch_id</span> to inventory records. It is not a direct recall-to-inventory relationship.</p></section>}
      {active === "records" && <ImpactRecordsSection />}
      {active === "traceability" && <TraceabilitySection />}
      {active === "inventory" && <AffectedInventorySection />}
    </div>
  </div>;
}
