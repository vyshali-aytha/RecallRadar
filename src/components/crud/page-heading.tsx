import type { ReactNode } from "react";

type PageHeadingProps = {
  title: string;
  description: string;
  action?: ReactNode;
};

export function PageHeading({ title, description, action }: PageHeadingProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Data management</p>
        <h2 className="mt-1.5 text-2xl font-semibold tracking-tight text-ink sm:text-[28px]">{title}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{description}</p>
      </div>
      {action}
    </div>
  );
}
