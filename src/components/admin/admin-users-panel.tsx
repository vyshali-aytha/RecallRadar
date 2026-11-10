"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ConfirmDialog } from "@/components/crud/confirm-dialog";
import { DataTable } from "@/components/crud/data-table";
import { FormField } from "@/components/crud/form-field";
import { Modal } from "@/components/crud/modal";
import { RowActions } from "@/components/crud/row-actions";
import { Button, Input, Select } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/icon";

type UserRole = "Admin" | "Staff";
type UserRecord = { user_id: number; name: string; email: string; role: UserRole };
type Draft = { name: string; email: string; role: UserRole; password: string };
type Dialog = { kind: "add" } | { kind: "edit"; user: UserRecord } | { kind: "delete"; user: UserRecord } | null;
type ApiError = { error?: string };

function responseMessage(status: number, body: ApiError): string {
  if (status === 401) return "Your session has expired. Sign in again to manage users.";
  if (status === 403) return "Your account does not have permission to manage users.";
  return body.error || "The user request could not be completed.";
}

async function readError(response: Response): Promise<string> {
  const body = await response.json().catch(() => ({})) as ApiError;
  return responseMessage(response.status, body);
}

async function fetchUsers(): Promise<UserRecord[]> {
  const response = await fetch("/api/users", {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  const result = await response.json() as { users?: UserRecord[] };
  if (!Array.isArray(result.users)) {
    throw new Error("The server returned an invalid user list.");
  }
  return result.users;
}

export function AdminUsersPanel() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [draft, setDraft] = useState<Draft>({ name: "", email: "", role: "Staff", password: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");

  const loadUsers = useCallback(async () => {
    try {
      const result = await fetchUsers();
      setLoadError("");
      setUsers(result);
      setSelectedUser((selected) => selected
        ? result.find((user) => user.user_id === selected.user_id) ?? null
        : null);
      return true;
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Unable to load users.");
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void fetchUsers()
      .then((result) => {
        if (!active) return;
        setUsers(result);
        setLoadError("");
      })
      .catch((error: unknown) => {
        if (!active) return;
        setLoadError(error instanceof Error ? error.message : "Unable to load users.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const normalizedQuery = query.trim().toLowerCase();
  const rows = useMemo(
    () => users.filter((user) =>
      (!normalizedQuery || [user.name, user.email, String(user.user_id)]
        .some((value) => value.toLowerCase().includes(normalizedQuery))) &&
      (roleFilter === "all" || user.role === roleFilter)),
    [normalizedQuery, roleFilter, users]
  );

  function closeDialog() {
    if (saving) return;
    setDialog(null);
    setDraft({ name: "", email: "", role: "Staff", password: "" });
    setFormError("");
  }

  function openAdd() {
    setDraft({ name: "", email: "", role: "Staff", password: "" });
    setFormError("");
    setNotice("");
    setDialog({ kind: "add" });
  }

  function openEdit(user: UserRecord) {
    setDraft({ name: user.name, email: user.email, role: user.role, password: "" });
    setFormError("");
    setNotice("");
    setDialog({ kind: "edit", user });
  }

  async function submitUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dialog || dialog.kind === "delete" || saving) return;

    setSaving(true);
    setFormError("");
    setNotice("");

    const isCreate = dialog.kind === "add";
    const payload: Record<string, string> = {
      name: draft.name.trim(),
      email: draft.email.trim(),
      role: draft.role,
    };

    if (isCreate || draft.password) {
      payload.password = draft.password;
    }

    try {
      const response = await fetch(
        isCreate ? "/api/users" : `/api/users/${dialog.user.user_id}`,
        {
          method: isCreate ? "POST" : "PATCH",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        throw new Error(await readError(response));
      }

      setNotice(isCreate ? "User created successfully." : "User updated successfully.");
      setDialog(null);
      setDraft({ name: "", email: "", role: "Staff", password: "" });
      if (!await loadUsers()) {
        setNotice("Changes were saved, but the user list could not be refreshed.");
      }
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Unable to save the user.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete(user: UserRecord) {
    if (saving) return;
    setSaving(true);
    setFormError("");
    setNotice("");

    try {
      const response = await fetch(`/api/users/${user.user_id}`, {
        method: "DELETE",
        credentials: "same-origin",
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        throw new Error(await readError(response));
      }

      setDialog(null);
      setSelectedUser(null);
      setNotice("User deleted successfully.");
      if (!await loadUsers()) {
        setNotice("The user was deleted, but the user list could not be refreshed.");
      }
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Unable to delete the user.");
    } finally {
      setSaving(false);
    }
  }

  const columns = [
    { key: "id", label: "User ID", className: "w-24", render: (user: UserRecord) => <span className="font-mono text-xs text-[#74807b]">{user.user_id}</span> },
    { key: "name", label: "Name", render: (user: UserRecord) => <span className="font-semibold text-[#1d2926]">{user.name}</span> },
    { key: "email", label: "Email", render: (user: UserRecord) => user.email },
    { key: "role", label: "Role", render: (user: UserRecord) => <span className="rounded-full bg-[#e8efe8] px-2.5 py-1 text-[10px] font-bold text-[#1e5045]">{user.role}</span> },
    { key: "actions", label: "Actions", className: "w-32 text-right", render: (user: UserRecord) => <RowActions label="user" onDelete={() => { setSelectedUser(user); setFormError(""); setDialog({ kind: "delete", user }); }} onEdit={() => { setSelectedUser(user); openEdit(user); }} onView={() => setSelectedUser(user)} /> },
  ];

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.17em] text-[#74807b]">Access and roles</p>
          <h2 className="rr-heading mt-1 text-xl font-bold text-[#1d2926]">User management</h2>
          <p className="mt-1 text-sm text-[#74807b]">Administer workspace accounts and access roles.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button className="bg-[#1e5045] hover:bg-[#17463c]" onClick={openAdd}><span className="text-lg leading-none">+</span>Add user</Button>
          <Button className="border-[#dfe3dd]" disabled={!selectedUser || !users.length} onClick={() => selectedUser && openEdit(selectedUser)} variant="outline">Edit selected</Button>
          <Button disabled={!selectedUser || !users.length} onClick={() => selectedUser && (setFormError(""), setDialog({ kind: "delete", user: selectedUser }))} variant="outline">Delete selected</Button>
        </div>
      </div>

      {notice && <div className="rounded-xl border border-[#1e5045]/15 bg-[#e8efe8] px-4 py-3 text-xs text-[#1e5045]" role="status">{notice}</div>}
      {loadError && <div className="rounded-xl border border-[#c8563e]/20 bg-[#c8563e]/[0.06] px-4 py-3 text-xs text-[#a64232]" role="alert">{loadError}</div>}

      <div className="flex flex-col gap-3 rounded-2xl border border-[#e6e7e1] bg-white p-3 shadow-[0_5px_20px_rgba(29,41,38,0.035)] sm:flex-row sm:flex-wrap sm:p-4">
        <label className="relative block w-full sm:max-w-sm">
          <span className="sr-only">Search users</span>
          <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#74807b]" name="search" size={16} />
          <Input className="pl-10" onChange={(event) => setQuery(event.target.value)} placeholder="Search name, email or ID" value={query} />
        </label>
        <label className="w-full sm:max-w-[180px]">
          <span className="sr-only">Filter users by role</span>
          <Select onChange={(event) => setRoleFilter(event.target.value)} value={roleFilter}>
            <option value="all">All roles</option><option value="Admin">Admin</option><option value="Staff">Staff</option>
          </Select>
        </label>
        <span className="px-1 text-xs text-[#74807b] sm:ml-auto sm:self-center">
          {loading ? "Loading users…" : `${rows.length} ${rows.length === 1 ? "user" : "users"}`}
        </span>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-[#e6e7e1] bg-white px-5 py-12 text-center text-sm text-[#74807b]" role="status">
          Loading users from the database…
        </div>
      ) : (
        <DataTable
          columns={columns}
          emptyDescription={loadError ? "The user directory could not be loaded. Retry after resolving the error above." : normalizedQuery || roleFilter !== "all" ? "No users match the selected search and role filters." : "No users are present in the database."}
          emptyTitle={loadError ? "Unable to load user directory" : normalizedQuery || roleFilter !== "all" ? "No matching users" : "No users found"}
          footerLabel="Live database records"
          rowKey={(user) => user.user_id}
          rows={rows}
        />
      )}

      {dialog && dialog.kind !== "delete" && (
        <Modal
          description={dialog.kind === "add" ? "Create an account with an initial password." : "Update account details. Leave the password blank to keep the current password."}
          onClose={closeDialog}
          title={dialog.kind === "add" ? "Add user" : `Edit ${dialog.user.name}`}
        >
          <form className="space-y-4" onSubmit={(event) => void submitUser(event)}>
            <FormField htmlFor="admin-user-name" label="Name" required>
              <Input autoFocus disabled={saving} id="admin-user-name" maxLength={150} onChange={(event) => setDraft({ ...draft, name: event.target.value })} required value={draft.name} />
            </FormField>
            <FormField htmlFor="admin-user-email" label="Email" required>
              <Input autoComplete="email" disabled={saving} id="admin-user-email" maxLength={255} onChange={(event) => setDraft({ ...draft, email: event.target.value })} required type="email" value={draft.email} />
            </FormField>
            <FormField htmlFor="admin-user-role" label="Role" required>
              <Select disabled={saving} id="admin-user-role" onChange={(event) => setDraft({ ...draft, role: event.target.value as UserRole })} value={draft.role}>
                <option value="Admin">Admin</option><option value="Staff">Staff</option>
              </Select>
            </FormField>
            <FormField
              htmlFor="admin-user-password"
              hint={dialog.kind === "edit" ? "Leave blank to keep the current password." : "Use at least 12 characters."}
              label={dialog.kind === "add" ? "Password" : "New password"}
              required={dialog.kind === "add"}
            >
              <Input autoComplete={dialog.kind === "add" ? "new-password" : "new-password"} disabled={saving} id="admin-user-password" minLength={dialog.kind === "add" || draft.password ? 12 : undefined} onChange={(event) => setDraft({ ...draft, password: event.target.value })} required={dialog.kind === "add"} type="password" value={draft.password} />
            </FormField>
            {formError && <div className="rounded-xl border border-[#c8563e]/20 bg-[#c8563e]/[0.06] px-3.5 py-3 text-xs text-[#a64232]" role="alert">{formError}</div>}
            <div className="flex justify-end gap-2 border-t border-[#e6e7e1] pt-4">
              <Button disabled={saving} onClick={closeDialog} variant="outline">Cancel</Button>
              <Button disabled={saving} type="submit">{saving ? "Saving…" : dialog.kind === "add" ? "Create user" : "Save changes"}</Button>
            </div>
          </form>
        </Modal>
      )}

      {dialog?.kind === "delete" && (
        <ConfirmDialog
          description={`Delete ${dialog.user.name} (${dialog.user.email})? This action cannot be undone.`}
          onClose={closeDialog}
          onConfirm={() => void confirmDelete(dialog.user)}
          pending={saving}
          title="Delete user"
        />
      )}
    </section>
  );
}
