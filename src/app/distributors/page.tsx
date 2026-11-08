"use client";

import { useState } from "react";
import { DistributorsSection } from "@/components/distributors/distributors-section";
import { ShipmentsSection } from "@/components/distributors/shipments-section";
import { MockDataNotice } from "@/components/crud/mock-data-notice";
import { PageHeading } from "@/components/crud/page-heading";
import { Badge } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/icon";
import { useMockData } from "@/lib/mock-data";

type Section = "distributors" | "shipments";
const tabs: { id: Section; label: string; icon: "truck" | "package" }[] = [{ id: "distributors", label: "Distributors", icon: "truck" }, { id: "shipments", label: "Shipments", icon: "package" }];

export default function DistributorsPage() {
  const [active, setActive] = useState<Section>("distributors"); const { distributors, shipments } = useMockData();
  const counts: Record<Section, number> = { distributors: distributors.length, shipments: shipments.length };
  return <div className="space-y-6"><PageHeading description="Manage downstream distribution partners and trace product batches through outbound shipments." title="Distributors" /><MockDataNotice />
    <div aria-label="Distributor management sections" className="grid grid-cols-1 gap-1.5 rounded-2xl border border-line bg-white p-1.5 shadow-card sm:grid-cols-2" role="tablist">{tabs.map((tab) => { const selected = active === tab.id; return <button aria-controls={`${tab.id}-distributor-panel`} aria-selected={selected} className={`flex min-h-12 items-center justify-between gap-3 rounded-xl px-3.5 text-left text-xs font-semibold transition sm:px-4 ${selected ? "bg-forest text-white shadow-sm" : "text-muted hover:bg-stone-50 hover:text-ink"}`} id={`${tab.id}-distributor-tab`} key={tab.id} onClick={() => setActive(tab.id)} role="tab" type="button"><span className="flex items-center gap-2.5"><Icon className={selected ? "text-sage" : "text-muted"} name={tab.icon} size={17} /><span className="uppercase tracking-[0.06em]">{tab.label}</span></span><Badge className={selected ? "border border-white/15 bg-white/10 text-white" : ""} tone={selected ? "forest" : "neutral"}>{counts[tab.id]}</Badge></button>; })}</div>
    <div aria-labelledby={`${active}-distributor-tab`} className="min-w-0" id={`${active}-distributor-panel`} role="tabpanel" tabIndex={0}>{active === "distributors" ? <DistributorsSection /> : <ShipmentsSection />}</div>
  </div>;
}
