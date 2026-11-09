"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { navigationItems } from "@/lib/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { TopHeader } from "@/components/layout/top-header";
import { useSession } from "@/lib/session-context";
import { Button } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/icon";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { status, user, refreshSession } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isAdminPath = pathname === "/admin" || pathname.startsWith("/admin/");

  useEffect(() => {
    if (pathname !== "/login" && status === "unauthenticated") router.replace("/login");
    if (isAdminPath && status === "authenticated" && user?.role !== "Admin") router.replace("/");
  }, [isAdminPath, pathname, router, status, user?.role]);

  if (pathname === "/login") return <>{children}</>;

  if (status === "loading" || status === "unauthenticated") {
    return <div className="flex min-h-screen items-center justify-center bg-ivory px-6 text-center"><div><span aria-hidden="true" className="mx-auto flex size-12 animate-pulse items-center justify-center rounded-2xl bg-forest text-sage"><Icon name="radar" size={25} /></span><p className="mt-4 text-sm font-semibold text-ink">Checking your RecallRadar session</p><p className="mt-1 text-xs text-muted">Please wait while we verify your sign-in.</p></div></div>;
  }

  if (status === "error") {
    return <div className="flex min-h-screen items-center justify-center bg-ivory px-6"><div className="max-w-sm rounded-2xl border border-line bg-white p-6 text-center shadow-card"><h1 className="text-base font-semibold text-ink">Session unavailable</h1><p className="mt-2 text-sm leading-6 text-muted">RecallRadar could not verify your session. Try again to continue.</p><Button className="mt-5" onClick={() => void refreshSession()}>Retry session check</Button><button className="mt-3 block w-full text-xs font-medium text-muted underline" onClick={() => router.replace("/login")} type="button">Go to sign in</button></div></div>;
  }

  if (isAdminPath) {
    if (user?.role !== "Admin") return <div className="flex min-h-screen items-center justify-center bg-ivory px-6 text-center"><p className="text-sm font-medium text-muted">Returning to your workspace…</p></div>;
    return <>{children}</>;
  }

  const page = navigationItems.find((item) =>
    item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
  const title = page?.label ?? "Workspace";

  return (
    <div className="min-h-screen bg-ivory text-ink">
      <Sidebar
        onClose={() => setSidebarOpen(false)}
        onNavigate={() => setSidebarOpen(false)}
        open={sidebarOpen}
        pathname={pathname}
      />
      <div className="min-h-screen lg:pl-[272px]">
        <TopHeader onMenuClick={() => setSidebarOpen(true)} title={title} />
        <main className="mx-auto w-full max-w-[1600px] px-4 py-7 sm:px-7 sm:py-9 lg:px-10 lg:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
