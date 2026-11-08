"use client";

import { Card } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/icon";
import { useMockData } from "@/lib/mock-data";

export function InventoryOverviewSection() {
  const { inventoryRecords, inventoryLocations } = useMockData();
  const totalUnits = inventoryRecords.reduce((sum, row) => sum + row.quantity_on_hand, 0);
  const metrics = [
    { label: "Inventory records", value: inventoryRecords.length, icon: "database" as const, detail: "Distinct batch and location pairs" },
    { label: "Locations", value: inventoryLocations.length, icon: "warehouse" as const, detail: "Configured storage points" },
    { label: "Units on hand", value: totalUnits.toLocaleString(), icon: "package" as const, detail: "Sum of current mock quantities" },
  ];
  return <section className="space-y-5"><div><p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted">At a glance</p><h2 className="mt-1 text-lg font-semibold text-ink">Inventory overview</h2><p className="mt-1 text-xs text-muted">Live totals calculated from the current temporary mock records.</p></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{metrics.map((metric) => <Card className="flex items-start justify-between gap-4" key={metric.label}><div><p className="text-xs font-medium text-muted">{metric.label}</p><p className="mt-2 text-3xl font-semibold tracking-tight text-ink">{metric.value}</p><p className="mt-2 text-xs text-muted">{metric.detail}</p></div><span className="flex size-11 items-center justify-center rounded-2xl bg-sage/60 text-forest"><Icon name={metric.icon} size={20} /></span></Card>)}</div></section>;
}
