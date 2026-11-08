"use client";

import { useState } from "react";
import { DetailField } from "@/components/crud/detail-field";
import { Card, Select } from "@/components/ui/primitives";
import { useMockData } from "@/lib/mock-data";

type NodeKind = "recall" | "impact" | "product" | "composition" | "componentBatch" | "component" | "inventory" | "location";
type NodeInfo = { key: string; kind: NodeKind; title: string; lines: string[] };
const nodeStyles: Record<NodeKind, string> = {
  recall: "border-amber/40 bg-amber-soft/60 text-amber-ink",
  impact: "border-amber/30 bg-white text-ink",
  product: "border-forest/30 bg-sage/55 text-forest",
  composition: "border-line bg-white text-muted",
  componentBatch: "border-amber/25 bg-[#FCF5EB] text-amber-ink",
  component: "border-forest/25 bg-forest text-white",
  inventory: "border-sage bg-sage/50 text-forest",
  location: "border-line bg-[#FBFBF8] text-ink",
};
const kindLabels: Record<NodeKind, string> = { recall: "Recall", impact: "Recall impact", product: "Product batch", composition: "Composition", componentBatch: "Component batch", component: "Component", inventory: "Inventory", location: "Inventory location" };

function TraceNode({ node, selected, onSelect }: { node: NodeInfo; selected: boolean; onSelect: (node: NodeInfo) => void }) {
  return <button aria-pressed={selected} className={`min-w-44 max-w-full rounded-xl border px-3.5 py-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-forest ${nodeStyles[node.kind]} ${selected ? "ring-2 ring-forest ring-offset-2" : ""}`} onClick={() => onSelect(node)} type="button"><span className="block text-[9px] font-bold uppercase tracking-[0.13em] opacity-70">{kindLabels[node.kind]}</span><span className="mt-1.5 block text-sm font-semibold leading-5">{node.title}</span>{node.lines[0] && <span className="mt-1 block text-[11px] leading-4 opacity-75">{node.lines[0]}</span>}</button>;
}

function Connector({ label }: { label: string }) {
  return <div aria-hidden="true" className="flex min-w-12 flex-col items-center justify-center px-1 text-forest/70"><span className="text-[9px] font-medium text-muted">{label}</span><span className="text-xl leading-5">→</span></div>;
}

export function TraceabilitySection() {
  const { recalls, recallImpacts, productBatches, products, batchCompositions, componentBatches, components, inventoryRecords, inventoryLocations } = useMockData();
  const [recallId, setRecallId] = useState(recalls[0] ? String(recalls[0].recall_id) : "");
  const [selectedNode, setSelectedNode] = useState<NodeInfo | null>(null);
  const recall = recalls.find((item) => String(item.recall_id) === recallId);
  const impacts = recall ? recallImpacts.filter((item) => item.recall_id === recall.recall_id) : [];

  function node(key: string, kind: NodeKind, title: string, lines: string[]): NodeInfo { return { key, kind, title, lines }; }

  return <section className="space-y-5"><div><p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted">Recorded supply-chain links</p><h2 className="mt-1 text-lg font-semibold text-ink">Recall traceability</h2><p className="mt-1 text-xs text-muted">Choose a recall to follow its stored product batch, component composition and inventory relationships.</p></div>
    <Card className="flex flex-col gap-3 sm:flex-row sm:items-center"><label className="w-full sm:max-w-md"><span className="mb-2 block text-sm font-medium text-ink">Selected recall</span><Select onChange={(event) => { setRecallId(event.target.value); setSelectedNode(null); }} value={recallId}><option value="">Choose recall</option>{recalls.map((item) => <option key={item.recall_id} value={item.recall_id}>Recall #{item.recall_id} · {item.recall_date} · {item.status}</option>)}</Select></label>{recall && <p className="text-xs text-muted">{recall.reason ?? "No reason recorded"}</p>}</Card>
    {!recall ? <Card className="py-12 text-center"><p className="text-sm font-semibold text-ink">No recall selected</p><p className="mt-1 text-xs text-muted">Add a recall record to explore traceability.</p></Card> : impacts.length === 0 ? <Card className="py-12 text-center"><p className="text-sm font-semibold text-ink">No impact relationships recorded</p><p className="mt-1 text-xs text-muted">Recall #{recall.recall_id} has no recall impact rows to trace to product batches.</p></Card> : <div className="space-y-4">{impacts.map((impact) => {
      const batch = productBatches.find((item) => item.product_batch_id === impact.product_batch_id);
      const product = products.find((item) => item.product_id === batch?.product_id);
      const composition = batchCompositions.filter((item) => item.product_batch_id === impact.product_batch_id);
      const stock = inventoryRecords.filter((item) => item.product_batch_id === impact.product_batch_id);
      const recallNode = node(`recall-${recall.recall_id}`, "recall", `Recall #${recall.recall_id}`, [recall.recall_date, recall.status]);
      const impactNode = node(`impact-${impact.recall_impact_id}`, "impact", impact.impact_type, [`Impact #${impact.recall_impact_id} · identified ${impact.identified_date}`]);
      const batchNode = batch ? node(`pb-${batch.product_batch_id}`, "product", batch.batch_number, [product?.name ?? "Product unavailable", `Produced ${batch.quantity_produced} units`]) : null;
      return <Card className="space-y-5 overflow-hidden" key={impact.recall_impact_id}>
        <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">Impact relationship</p><h3 className="mt-1 text-sm font-semibold text-ink">Impact #{impact.recall_impact_id} · {impact.impact_type}</h3></div><span className="rounded-full bg-amber-soft px-2.5 py-1 text-[10px] font-semibold text-amber-ink">Actual mock relationships</span></div>
        {!batch ? <p className="rounded-xl border border-dashed border-amber/30 bg-amber-soft/25 p-4 text-xs leading-5 text-amber-ink">This impact references product batch #{impact.product_batch_id}, but that batch is unavailable in current mock data. No downstream edge is drawn.</p> : <>
          <div className="space-y-3"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Recall path</p><div className="flex flex-col items-stretch gap-2 overflow-x-auto pb-2 md:flex-row md:items-center md:gap-1"><TraceNode node={recallNode} onSelect={setSelectedNode} selected={selectedNode?.key === recallNode.key} /><Connector label="identifies" /><TraceNode node={impactNode} onSelect={setSelectedNode} selected={selectedNode?.key === impactNode.key} /><Connector label="affects" /><TraceNode node={batchNode!} onSelect={setSelectedNode} selected={selectedNode?.key === batchNode!.key} /></div></div>
          <div className="grid gap-5 border-t border-line pt-5 xl:grid-cols-2">
            <div className="space-y-3"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Component source path</p>{composition.length ? <div className="space-y-3">{composition.map((entry) => { const componentBatch = componentBatches.find((item) => item.component_batch_id === entry.component_batch_id); const component = componentBatch ? components.find((item) => item.component_id === componentBatch.component_id) : undefined; const compositionNode = node(`composition-${entry.product_batch_id}-${entry.component_batch_id}`, "composition", `Used quantity: ${entry.quantity_used}`, ["Product batch composition"]); const componentBatchNode = componentBatch ? node(`cb-${componentBatch.component_batch_id}`, "componentBatch", componentBatch.batch_number, ["Component batch"]) : null; const componentNode = component ? node(`component-${component.component_id}`, "component", component.name, [component.category ?? "Component category not recorded"]) : null; return <div className="rounded-xl border border-line bg-[#FBFBF8] p-3" key={`${entry.product_batch_id}-${entry.component_batch_id}`}><div className="flex flex-col items-stretch gap-2 overflow-x-auto pb-1 md:flex-row md:items-center md:gap-1"><TraceNode node={batchNode!} onSelect={setSelectedNode} selected={selectedNode?.key === batchNode!.key} /><Connector label="contains" /><TraceNode node={compositionNode} onSelect={setSelectedNode} selected={selectedNode?.key === compositionNode.key} />{componentBatch ? <><Connector label="uses lot" /><TraceNode node={componentBatchNode!} onSelect={setSelectedNode} selected={selectedNode?.key === componentBatchNode!.key} />{component ? <><Connector label="belongs to" /><TraceNode node={componentNode!} onSelect={setSelectedNode} selected={selectedNode?.key === componentNode!.key} /></> : <p className="text-xs text-amber-ink">Component batch exists, but its component is unavailable.</p>}</> : <p className="text-xs text-amber-ink">Composition references unavailable component batch #{entry.component_batch_id}; no onward edge is drawn.</p>}</div></div>; })}</div> : <div className="rounded-xl border border-dashed border-line p-4 text-xs leading-5 text-muted">No product batch composition rows are recorded for this affected batch.</div>}</div>
            <div className="space-y-3"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Inventory branch</p>{stock.length ? <div className="space-y-3">{stock.map((record) => { const location = inventoryLocations.find((item) => item.location_id === record.location_id); const inventoryNode = node(`inventory-${record.inventory_id}`, "inventory", `${record.quantity_on_hand} units on hand`, [`Inventory #${record.inventory_id} · updated ${record.last_updated}`]); const locationNode = location ? node(`location-${location.location_id}`, "location", location.name, [location.type?.replaceAll("_", " ") ?? "Location type not recorded", location.address ?? "Address not recorded"]) : null; return <div className="rounded-xl border border-line bg-[#FBFBF8] p-3" key={record.inventory_id}><div className="flex flex-col items-stretch gap-2 overflow-x-auto pb-1 md:flex-row md:items-center md:gap-1"><TraceNode node={batchNode!} onSelect={setSelectedNode} selected={selectedNode?.key === batchNode!.key} /><Connector label="has stock" /><TraceNode node={inventoryNode} onSelect={setSelectedNode} selected={selectedNode?.key === inventoryNode.key} />{location ? <><Connector label="stored at" /><TraceNode node={locationNode!} onSelect={setSelectedNode} selected={selectedNode?.key === locationNode!.key} /></> : <p className="text-xs text-amber-ink">Inventory row references unavailable location #{record.location_id}.</p>}</div></div>; })}</div> : <div className="rounded-xl border border-dashed border-line p-4 text-xs leading-5 text-muted">No inventory records reference this product batch. There is no inventory edge in the current data.</div>}</div>
          </div>
        </>}
      </Card>;
    })}</div>}
    {selectedNode && <Card aria-live="polite" className="border-forest/20 bg-sage/20"><div className="mb-3 flex items-center justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">Selected trace node</p><h3 className="mt-1 text-sm font-semibold text-ink">{kindLabels[selectedNode.kind]} · {selectedNode.title}</h3></div><button aria-label="Clear selected node" className="rounded-lg px-2 py-1 text-xs text-muted hover:bg-white" onClick={() => setSelectedNode(null)} type="button">Clear</button></div><div className="grid gap-3 sm:grid-cols-2">{selectedNode.lines.map((line, index) => <DetailField key={`${selectedNode.key}-${index}`} label={index === 0 ? "Relationship detail" : "Additional detail"} value={line} />)}</div></Card>}
    <p className="text-[11px] leading-5 text-muted">Connectors appear only for existing recall impact, product batch composition, component batch, component, inventory and location records. Missing relationships are shown as gaps instead of inferred links.</p>
  </section>;
}
