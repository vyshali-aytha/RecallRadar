import { Badge, Card } from "@/components/ui/primitives";
import { Icon, type IconName } from "@/components/ui/icon";

const overviewItems: {
  label: string;
  detail: string;
  icon: IconName;
}[] = [
  {
    label: "Suppliers",
    detail: "Supply partners",
    icon: "truck",
  },
  {
    label: "Products",
    detail: "Product catalog",
    icon: "box",
  },
  {
    label: "Component batches",
    detail: "Incoming lots",
    icon: "layers",
  },
  {
    label: "Recall exposure",
    detail: "Impacted product lots",
    icon: "shield",
  },
];

export default function Home() {
  return (
    <div className="space-y-7 sm:space-y-8">
      <section className="relative overflow-hidden rounded-[28px] bg-forest px-6 py-8 text-white shadow-card sm:px-9 sm:py-10 lg:px-11 lg:py-12">
        <div aria-hidden="true" className="pointer-events-none absolute -right-14 -top-28 size-[380px] rounded-full border border-white/[0.07] sm:-right-5 sm:-top-40 sm:size-[520px]">
          <div className="absolute inset-10 rounded-full border border-white/[0.07]" />
          <div className="absolute inset-24 rounded-full border border-white/[0.07]" />
          <div className="absolute inset-40 rounded-full border border-white/[0.07]" />
          <span className="absolute left-[24%] top-[23%] size-2 rounded-full bg-amber shadow-[0_0_0_6px_rgba(197,139,72,0.14)]" />
          <span className="absolute bottom-[23%] right-[27%] size-2 rounded-full bg-sage shadow-[0_0_0_6px_rgba(214,230,220,0.13)]" />
        </div>

        <div className="relative z-10 max-w-2xl">
          <Badge className="border border-white/15 bg-white/[0.08] text-sage" tone="sage">
            SUPPLY-CHAIN INTELLIGENCE
          </Badge>
          <h2 className="mt-5 max-w-xl text-3xl font-semibold leading-tight tracking-[-0.04em] sm:text-4xl lg:text-[42px]">
            See the journey behind every batch.
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-7 text-white/68 sm:text-base">
            Follow suppliers, components, production lots, and recall exposure from one considered workspace.
          </p>
        </div>

        <div className="relative z-10 mt-8 grid max-w-3xl grid-cols-1 gap-2 rounded-2xl border border-white/10 bg-white/[0.055] p-3 sm:mt-10 sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-center sm:gap-3 sm:p-4">
          {[
            { label: "Supplier", name: "Source" },
            { label: "Component", name: "Trace" },
            { label: "Product batch", name: "Impact" },
          ].map((node, index) => (
            <div className="flex items-center gap-3 rounded-xl px-2 py-2 sm:px-3" key={node.label}>
              <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${index === 1 ? "bg-amber/15 text-amber" : "bg-sage/15 text-sage"}`}>
                <Icon name={index === 0 ? "truck" : index === 1 ? "layers" : "package"} size={17} />
              </span>
              <span>
                <span className="block text-[10px] font-medium uppercase tracking-[0.14em] text-white/45">{node.name}</span>
                <span className="mt-0.5 block text-xs font-semibold text-white/90">{node.label}</span>
              </span>
              {index < 2 && <span aria-hidden="true" className="ml-auto hidden h-px w-full max-w-10 bg-white/20 sm:block" />}
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="overview-heading">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Your workspace</p>
            <h2 className="mt-1.5 text-lg font-semibold tracking-tight text-ink" id="overview-heading">
              Supply chain overview
            </h2>
          </div>
          <Badge tone="neutral">DATA SOURCE NOT CONNECTED</Badge>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {overviewItems.map((item) => (
            <Card className="flex min-h-[142px] flex-col justify-between" key={item.label}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-muted">{item.label}</p>
                  <p className="mt-3 text-[28px] font-semibold leading-none tracking-tight text-ink">—</p>
                </div>
                <span className="flex size-9 items-center justify-center rounded-xl bg-sage/70 text-forest">
                  <Icon name={item.icon} size={17} />
                </span>
              </div>
              <p className="text-[11px] text-muted">{item.detail} · awaiting connection</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
        <Card className="min-h-[220px]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-ink">Traceability map</h2>
              <p className="mt-1 text-xs text-muted">A connected view of your supply network</p>
            </div>
            <span className="flex size-9 items-center justify-center rounded-xl bg-sage/60 text-forest">
              <Icon name="radar" size={18} />
            </span>
          </div>
          <div className="mt-6 flex min-h-[108px] flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-[#FBFBF8] px-5 text-center">
            <span className="flex size-9 items-center justify-center rounded-xl bg-white text-muted shadow-card">
              <Icon name="database" size={17} />
            </span>
            <p className="mt-3 text-xs font-semibold text-ink">Your network will appear here</p>
            <p className="mt-1 max-w-sm text-[11px] leading-5 text-muted">
              The interface is ready. Database connections and live records are not part of this stage.
            </p>
          </div>
        </Card>

        <Card className="flex min-h-[220px] flex-col justify-between bg-[#FBFBF8]">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-xl bg-amber-soft text-amber-ink">
              <Icon name="sparkles" size={17} />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-ink">Built for clarity</h2>
              <p className="mt-1 text-[11px] text-muted">Trace each relationship with confidence.</p>
            </div>
          </div>
          <div className="mt-6 space-y-3">
            {[
              { label: "Supplier to component", icon: "arrow-up-right" as const },
              { label: "Component to product", icon: "arrow-up-right" as const },
              { label: "Recall to affected batch", icon: "arrow-up-right" as const },
            ].map((item) => (
              <div className="flex items-center justify-between border-b border-line pb-3 last:border-0 last:pb-0" key={item.label}>
                <span className="text-xs font-medium text-ink/80">{item.label}</span>
                <Icon className="text-muted" name={item.icon} size={15} />
              </div>
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
}
