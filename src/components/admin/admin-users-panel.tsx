"use client";

import { useMemo, useState } from "react";
import { ConfirmDialog } from "@/components/crud/confirm-dialog";
import { DataTable } from "@/components/crud/data-table";
import { FormField } from "@/components/crud/form-field";
import { Modal } from "@/components/crud/modal";
import { RowActions } from "@/components/crud/row-actions";
import { Button, Input, Select } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/icon";

type UserRecord = { user_id: number; name: string; email: string; role: "Admin" | "Staff" };
type Draft = { name: string; email: string; role: "Admin" | "Staff" };
type Dialog = { kind: "add"; } | { kind: "edit"; user: UserRecord } | { kind: "delete"; user: UserRecord } | null;
const unavailable = "User CRUD is not available in the browser yet. These server-only operations need authenticated API routes or Server Actions before changes can be saved.";

export function AdminUsersPanel() {
  const [users] = useState<UserRecord[]>([]);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [draft, setDraft] = useState<Draft>({ name: "", email: "", role: "Staff" });
  const normalizedQuery = query.trim().toLowerCase();
  const rows = useMemo(() => users.filter((user) => (!normalizedQuery || [user.name, user.email, String(user.user_id)].some((value) => value.toLowerCase().includes(normalizedQuery))) && (roleFilter === "all" || user.role === roleFilter)), [normalizedQuery, roleFilter, users]);

  function openAdd() { setDraft({ name: "", email: "", role: "Staff" }); setDialog({ kind: "add" }); }
  function openEdit(user: UserRecord) { setDraft({ name: user.name, email: user.email, role: user.role }); setDialog({ kind: "edit", user }); }

  const columns = [
    { key: "id", label: "User ID", className: "w-24", render: (user: UserRecord) => <span className="font-mono text-xs text-[#74807b]">{user.user_id}</span> },
    { key: "name", label: "Name", render: (user: UserRecord) => <span className="font-semibold text-[#1d2926]">{user.name}</span> },
    { key: "email", label: "Email", render: (user: UserRecord) => user.email },
    { key: "role", label: "Role", render: (user: UserRecord) => <span className="rounded-full bg-[#e8efe8] px-2.5 py-1 text-[10px] font-bold text-[#1e5045]">{user.role}</span> },
    { key: "actions", label: "Actions", className: "w-32 text-right", render: (user: UserRecord) => <RowActions label="user" onDelete={() => { setSelectedUser(user); setDialog({ kind: "delete", user }); }} onEdit={() => { setSelectedUser(user); openEdit(user); }} onView={() => setSelectedUser(user)} /> },
  ];

  return <section className="space-y-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.17em] text-[#74807b]">Access and roles</p><h2 className="rr-heading mt-1 text-xl font-bold text-[#1d2926]">User management</h2><p className="mt-1 text-sm text-[#74807b]">Administer workspace accounts and access roles.</p></div><div className="flex flex-wrap gap-2"><Button className="bg-[#1e5045] hover:bg-[#17463c]" onClick={openAdd}><span className="text-lg leading-none">+</span>Add user</Button><Button className="border-[#dfe3dd]" disabled={!selectedUser || !users.length} onClick={() => selectedUser && openEdit(selectedUser)} variant="outline">Edit selected</Button><Button disabled={!selectedUser || !users.length} onClick={() => selectedUser && setDialog({ kind: "delete", user: selectedUser })} variant="outline">Delete selected</Button></div></div>
    <div className="rounded-2xl border border-[#e6e7e1] bg-[#f5f5ef] px-4 py-3 text-xs leading-5 text-[#58645f]" role="note"><span className="font-bold text-[#1e5045]">Backend integration pending.</span> The project has role-protected user CRUD functions on the server, but no browser-callable user endpoints. This screen does not create, edit, or delete accounts.</div>
    <div className="flex flex-col gap-3 rounded-2xl border border-[#e6e7e1] bg-white p-3 shadow-[0_5px_20px_rgba(29,41,38,0.035)] sm:flex-row sm:flex-wrap sm:p-4"><label className="relative block w-full sm:max-w-sm"><span className="sr-only">Search users</span><Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#74807b]" name="search" size={16} /><Input className="pl-10" onChange={(event) => setQuery(event.target.value)} placeholder="Search name, email or ID" value={query} /></label><label className="w-full sm:max-w-[180px]"><span className="sr-only">Filter users by role</span><Select onChange={(event) => setRoleFilter(event.target.value)} value={roleFilter}><option value="all">All roles</option><option value="Admin">Admin</option><option value="Staff">Staff</option></Select></label><span className="px-1 text-xs text-[#74807b] sm:ml-auto sm:self-center">{rows.length ? `${rows.length} users` : "Directory unavailable"}</span></div>
    <DataTable columns={columns} emptyDescription={normalizedQuery || roleFilter !== "all" ? "No user records are available to match these filters." : "Member B needs to expose an authenticated user-list operation before account rows can be loaded."} emptyTitle={normalizedQuery || roleFilter !== "all" ? "No matching users" : "User directory awaiting backend integration"} rowKey={(user) => user.user_id} rows={rows} />
    {dialog && dialog.kind !== "delete" && <Modal description={unavailable} onClose={() => setDialog(null)} title={dialog.kind === "add" ? "Add user" : `Edit ${dialog.user.name}`}><form className="space-y-4" onSubmit={(event) => event.preventDefault()}><FormField htmlFor="admin-user-name" label="Name" required><Input autoFocus disabled id="admin-user-name" maxLength={150} onChange={(event) => setDraft({ ...draft, name: event.target.value })} required value={draft.name} /></FormField><FormField htmlFor="admin-user-email" label="Email" required><Input autoComplete="off" disabled id="admin-user-email" maxLength={255} onChange={(event) => setDraft({ ...draft, email: event.target.value })} required type="email" value={draft.email} /></FormField><FormField htmlFor="admin-user-role" label="Role" required><Select disabled id="admin-user-role" onChange={(event) => setDraft({ ...draft, role: event.target.value as Draft["role"] })} value={draft.role}><option value="Admin">Admin</option><option value="Staff">Staff</option></Select></FormField><p className="rounded-xl border border-[#e6e7e1] bg-[#f5f5ef] p-3 text-xs leading-5 text-[#58645f">Password hashes must be generated and stored by the backend. No password or password hash is collected here.</p><div className="flex justify-end gap-2 border-t border-[#e6e7e1] pt-4"><Button onClick={() => setDialog(null)} variant="outline">Close</Button><Button disabled type="submit">Awaiting backend API</Button></div></form></Modal>}
    {dialog?.kind === "delete" && <ConfirmDialog blockedReason={unavailable} description={`Delete ${dialog.user.name}? No request will be sent until a protected user-delete API is available.`} onClose={() => setDialog(null)} onConfirm={() => setDialog(null)} title="Delete user" />}
  </section>;
}
