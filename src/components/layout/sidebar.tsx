"use client";

import Link from "next/link";
import { navigationItems } from "@/lib/navigation";
import { Icon } from "@/components/ui/icon";

type SidebarProps = {
  pathname: string;
  open: boolean;
  onNavigate: () => void;
  onClose: () => void;
};

function isActivePath(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({ pathname, open, onNavigate, onClose }: SidebarProps) {
  return (
    <>
      {open && (
        <button
          aria-label="Close navigation menu"
          className="fixed inset-0 z-40 bg-forest/45 backdrop-blur-[2px] lg:hidden"
          onClick={onClose}
          type="button"
        />
      )}
      <aside
        aria-label="Primary navigation"
        className={`fixed inset-y-0 left-0 z-50 flex w-[272px] flex-col bg-forest text-white shadow-xl transition-transform duration-300 ease-out lg:translate-x-0 lg:shadow-none ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex h-[84px] items-center justify-between border-b border-white/10 px-6">
          <Link
            aria-label="RecallRadar dashboard"
            className="flex items-center gap-3 rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sage"
            href="/"
            onClick={onNavigate}
          >
            <span className="flex size-10 items-center justify-center rounded-xl bg-sage text-forest shadow-sm">
              <Icon name="radar" size={23} />
            </span>
            <span className="leading-tight">
              <span className="block text-[15px] font-semibold tracking-tight">RecallRadar</span>
              <span className="mt-1 block text-[10px] font-medium uppercase tracking-[0.2em] text-white/55">
                Supply intelligence
              </span>
            </span>
          </Link>
          <button
            aria-label="Close navigation menu"
            className="rounded-lg p-2 text-white/70 transition hover:bg-white/10 hover:text-white lg:hidden"
            onClick={onClose}
            type="button"
          >
            <Icon name="close" />
          </button>
        </div>

        <div className="px-4 pt-7">
          <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.19em] text-white/42">
            Workspace
          </p>
          <nav className="mt-3 space-y-1" aria-label="Workspace">
            {navigationItems.map((item) => {
              const active = isActivePath(pathname, item.href);

              return (
                <Link
                  aria-current={active ? "page" : undefined}
                  className={`group flex min-h-11 items-center gap-3 rounded-xl px-3 text-[13px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage ${active ? "bg-sage text-forest shadow-sm" : "text-white/72 hover:bg-white/8 hover:text-white"}`}
                  href={item.href}
                  key={item.href}
                  onClick={onNavigate}
                  prefetch={false}
                >
                  <Icon
                    className={active ? "text-forest" : "text-white/62 group-hover:text-sage"}
                    name={item.icon}
                    size={18}
                  />
                  <span>{item.label}</span>
                  {item.href === "/recalls" && (
                    <span className={`ml-auto size-1.5 rounded-full ${active ? "bg-amber" : "bg-amber/90"}`} />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto p-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-sage">
                <Icon name="activity" size={16} />
              </span>
              <div>
                <p className="text-xs font-semibold text-white">Trace with confidence</p>
                <p className="mt-1.5 text-[11px] leading-5 text-white/55">
                  Follow components from supplier to finished batch.
                </p>
              </div>
            </div>
          </div>
          <p className="px-1 pt-4 text-[10px] tracking-wide text-white/35">
            RECALLRADAR · OPERATIONS
          </p>
        </div>
      </aside>
    </>
  );
}
