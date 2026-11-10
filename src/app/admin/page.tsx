"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AdminSystemStatus } from "@/components/admin/admin-system-status";
import { AdminSupplierUtilization } from "@/components/admin/admin-supplier-utilization";
import { AdminUsersPanel } from "@/components/admin/admin-users-panel";
import { Badge, Card } from "@/components/ui/primitives";
import { Icon, type IconName } from "@/components/ui/icon";
import { useSession } from "@/lib/session-context";

type AdminSection = "overview" | "users" | "system" | "supplier-utilization";
const items: { id: AdminSection | "recalls"; label: string; icon: IconName; href?: string }[] = [
  { id: "overview", label: "Overview", icon: "dashboard" },
  { id: "users", label: "User Management", icon: "users" },
  { id: "recalls", label: "Recall Management", icon: "shield", href: "/recalls" },
  { id: "supplier-utilization", label: "Supplier Batch Utilization", icon: "chart" },
  { id: "system", label: "System Status", icon: "activity" },
];

function AdminLoading() {
  return <div className="rr-premium flex min-h-screen items-center justify-center bg-[#f4f3ed] px-6"><div className="text-center"><span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-[#1e5045] text-[#d6e675]"><Icon name="radar" size={24} /></span><p className="rr-heading mt-4 text-sm font-bold text-[#1d2926]">Verifying administrator access</p><p className="mt-1 text-xs text-[#74807b]">Please wait while RecallRadar checks your session.</p></div></div>;
}

type AdminSummary = {
  totalUsers: number;
  adminUsers: number;
  staffUsers: number;
  totalRecalls: number;
  activeRecalls: number;
};

function AdminMetric({ title, value, description, icon, loading }: { title: string; value: number | null; description: string; icon: IconName; loading: boolean }) {
  return <Card className="border-[#e6e7e1] bg-[#fbfbf8] p-4 sm:p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold text-[#74807b]">{title}</p><p className="rr-heading mt-3 text-lg font-bold tracking-tight text-[#1d2926]">{loading ? "Loading…" : value === null ? "Unavailable" : value.toLocaleString()}</p><p className="mt-1 text-[11px] leading-5 text-[#74807b]">{description}</p></div><span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#e8efe8] text-[#1e5045]"><Icon name={icon} size={17} /></span></div></Card>;
}

export default function AdminPage() {
  const router = useRouter();
  const { user, status, logout } = useSession();
  const [active, setActive] = useState<AdminSection>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState("");

  const loadSummary = useCallback(async () => {
    try {
      const response = await fetch("/api/dashboard/summary", {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      const result = await response.json().catch(() => null) as { summary?: AdminSummary; error?: string } | null;
      if (!response.ok || !result?.summary) {
        setSummary(null);
        setSummaryError(response.status === 401
          ? "Your session has expired. Sign in again."
          : response.status === 403
            ? "Your account cannot view these metrics."
            : result?.error || "Admin metrics could not be loaded.");
        return;
      }
      setSummary(result.summary);
      setSummaryError("");
    } catch {
      setSummary(null);
      setSummaryError("Admin metrics could not be loaded.");
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status !== "authenticated" || user?.role !== "Admin") return;
    const timer = window.setTimeout(() => { void loadSummary(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadSummary, status, user?.role]);

  async function signOut() {
    if (loggingOut) return;
    setLoggingOut(true);
    setLogoutError("");
    try { await logout(); router.replace("/login"); } catch { setLogoutError("Sign out could not be completed. Try again."); }
    finally { setLoggingOut(false); }
  }

  if (status !== "authenticated" || !user || user.role !== "Admin") return <AdminLoading />;
  const initials = user.name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "A";

  return <div className="rr-premium min-h-screen bg-[#f4f3ed] text-[#1d2926]">
    {sidebarOpen && <button aria-label="Close admin navigation" className="fixed inset-0 z-40 bg-[#143c34]/45 lg:hidden" onClick={() => setSidebarOpen(false)} type="button" />}
    <aside aria-label="Admin navigation" className={`fixed inset-y-0 left-0 z-50 flex w-[258px] flex-col bg-[#1e5045] text-white transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
      <div className="flex min-h-[82px] items-center justify-between border-b border-white/10 px-5"><Link className="flex items-center gap-3" href="/admin"><span className="flex size-10 items-center justify-center rounded-[13px] bg-[#d6e675] text-[#1e5045]"><Icon name="radar" size={22} /></span><span><span className="block text-sm font-bold tracking-tight">RecallRadar</span><span className="mt-0.5 block text-[9px] font-semibold uppercase tracking-[0.17em] text-white/55">Admin console</span></span></Link><button aria-label="Close admin navigation" className="rounded-lg p-2 text-white/70 hover:bg-white/10 lg:hidden" onClick={() => setSidebarOpen(false)} type="button"><Icon name="close" size={18} /></button></div>
      <div className="px-3 pt-6"><p className="px-3 text-[9px] font-bold uppercase tracking-[0.19em] text-white/45">Administration</p><nav aria-label="Admin sections" className="mt-3 space-y-1">{items.map((item) => item.href ? <Link className="group flex min-h-11 items-center gap-3 rounded-xl px-3 text-[12px] font-semibold text-white/75 transition hover:bg-white/10 hover:text-white" href={item.href} key={item.id} onClick={() => setSidebarOpen(false)}><Icon className="text-white/60 group-hover:text-[#d6e675]" name={item.icon} size={17} /><span>{item.label}</span></Link> : <button aria-current={active === item.id ? "page" : undefined} className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-[12px] font-semibold transition ${active === item.id ? "bg-[#d6e675] text-[#1e5045]" : "text-white/75 hover:bg-white/10 hover:text-white"}`} key={item.id} onClick={() => { setActive(item.id as AdminSection); setSidebarOpen(false); }} type="button"><Icon className={active === item.id ? "text-[#1e5045]" : "text-white/60"} name={item.icon} size={17} /><span>{item.label}</span>{active === item.id && <span className="ml-auto size-1.5 rounded-full bg-[#c8563e]" />}</button>)}</nav></div>
      <div className="mt-auto p-4"><div className="rounded-2xl border border-white/12 bg-[#143f36]/55 p-4"><div className="flex items-center gap-3"><span className="flex size-9 items-center justify-center rounded-xl bg-white/10 text-[#d6e675]"><Icon name="shield" size={16} /></span><div><p className="text-xs font-bold">Administrator access</p><p className="mt-1 text-[10px] text-white/55">Verified from your session</p></div></div></div><p className="px-1 pt-4 text-[9px] font-semibold tracking-[0.14em] text-white/35">RECALLRADAR · ADMIN</p></div>
    </aside>

    <div className="min-h-screen lg:pl-[258px]">
      <header className="sticky top-0 z-30 border-b border-[#e4e6df] bg-[#f4f3ed]/95 backdrop-blur"><div className="flex min-h-[78px] items-center justify-between gap-3 px-4 sm:px-7 lg:px-9"><div className="flex min-w-0 items-center gap-3"><button aria-label="Open admin navigation" className="flex size-10 items-center justify-center rounded-xl border border-[#dfe3dd] bg-white text-[#1e5045] lg:hidden" onClick={() => setSidebarOpen(true)} type="button"><Icon name="menu" size={18} /></button><div className="min-w-0"><p className="text-[9px] font-bold uppercase tracking-[0.17em] text-[#74807b]">RecallRadar <span className="px-1 text-[#c2c8c1]">/</span> Admin</p><h1 className="rr-heading mt-0.5 truncate text-[16px] font-bold text-[#1d2926] sm:text-lg">{active === "overview" ? "Overview" : active === "users" ? "User Management" : active === "system" ? "System Status" : "Supplier Batch Utilization"}</h1></div></div><div className="flex shrink-0 items-center gap-2 sm:gap-3"><div className="hidden text-right sm:block"><p className="max-w-40 truncate text-xs font-bold text-[#1d2926]">{user.name}</p><p className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#1e5045]">{user.role}</p></div><span className="flex size-9 items-center justify-center rounded-xl bg-[#1e5045] text-[11px] font-bold text-white">{initials}</span><button className="min-h-9 rounded-lg px-2 text-[11px] font-bold text-[#58645f] hover:bg-white disabled:opacity-60" disabled={loggingOut} onClick={() => void signOut()} type="button">{loggingOut ? "Signing out…" : <><span className="hidden sm:inline">Sign out</span><span className="sm:hidden">Exit</span></>}</button></div></div></header>
      <main className="mx-auto w-full max-w-[1500px] space-y-6 px-4 py-6 sm:px-7 sm:py-8 lg:px-9 lg:py-9">
        {logoutError && <div className="rounded-xl border border-[#c8563e]/20 bg-[#c8563e]/[0.06] px-4 py-3 text-xs text-[#a64232]" role="alert">{logoutError}</div>}
        {active === "overview" && <>
          <section className="flex flex-col gap-4 rounded-[24px] bg-[#1e5045] px-5 py-6 text-white shadow-[0_12px_32px_rgba(30,80,69,0.12)] sm:flex-row sm:items-center sm:justify-between sm:px-7"><div><p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#d6e675]">Administrator overview</p><h2 className="rr-heading mt-2 text-2xl font-bold tracking-[-0.035em] sm:text-[30px]">Welcome, {user.name}</h2><p className="mt-2 max-w-xl text-xs leading-5 text-white/70">Review account administration and system connectivity from your RecallRadar console.</p></div><Badge className="w-fit border border-[#d6e675]/30 bg-[#d6e675] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#1e5045]" tone="sage">Admin</Badge></section>
          <section className="space-y-3"><div><p className="text-[9px] font-bold uppercase tracking-[0.17em] text-[#74807b]">Workspace metrics</p><h2 className="rr-heading mt-1 text-base font-bold text-[#1d2926]">Accounts & recalls</h2></div>{summaryError && <p className="rounded-xl border border-[#c8563e]/20 bg-[#c8563e]/[0.06] px-4 py-3 text-xs text-[#a64232]" role="alert">{summaryError}</p>}<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><AdminMetric description="Application accounts in MySQL" icon="users" loading={summaryLoading} title="User statistics" value={summary?.totalUsers ?? null} /><AdminMetric description={`${summary?.adminUsers ?? "—"} Admin · ${summary?.staffUsers ?? "—"} Staff`} icon="shield" loading={summaryLoading} title="Admin and Staff split" value={summary ? summary.adminUsers + summary.staffUsers : null} /><AdminMetric description="Stored recall records" icon="activity" loading={summaryLoading} title="Recall statistics" value={summary?.totalRecalls ?? null} /><AdminMetric description="Open or in-progress recalls" icon="chart" loading={summaryLoading} title="Active recalls" value={summary?.activeRecalls ?? null} /></div></section>
          <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]"><Card className="border-[#e6e7e1] bg-[#fbfbf8] p-4 sm:p-5"><div className="mb-4 flex items-start justify-between gap-3"><div><p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#74807b]">Activity feed</p><h2 className="rr-heading mt-1 text-base font-bold text-[#1d2926]">Recent activity</h2></div><span className="flex size-9 items-center justify-center rounded-xl bg-[#e8efe8] text-[#1e5045]"><Icon name="clock" size={17} /></span></div><div className="flex min-h-32 flex-col items-center justify-center rounded-xl border border-dashed border-[#dfe3dd] bg-white px-5 text-center"><span className="flex size-8 items-center justify-center rounded-lg bg-[#f0f2ec] text-[#74807b]"><Icon name="activity" size={15} /></span><p className="mt-3 text-xs font-bold text-[#1d2926]">Activity feed unavailable</p><p className="mt-1 max-w-sm text-[10px] leading-4 text-[#74807b]">Awaiting a backend activity endpoint. No events are fabricated for this view.</p></div></Card><Card className="border-[#e6e7e1] bg-[#fbfbf8] p-4 sm:p-5"><div className="mb-4"><p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#74807b]">Service health</p><h2 className="rr-heading mt-1 text-base font-bold text-[#1d2926]">Connection status</h2></div><AdminSystemStatus compact /></Card></div>
        </>}
        {active === "users" && <AdminUsersPanel />}
        {active === "supplier-utilization" && <AdminSupplierUtilization />}
        {active === "system" && <AdminSystemStatus />}
      </main>
    </div>
  </div>;
}
