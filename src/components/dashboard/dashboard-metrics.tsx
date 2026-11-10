"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/primitives";
import { Icon, type IconName } from "@/components/ui/icon";

type Summary = {
  totalProducts: number;
  totalSuppliers: number;
  totalComponentBatches: number;
  activeRecalls: number;
};

const metrics: { label: string; detail: string; icon: IconName; key: keyof Summary }[] = [
  { label: "Suppliers", detail: "Supply partners in MySQL", icon: "truck", key: "totalSuppliers" },
  { label: "Products", detail: "Product catalog records", icon: "box", key: "totalProducts" },
  { label: "Component batches", detail: "Incoming lots in MySQL", icon: "layers", key: "totalComponentBatches" },
  { label: "Active recalls", detail: "Open or in-progress recalls", icon: "shield", key: "activeRecalls" },
];

export function DashboardMetrics() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/dashboard/summary", {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      const result = await response.json().catch(() => null) as { summary?: Summary; error?: string } | null;
      if (!response.ok) {
        if (response.status === 401) throw new Error("Sign in to view live dashboard metrics.");
        if (response.status === 403) throw new Error("Your account cannot view dashboard metrics.");
        throw new Error(result?.error || "Dashboard metrics could not be loaded.");
      }
      if (!result?.summary) throw new Error("The server returned an invalid dashboard summary.");
      setSummary(result.summary);
    } catch (reason) {
      setSummary(null);
      setError(reason instanceof Error ? reason.message : "Dashboard metrics could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void refresh(); }, 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  return <>
    {loading && <p className="mb-3 text-xs text-muted" role="status">Loading database metrics…</p>}
    {error && <p className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800" role="alert">{error}</p>}
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((item) => (
        <Card className="flex min-h-[142px] flex-col justify-between" key={item.key}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-muted">{item.label}</p>
              <p className="mt-3 text-[28px] font-semibold leading-none tracking-tight text-ink">
                {loading || !summary ? "—" : summary[item.key].toLocaleString()}
              </p>
            </div>
            <span className="flex size-9 items-center justify-center rounded-xl bg-sage/70 text-forest">
              <Icon name={item.icon} size={17} />
            </span>
          </div>
          <p className="text-[11px] text-muted">{item.detail}</p>
        </Card>
      ))}
    </div>
  </>;
}
