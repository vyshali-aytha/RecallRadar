"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/icon";

type CheckStatus = { state: "checking" | "connected" | "not-connected"; detail: string };
type CheckResult = { success?: boolean; message?: string; dbName?: string };

async function checkEndpoint(path: string, label: string): Promise<CheckStatus> {
  try {
    const response = await fetch(path, { method: "GET", credentials: "same-origin", cache: "no-store", headers: { Accept: "application/json" } });
    const result = await response.json().catch(() => null) as CheckResult | null;
    if (!response.ok || result?.success !== true) return { state: "not-connected", detail: `${label} is not connected.` };
    return { state: "connected", detail: result.dbName ? `Connected to ${result.dbName}.` : `${label} connection check passed.` };
  } catch {
    return { state: "not-connected", detail: `${label} status could not be retrieved.` };
  }
}

const initial: CheckStatus = { state: "checking", detail: "Checking connection…" };

export function AdminSystemStatus({ compact = false }: { compact?: boolean }) {
  const [mysql, setMysql] = useState<CheckStatus>(initial);
  const [neo4j, setNeo4j] = useState<CheckStatus>(initial);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    const [database, graph] = await Promise.all([checkEndpoint("/api/db-test", "MySQL"), checkEndpoint("/api/neo4j-test", "Neo4j")]);
    setMysql(database);
    setNeo4j(graph);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void refresh(); }, 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  const services = [
    { name: "MySQL database", icon: "database" as const, status: mysql },
    { name: "Neo4j graph", icon: "radar" as const, status: neo4j },
  ];
  return <section className={compact ? "space-y-3" : "space-y-5"}>
    {!compact && <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.17em] text-[#74807b]">Live checks</p><h2 className="rr-heading mt-1 text-xl font-bold text-[#1d2926]">System status</h2><p className="mt-1 text-sm text-[#74807b]">Status comes from the existing connection-check APIs.</p></div><button className="min-h-10 rounded-xl border border-[#dfe3dd] bg-white px-3.5 text-xs font-bold text-[#1e5045] transition hover:bg-[#f3f6e7] disabled:opacity-60" disabled={refreshing} onClick={() => void refresh()} type="button">{refreshing ? "Checking…" : "Refresh status"}</button></div>}
    <div className={`grid gap-3 ${compact ? "sm:grid-cols-2" : "lg:grid-cols-2"}`}>{services.map((service) => { const active = service.status.state === "connected"; const pending = service.status.state === "checking"; return <Card className="border-[#e4e6df] bg-[#fbfbf8] p-4 sm:p-5" key={service.name}><div className="flex items-start justify-between gap-4"><span className="flex size-10 items-center justify-center rounded-[13px] bg-[#e9f0e9] text-[#1e5045]"><Icon name={service.icon} size={18} /></span><span className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.1em] ${active ? "bg-[#e7f1e8] text-[#286747]" : pending ? "bg-[#f0f0e9] text-[#74807b]" : "bg-[#fbebe7] text-[#a64232]"}`}><span className={`size-1.5 rounded-full ${active ? "bg-[#3e8a5d]" : pending ? "bg-[#aab2ac]" : "bg-[#c8563e]"}`} />{active ? "Connected" : pending ? "Checking" : "Not connected"}</span></div><h3 className="mt-4 text-sm font-bold text-[#1d2926]">{service.name}</h3><p className="mt-1 text-xs leading-5 text-[#74807b]">{service.status.detail}</p></Card>; })}</div>
    {compact && <button className="text-left text-[11px] font-bold text-[#1e5045] underline decoration-[#1e5045]/25 underline-offset-4" disabled={refreshing} onClick={() => void refresh()} type="button">{refreshing ? "Refreshing status…" : "Refresh system checks"}</button>}
  </section>;
}
