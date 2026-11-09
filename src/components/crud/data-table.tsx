import type { ReactNode } from "react";
import { Icon } from "@/components/ui/icon";

export type DataTableColumn<T> = {
  key: string;
  label: string;
  render: (row: T) => ReactNode;
  className?: string;
};

type DataTableProps<T> = {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  emptyTitle: string;
  emptyDescription: string;
  footerLabel?: string;
};

export function DataTable<T>({ columns, rows, rowKey, emptyTitle, emptyDescription, footerLabel = "Showing current mock data" }: DataTableProps<T>) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left">
          <thead className="bg-[#FBFBF8]">
            <tr className="border-b border-line">
              {columns.map((column) => (
                <th className={`whitespace-nowrap px-5 py-3.5 text-[10px] font-semibold uppercase tracking-[0.13em] text-muted ${column.className ?? ""}`} key={column.key} scope="col">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line/80">
            {rows.length > 0 ? rows.map((row) => (
              <tr className="transition-colors hover:bg-[#FBFBF8]" key={rowKey(row)}>
                {columns.map((column) => (
                  <td className={`px-5 py-4 align-middle text-sm text-ink ${column.className ?? ""}`} key={column.key}>
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            )) : (
              <tr>
                <td className="px-5 py-14" colSpan={columns.length}>
                  <div className="mx-auto flex max-w-sm flex-col items-center text-center">
                    <span className="flex size-11 items-center justify-center rounded-2xl bg-sage/60 text-forest">
                      <Icon name="database" size={19} />
                    </span>
                    <p className="mt-3 text-sm font-semibold text-ink">{emptyTitle}</p>
                    <p className="mt-1.5 text-xs leading-5 text-muted">{emptyDescription}</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-line bg-white px-5 py-3 text-[11px] text-muted">
        <span>{rows.length} {rows.length === 1 ? "record" : "records"}</span>
        <span className="hidden sm:inline">{footerLabel}</span>
      </div>
    </div>
  );
}
