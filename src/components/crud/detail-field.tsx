type DetailFieldProps = {
  label: string;
  value: string | number | null | undefined;
};

export function DetailField({ label, value }: DetailFieldProps) {
  return (
    <div className="rounded-xl border border-line bg-[#FBFBF8] px-3.5 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-muted">{label}</p>
      <p className="mt-1.5 break-words text-sm font-medium text-ink">{value || "—"}</p>
    </div>
  );
}
