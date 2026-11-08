"use client";

import { useState } from "react";
import { Button } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/icon";

type TopHeaderProps = {
  title: string;
  onMenuClick: () => void;
};

export function TopHeader({ title, onMenuClick }: TopHeaderProps) {
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-line/80 bg-ivory/90 backdrop-blur-xl">
      <div className="mx-auto flex min-h-[84px] max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-7 lg:px-10">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            aria-label="Open navigation menu"
            className="size-10 shrink-0 px-0 lg:hidden"
            onClick={onMenuClick}
            variant="outline"
          >
            <Icon name="menu" />
          </Button>
          <div className="min-w-0">
            <nav aria-label="Breadcrumb" className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-muted">
              <span>Workspace</span>
              <Icon name="chevron-right" size={12} />
              <span aria-current="page" className="truncate text-forest">{title}</span>
            </nav>
            <h1 className="truncate text-lg font-semibold tracking-tight text-ink sm:text-xl">
              {title}
            </h1>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <Button
            aria-label="Notifications"
            className="relative size-10 px-0 text-muted"
            variant="ghost"
          >
            <Icon name="bell" size={19} />
            <span className="absolute right-[9px] top-[8px] size-1.5 rounded-full bg-amber ring-2 ring-ivory" />
          </Button>
          <span aria-hidden="true" className="hidden h-8 w-px bg-line sm:block" />
          <div className="relative">
            <button
              aria-expanded={profileOpen}
              aria-controls="profile-menu"
              className="flex items-center gap-2 rounded-xl p-1.5 text-left transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest sm:gap-3 sm:pr-2"
              onClick={() => setProfileOpen((value) => !value)}
              type="button"
            >
              <span className="flex size-9 items-center justify-center rounded-xl bg-forest text-xs font-semibold text-white">
                RR
              </span>
              <span className="hidden min-w-0 sm:block">
                <span className="block text-xs font-semibold text-ink">Workspace member</span>
                <span className="mt-0.5 block text-[10px] text-muted">Operations team</span>
              </span>
              <Icon className="hidden text-muted sm:block" name="chevron-down" size={15} />
            </button>
            {profileOpen && (
              <div
                aria-label="Workspace profile menu"
                className="absolute right-0 top-[calc(100%+10px)] z-50 w-64 rounded-2xl border border-line bg-white p-3 shadow-float"
                id="profile-menu"
                role="region"
              >
                <div className="border-b border-line px-3 pb-3 pt-1">
                  <p className="text-sm font-semibold text-ink">RecallRadar workspace</p>
                  <p className="mt-1 text-xs text-muted">Profile controls will be available here.</p>
                </div>
                <p className="px-3 pt-3 text-[11px] font-medium text-muted">
                  Account and sign-in are not configured yet.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
