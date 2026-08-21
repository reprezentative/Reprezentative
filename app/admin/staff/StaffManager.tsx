"use client";

import { useEffect, useState } from "react";
import { PERMISSIONS } from "@/lib/permissions";

type StaffUser = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  permissions: string[];
  twoFactorEnabled: boolean;
};

export function StaffManager() {
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Invite form
  const [invEmail, setInvEmail] = useState("");
  const [invName, setInvName] = useState("");
  const [invPassword, setInvPassword] = useState("");
  const [invRole, setInvRole] = useState("STAFF");
  const [inviting, setInviting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/staff");
      const data = await res.json();
      setUsers(data.users ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function patch(id: string, patch: Partial<StaffUser>) {
    setSavingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/staff/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Update failed");
        await load();
        return;
      }
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, ...data } : u)),
      );
    } finally {
      setSavingId(null);
    }
  }

  function togglePerm(u: StaffUser, key: string) {
    const has = u.permissions.includes(key);
    const next = has
      ? u.permissions.filter((p) => p !== key)
      : [...u.permissions, key];
    patch(u.id, { permissions: next });
  }

  async function invite() {
    setError(null);
    if (!invEmail.includes("@")) {
      setError("Enter a valid email.");
      return;
    }
    setInviting(true);
    try {
      const res = await fetch("/api/admin/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: invEmail,
          name: invName || null,
          password: invPassword,
          role: invRole,
          permissions: [],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Could not add member");
        return;
      }
      setInvEmail("");
      setInvName("");
      setInvPassword("");
      await load();
    } finally {
      setInviting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Invite */}
      <div className="rounded-md border border-neutral-800 bg-zinc-950/60 p-4">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-300">
          Add team member
        </h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <input
            value={invEmail}
            onChange={(e) => setInvEmail(e.target.value)}
            placeholder="Email *"
            className="rounded border border-neutral-700 bg-black px-3 py-2 text-xs text-white"
          />
          <input
            value={invName}
            onChange={(e) => setInvName(e.target.value)}
            placeholder="Name"
            className="rounded border border-neutral-700 bg-black px-3 py-2 text-xs text-white"
          />
          <input
            value={invPassword}
            onChange={(e) => setInvPassword(e.target.value)}
            type="password"
            placeholder="Temp password (new users)"
            className="rounded border border-neutral-700 bg-black px-3 py-2 text-xs text-white"
          />
          <div className="flex gap-2">
            <select
              value={invRole}
              onChange={(e) => setInvRole(e.target.value)}
              className="flex-1 rounded border border-neutral-700 bg-black px-2 py-2 text-xs text-white"
            >
              <option value="STAFF">Staff</option>
              <option value="ADMIN">Admin</option>
            </select>
            <button
              onClick={invite}
              disabled={inviting}
              className="rounded bg-white px-3 py-2 text-[0.7rem] uppercase tracking-[0.16em] text-black disabled:opacity-50"
            >
              {inviting ? "…" : "Add"}
            </button>
          </div>
        </div>
        <p className="mt-2 text-[0.7rem] text-neutral-500">
          Existing customers are upgraded in place. New members need a temporary
          password to sign in with.
        </p>
      </div>

      {error && (
        <p className="rounded border border-rose-800 bg-rose-950/40 px-3 py-2 text-xs text-rose-300">
          {error}
        </p>
      )}

      {/* List */}
      {loading ? (
        <p className="text-xs text-neutral-500">Loading team…</p>
      ) : (
        <div className="space-y-3">
          {users.map((u) => (
            <div
              key={u.id}
              className="rounded-md border border-neutral-800 bg-zinc-950/60 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-white">
                    {u.name ?? u.email}
                    {u.twoFactorEnabled && (
                      <span className="ml-2 rounded bg-emerald-950 px-1.5 py-0.5 text-[0.6rem] uppercase tracking-[0.14em] text-emerald-300">
                        2FA
                      </span>
                    )}
                  </p>
                  <p className="text-[0.7rem] text-neutral-500">{u.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  {savingId === u.id && (
                    <span className="text-[0.7rem] text-neutral-500">Saving…</span>
                  )}
                  <select
                    value={u.role}
                    onChange={(e) => patch(u.id, { role: e.target.value })}
                    className="rounded border border-neutral-700 bg-black px-2 py-1.5 text-xs text-white"
                  >
                    <option value="ADMIN">Admin</option>
                    <option value="STAFF">Staff</option>
                    <option value="CUSTOMER">Customer (revoke)</option>
                  </select>
                </div>
              </div>

              {u.role === "STAFF" && (
                <div className="mt-3 border-t border-neutral-900 pt-3">
                  <p className="mb-2 text-[0.7rem] uppercase tracking-[0.16em] text-neutral-500">
                    Permissions
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {PERMISSIONS.map((perm) => {
                      const on = u.permissions.includes(perm.key);
                      return (
                        <button
                          key={perm.key}
                          onClick={() => togglePerm(u, perm.key)}
                          className={`rounded-full border px-2.5 py-1 text-[0.7rem] ${
                            on
                              ? "border-emerald-600 bg-emerald-950 text-emerald-300"
                              : "border-neutral-700 text-neutral-400 hover:bg-neutral-900"
                          }`}
                        >
                          {perm.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {u.role === "ADMIN" && (
                <p className="mt-3 border-t border-neutral-900 pt-3 text-[0.7rem] text-neutral-500">
                  Admins have full access to everything.
                </p>
              )}
            </div>
          ))}
          {users.length === 0 && (
            <p className="text-xs text-neutral-500">No team members yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
