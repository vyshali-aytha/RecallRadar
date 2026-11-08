"use client";

import { useState } from "react";
import { InventoryLocationsSection } from "@/components/inventory/inventory-locations-section";
import { InventoryOverviewSection } from "@/components/inventory/inventory-overview-section";
import { InventoryRecordsSection } from "@/components/inventory/inventory-records-section";
import { MockDataNotice } from "@/components/crud/mock-data-notice";
import { PageHeading } from "@/components/crud/page-heading";
import { Badge } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/icon";
import { useMockData } from "@/lib/mock-data";

type Section = "records" | "locations" | "overview";
const tabs: { id: Section; label: string; icon: "warehouse" | "map-pin" | "chart" }[] = [
  { id: "records", label: "Inventory records", icon: "warehouse" },
  { id: "locations", label: "Inventory locations", icon: "map-pin" },
  { id: "overview", label: "Inventory overview", icon: "chart" },
];

export default function InventoryPage() {
  const [active, setActive] = useState<Section>("records");
  const { inventoryRecords, inventoryLocations } = useMockData();
  const counts: Record<Section, number> = { records: inventoryRecords.length, locations: inventoryLocations.length, overview: inventoryRecords.reduce((sum, row) => sum + row.quantity_on_hand, 0) };
  return <div className="space-y-6">
    <PageHeading description="Track finished product quantities across warehouses and storage locations." title="Inventory" />
    <MockDataNotice />
    <div aria-label="Inventory sections" className="grid grid-cols-1 gap-1.5 rounded-2xl border border-line bg-white p-1.5 shadow-card sm:grid-cols-3" role="tablist">
      {tabs.map((tab) => { const selected = active === tab.id; return <button aria-controls={`${tab.id}-inventory-panel`} aria-selected={selected} className={`flex min-h-12 items-center justify-between gap-3 rounded-xl px-3.5 text-left text-xs font-semibold transition sm:px-4 ${selected ? "bg-forest text-white shadow-sm" : "text-muted hover:bg-stone-50 hover:text-ink"}`} id={`${tab.id}-inventory-tab`} key={tab.id} onClick={() => setActive(tab.id)} role="tab" type="button"><span className="flex items-center gap-2.5"><Icon className={selected ? "text-sage" : "text-muted"} name={tab.icon} size={17} /><span className="uppercase tracking-[0.06em]">{tab.label}</span></span><Badge className={selected ? "border border-white/15 bg-white/10 text-white" : ""} tone={selected ? "forest" : "neutral"}>{counts[tab.id]}</Badge></button>; })}
    </div>
    <div aria-labelledby={`${active}-inventory-tab`} className="min-w-0" id={`${active}-inventory-panel`} role="tabpanel" tabIndex={0}>
      {active === "records" && <InventoryRecordsSection />}{active === "locations" && <InventoryLocationsSection />}{active === "overview" && <InventoryOverviewSection />}
    </div>
  </div>;
}
