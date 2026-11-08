"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { navigationItems } from "@/lib/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { TopHeader } from "@/components/layout/top-header";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
