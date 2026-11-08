import { Badge } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/icon";

export function MockDataNotice() {
  return (
    <div className="flex flex-wrap items-center gap-2.5 rounded-xl border border-amber/20 bg-amber-soft/55 px-3.5 py-3 text-xs text-amber-ink" role="note">
      <Icon name="activity" size={15} />
      <Badge className="bg-white/75 text-amber-ink" tone="amber">MOCK DATA</Badge>
      <span>Changes are temporary and reset when you refresh. Nothing is saved to MySQL.</span>
    </div>
  );
}
