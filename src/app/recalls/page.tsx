"use client";

import { useMemo, useState } from "react";
import { ConfirmDialog } from "@/components/crud/confirm-dialog";
import { DataTable } from "@/components/crud/data-table";
import { DetailField } from "@/components/crud/detail-field";
import { FormField } from "@/components/crud/form-field";
import { Modal } from "@/components/crud/modal";
import { MockDataNotice } from "@/components/crud/mock-data-notice";
import { PageHeading } from "@/components/crud/page-heading";
import { RowActions } from "@/components/crud/row-actions";
import { Badge, Button, Card, Input, Textarea } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/icon";
import { useMockData } from "@/lib/mock-data";
import type { RecallRecord } from "@/lib/mock-data";

type RecallDraft = {
  recall_date: string;
  reason: string;
  severity: string;
  status: string;
  user_id: string;
  component_id: string;
  component_batch_id: string;
};
type DialogState = { kind: "form"; id: number | null } | { kind: "view" | "delete"; id: number } | null;
const emptyDraft: RecallDraft = { recall_date: "", reason: "", severity: "", status: "open", user_id: "", component_id: "", component_batch_id: "" };

function statusTone(status: string): "sage" | "amber" | "neutral" {
  const normalized = status.trim().toLowerCase().replaceAll(" ", "_");
  if (normalized === "open" || normalized === "in_progress") return "amber";
  if (normalized === "closed") return "sage";
  return "neutral";
}

export default function RecallsPage() {
  const { recalls, recallImpacts, appUsers, components, componentBatches, productBatches, products, addRecall, updateRecall, deleteRecall } = useMockData();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [dialog, setDialog] = useState<DialogState>(null);
  const [draft, setDraft] = useState<RecallDraft>(emptyDraft);
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");

  const statusOptions = useMemo(() => [...new Set(recalls.map((recall) => recall.status))].sort((a, b) => a.localeCompare(b)), [recalls]);
  const severityOptions = useMemo(() => [...new Set(recalls.map((recall) => recall.severity).filter((value): value is string => Boolean(value)))].sort((a, b) => a.localeCompare(b)), [recalls]);
  const summary = useMemo(() => {
    const normalized = recalls.map((recall) => recall.status.trim().toLowerCase().replaceAll(" ", "_"));
    return {
      total: recalls.length,
      open: normalized.filter((status) => status === "open").length,
      inProgress: normalized.filter((status) => status === "in_progress").length,
      closed: normalized.filter((status) => status === "closed").length,
    };
  }, [recalls]);
  const filteredRecalls = useMemo(() => {
    const term = query.trim().toLowerCase();
    return recalls.filter((recall) => {
      const component = components.find((item) => item.component_id === recall.component_id);
      const batch = componentBatches.find((item) => item.component_batch_id === recall.component_batch_id);
      const matchesSearch = !term || [String(recall.recall_id), component?.name, batch?.batch_number, recall.reason].some((value) => value?.toLowerCase().includes(term));
      return matchesSearch && (statusFilter === "all" || recall.status === statusFilter) && (severityFilter === "all" || recall.severity === severityFilter);
    });
  }, [componentBatches, components, query, recalls, severityFilter, statusFilter]);

  const selectedRecall = dialog ? recalls.find((recall) => recall.recall_id === dialog.id) : undefined;
  const selectedImpacts = selectedRecall ? recallImpacts.filter((impact) => impact.recall_id === selectedRecall.recall_id) : [];
  const deleteBlocked = dialog?.kind === "delete" && recallImpacts.some((impact) => impact.recall_id === dialog.id)
    ? "Recall impact records reference this recall. Remove or reassign those records before deleting it."
    : undefined;

  function openCreate() {
    setDraft({ ...emptyDraft, user_id: appUsers[0] ? String(appUsers[0].user_id) : "" });
    setFormError("");
    setDialog({ kind: "form", id: null });
  }

  function openEdit(recall: RecallRecord) {
    setDraft({
      recall_date: recall.recall_date,
      reason: recall.reason ?? "",
      severity: recall.severity ?? "",
      status: recall.status,
      user_id: String(recall.user_id),
      component_id: recall.component_id === null ? "" : String(recall.component_id),
      component_batch_id: recall.component_batch_id === null ? "" : String(recall.component_batch_id),
    });
    setFormError("");
    setDialog({ kind: "form", id: recall.recall_id });
  }

  function saveRecall(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const userId = Number(draft.user_id);
    const componentId = draft.component_id ? Number(draft.component_id) : null;
    const componentBatchId = draft.component_batch_id ? Number(draft.component_batch_id) : null;
    if (!draft.recall_date) { setFormError("Recall date is required."); return; }
    if (!appUsers.some((user) => user.user_id === userId)) { setFormError("Choose a user from the list."); return; }
    if (componentId === null && componentBatchId === null) { setFormError("Select a target component, component batch, or both."); return; }
    if (componentId !== null && !components.some((component) => component.component_id === componentId)) { setFormError("Choose an existing component."); return; }
    if (componentBatchId !== null && !componentBatches.some((batch) => batch.component_batch_id === componentBatchId)) { setFormError("Choose an existing component batch."); return; }
    if (draft.reason.length > 500) { setFormError("Reason must be 500 characters or fewer."); return; }
    if (!draft.status.trim()) { setFormError("Status is required."); return; }
    if (draft.status.trim().length > 30) { setFormError("Status must be 30 characters or fewer."); return; }
    if (draft.severity.length > 30) { setFormError("Severity must be 30 characters or fewer."); return; }
    const record = {
      recall_date: draft.recall_date,
      reason: draft.reason.trim() || null,
      severity: draft.severity.trim() || null,
      status: draft.status.trim(),
      user_id: userId,
      component_id: componentId,
      component_batch_id: componentBatchId,
    };
    if (dialog?.kind === "form" && dialog.id !== null) {
      updateRecall(dialog.id, record);
      setNotice(`Recall #${dialog.id} updated in temporary mock data.`);
    } else {
      const created = addRecall(record);
      setNotice(`Recall #${created.recall_id} added to temporary mock data.`);
    }
    setDialog(null);
  }

  function confirmDelete() {
    if (dialog?.kind !== "delete" || deleteBlocked || !selectedRecall) return;
    if (!deleteRecall(selectedRecall.recall_id)) return;
    setNotice(`Recall #${selectedRecall.recall_id} removed from temporary mock data.`);
    setDialog(null);
  }

  const componentLabel = (id: number | null) => id === null ? null : components.find((item) => item.component_id === id)?.name ?? "Unavailable component";
  const componentBatchLabel = (id: number | null) => {
    if (id === null) return null;
    const batch = componentBatches.find((item) => item.component_batch_id === id);
    const component = batch ? components.find((item) => item.component_id === batch.component_id) : undefined;
    return batch ? `${component?.name ?? "Unavailable component"} · ${batch.batch_number}` : "Unavailable component batch";
  };
  const columns = [
    { key: "id", label: "Recall ID", className: "w-24", render: (recall: RecallRecord) => <span className="font-mono text-xs text-muted">{recall.recall_id}</span> },
    { key: "date", label: "Recall date", render: (recall: RecallRecord) => recall.recall_date },
    { key: "component", label: "Target component", render: (recall: RecallRecord) => componentLabel(recall.component_id) ?? <span className="text-muted">—</span> },
    { key: "batch", label: "Target component batch", render: (recall: RecallRecord) => <span className="text-xs">{componentBatchLabel(recall.component_batch_id) ?? <span className="text-muted">—</span>}</span> },
    { key: "severity", label: "Severity", render: (recall: RecallRecord) => recall.severity ? <Badge tone={recall.severity.toLowerCase() === "high" || recall.severity.toLowerCase() === "critical" ? "amber" : "neutral"}>{recall.severity}</Badge> : <span className="text-muted">—</span> },
    { key: "status", label: "Status", render: (recall: RecallRecord) => <Badge className="capitalize" tone={statusTone(recall.status)}>{recall.status.replaceAll("_", " ")}</Badge> },
    { key: "reason", label: "Reason", render: (recall: RecallRecord) => <span className="block max-w-52 truncate text-xs text-muted" title={recall.reason ?? undefined}>{recall.reason ?? "—"}</span> },
    { key: "user", label: "Created by", render: (recall: RecallRecord) => appUsers.find((user) => user.user_id === recall.user_id)?.name ?? <span className="text-red-700">User unavailable</span> },
    { key: "actions", label: "Actions", className: "w-32 text-right", render: (recall: RecallRecord) => <RowActions label="recall" onDelete={() => setDialog({ kind: "delete", id: recall.recall_id })} onEdit={() => openEdit(recall)} onView={() => setDialog({ kind: "view", id: recall.recall_id })} /> },
  ];
  const metrics = [
    { label: "Total recalls", value: summary.total, icon: "shield" as const, tone: "forest" as const, note: "All recall records" },
    { label: "Open recalls", value: summary.open, icon: "activity" as const, tone: "amber" as const, note: "Status grouped as open" },
    { label: "In progress", value: summary.inProgress, icon: "clock" as const, tone: "amber" as const, note: "Status grouped as in progress" },
    { label: "Closed recalls", value: summary.closed, icon: "chart" as const, tone: "sage" as const, note: "Status grouped as closed" },
  ];

  return <div className="space-y-6">
    <PageHeading action={<Button disabled={!appUsers.length} onClick={openCreate}><span className="text-lg leading-none">+</span>Add recall</Button>} description="Manage component safety events and review the finished product batches identified as affected." title="Recalls" />
    <MockDataNotice />
    {notice && <div className="flex items-center justify-between rounded-xl border border-sage bg-sage/45 px-4 py-3 text-xs font-medium text-forest" role="status"><span>{notice}</span><button aria-label="Dismiss message" className="ml-3 text-forest/70 hover:text-forest" onClick={() => setNotice("")} type="button"><Icon name="close" size={15} /></button></div>}

    <section aria-labelledby="recall-overview-heading" className="space-y-3"><div><p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted">At a glance</p><h2 className="mt-1 text-lg font-semibold text-ink" id="recall-overview-heading">Recall overview</h2></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{metrics.map((metric) => <Card className="flex items-start justify-between gap-3 p-4 sm:p-5" key={metric.label}><div><p className="text-xs font-medium text-muted">{metric.label}</p><p className="mt-2 text-3xl font-semibold tracking-tight text-ink">{metric.value}</p><p className="mt-1.5 text-[11px] text-muted">{metric.note}</p></div><span className={`flex size-10 items-center justify-center rounded-xl ${metric.tone === "forest" ? "bg-forest text-white" : metric.tone === "amber" ? "bg-amber-soft text-amber-ink" : "bg-sage text-forest"}`}><Icon name={metric.icon} size={19} /></span></Card>)}</div></section>

    <section aria-labelledby="recall-list-heading" className="space-y-5"><div><p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted">Recall register</p><h2 className="mt-1 text-lg font-semibold text-ink" id="recall-list-heading">All recalls</h2><p className="mt-1 text-xs text-muted">Search recall IDs, target names, batches and reasons. Status and severity values follow the stored mock records.</p></div>
      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-3 shadow-card sm:flex-row sm:flex-wrap sm:p-4"><label className="relative block w-full sm:max-w-sm"><span className="sr-only">Search recalls</span><Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" name="search" size={16} /><Input className="pl-10" onChange={(event) => setQuery(event.target.value)} placeholder="Search ID, component, batch or reason" value={query} /></label><label className="w-full sm:max-w-[200px]"><span className="sr-only">Filter by status</span><select className="min-h-11 w-full rounded-xl border border-line bg-white px-3.5 text-sm text-ink shadow-sm" onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}><option value="all">All statuses</option>{statusOptions.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}</select></label><label className="w-full sm:max-w-[200px]"><span className="sr-only">Filter by severity</span><select className="min-h-11 w-full rounded-xl border border-line bg-white px-3.5 text-sm text-ink shadow-sm" onChange={(event) => setSeverityFilter(event.target.value)} value={severityFilter}><option value="all">All severities</option>{severityOptions.map((severity) => <option key={severity} value={severity}>{severity}</option>)}</select></label><span className="px-1 text-xs text-muted sm:ml-auto sm:self-center">{filteredRecalls.length} recalls</span></div>
      <DataTable columns={columns} emptyDescription={query || statusFilter !== "all" || severityFilter !== "all" ? "Try another search or adjust the filters." : "Add a recall to begin recording a product safety event."} emptyTitle={filteredRecalls.length ? "No recalls match these filters" : "No recalls yet"} rowKey={(recall) => recall.recall_id} rows={filteredRecalls} />
    </section>

    {dialog?.kind === "form" && <Modal description="A component, component batch, or both must be selected as the recall target." onClose={() => setDialog(null)} title={dialog.id === null ? "Add recall" : "Edit recall"} width="lg"><form className="space-y-4" onSubmit={saveRecall}>
      <div className="grid gap-4 sm:grid-cols-2"><FormField error={formError.includes("date") ? formError : undefined} htmlFor="recall-date" label="Recall date" required><Input autoFocus id="recall-date" onChange={(event) => setDraft({ ...draft, recall_date: event.target.value })} required type="date" value={draft.recall_date} /></FormField><FormField error={formError.includes("Status") ? formError : undefined} htmlFor="recall-status" label="Status" hint="Any value up to 30 characters" required><Input id="recall-status" maxLength={30} onChange={(event) => setDraft({ ...draft, status: event.target.value })} required value={draft.status} /></FormField></div>
      <div className="grid gap-4 sm:grid-cols-2"><FormField error={formError.includes("Severity") ? formError : undefined} htmlFor="recall-severity" label="Severity" hint="Optional, up to 30 characters"><Input id="recall-severity" maxLength={30} onChange={(event) => setDraft({ ...draft, severity: event.target.value })} value={draft.severity} /></FormField><FormField error={formError.includes("user") || formError.includes("User") ? formError : undefined} htmlFor="recall-user" label="Created by" required><select className="min-h-11 w-full rounded-xl border border-line bg-white px-3.5 text-sm text-ink shadow-sm" id="recall-user" onChange={(event) => setDraft({ ...draft, user_id: event.target.value })} required value={draft.user_id}><option value="">Choose a user</option>{appUsers.map((user) => <option key={user.user_id} value={user.user_id}>{user.name} · {user.role.replaceAll("_", " ")}</option>)}</select></FormField></div>
      <FormField error={formError.includes("Reason") || formError.includes("reason") ? formError : undefined} htmlFor="recall-reason" label="Reason" hint={`${draft.reason.length}/500 characters · optional`}><Textarea id="recall-reason" maxLength={500} onChange={(event) => setDraft({ ...draft, reason: event.target.value })} placeholder="Describe the issue or safety notice" value={draft.reason} /></FormField>
      <div className="rounded-xl border border-line bg-[#FBFBF8] p-4"><p className="text-sm font-semibold text-ink">Recall target</p><p className="mt-1 text-xs leading-5 text-muted">Select at least one target. The schema permits selecting both; it does not require the component and batch to match.</p><div className="mt-4 grid gap-4 sm:grid-cols-2"><FormField error={formError.includes("component.") || formError.includes("target") ? formError : undefined} htmlFor="recall-component" label="Component" hint="Optional"><select className="min-h-11 w-full rounded-xl border border-line bg-white px-3.5 text-sm text-ink shadow-sm" id="recall-component" onChange={(event) => setDraft({ ...draft, component_id: event.target.value })} value={draft.component_id}><option value="">No component selected</option>{components.map((component) => <option key={component.component_id} value={component.component_id}>{component.name}</option>)}</select></FormField><FormField error={formError.includes("component batch") ? formError : undefined} htmlFor="recall-component-batch" label="Component batch" hint="Optional"><select className="min-h-11 w-full rounded-xl border border-line bg-white px-3.5 text-sm text-ink shadow-sm" id="recall-component-batch" onChange={(event) => setDraft({ ...draft, component_batch_id: event.target.value })} value={draft.component_batch_id}><option value="">No component batch selected</option>{componentBatches.map((batch) => <option key={batch.component_batch_id} value={batch.component_batch_id}>{components.find((component) => component.component_id === batch.component_id)?.name ?? "Unavailable component"} · {batch.batch_number}</option>)}</select></FormField></div></div>
      {formError && <p className="text-xs font-medium text-red-700" role="alert">{formError}</p>}<div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end"><Button onClick={() => setDialog(null)} variant="outline">Cancel</Button><Button disabled={!appUsers.length} type="submit">{dialog.id === null ? "Create recall" : "Save changes"}</Button></div>
    </form></Modal>}

    {dialog?.kind === "view" && selectedRecall && <Modal description="Recall details and read-only affected batch records" onClose={() => setDialog(null)} title={`Recall #${selectedRecall.recall_id}`} width="lg"><div className="grid gap-3 sm:grid-cols-2"><DetailField label="Recall ID" value={selectedRecall.recall_id} /><DetailField label="Recall date" value={selectedRecall.recall_date} /><DetailField label="Reason" value={selectedRecall.reason} /><DetailField label="Severity" value={selectedRecall.severity} /><div className="rounded-xl border border-line bg-[#FBFBF8] px-3.5 py-3"><p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-muted">Status</p><div className="mt-2"><Badge className="capitalize" tone={statusTone(selectedRecall.status)}>{selectedRecall.status.replaceAll("_", " ")}</Badge></div></div><DetailField label="Created by" value={appUsers.find((user) => user.user_id === selectedRecall.user_id)?.name} /><DetailField label="Target component" value={componentLabel(selectedRecall.component_id)} /><DetailField label="Target component batch" value={componentBatchLabel(selectedRecall.component_batch_id)} /></div>
      <section className="mt-6"><h3 className="text-sm font-semibold text-ink">Associated recall impacts <span className="ml-1 text-xs font-normal text-muted">({selectedImpacts.length})</span></h3><p className="mt-1 text-xs text-muted">Read-only sample relationship data. Impact management belongs to the next stage.</p>{selectedImpacts.length ? <div className="mt-3 space-y-2">{selectedImpacts.map((impact) => { const batch = productBatches.find((item) => item.product_batch_id === impact.product_batch_id); const product = products.find((item) => item.product_id === batch?.product_id); return <div className="grid gap-2 rounded-xl border border-line bg-[#FBFBF8] p-3 sm:grid-cols-[1fr_auto] sm:items-center" key={impact.recall_impact_id}><div><p className="text-sm font-medium text-ink">{product?.name ?? "Unavailable product"}</p><p className="mt-1 font-mono text-xs text-muted">{batch?.batch_number ?? "Unavailable product batch"}</p></div><div className="sm:text-right"><p className="text-xs font-medium text-ink">{impact.impact_type}</p><p className="mt-1 text-[11px] text-muted">Identified {impact.identified_date}</p></div></div>; })}</div> : <p className="mt-3 rounded-xl border border-dashed border-line p-5 text-center text-xs text-muted">No impact records are associated with this recall.</p>}</section><div className="mt-5 flex justify-end"><Button onClick={() => openEdit(selectedRecall)} variant="outline">Edit recall</Button></div></Modal>}

    {dialog?.kind === "delete" && selectedRecall && <ConfirmDialog blockedReason={deleteBlocked} description={`Delete recall #${selectedRecall.recall_id}? Related impact records must be removed separately first.`} onClose={() => setDialog(null)} onConfirm={confirmDelete} title="Delete recall" />}
  </div>;
}
