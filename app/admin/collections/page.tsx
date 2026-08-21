"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminPageHelp } from "@/components/AdminPageHelp";

type Collection = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  isActive: boolean;
  sortOrder: number;
  productIds: string[];
  productCount: number;
};
type ProductOption = { id: string; name: string; image: string | null };

export default function CollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [editing, setEditing] = useState<Collection | null>(null);
  const [editIds, setEditIds] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cRes, pRes] = await Promise.all([
        fetch("/api/admin/collections"),
        fetch("/api/admin/products"),
      ]);
      const c = await cRes.json().catch(() => ({}));
      const p = await pRes.json().catch(() => ({}));
      setCollections(c.collections ?? []);
      setProducts(p.products ?? []);
    } catch {
      setStatus("Could not load collections.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const create = async () => {
    if (!newName.trim()) return;
    const res = await fetch("/api/admin/collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });
    if (res.ok) {
      setNewName("");
      setStatus("Collection created.");
      load();
    } else {
      const b = await res.json().catch(() => ({}));
      setStatus(b.error ?? "Failed to create collection.");
    }
  };

  const openEdit = (c: Collection) => {
    setEditing(c);
    setEditIds(new Set(c.productIds));
  };

  const saveEdit = async () => {
    if (!editing) return;
    const res = await fetch(`/api/admin/collections/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editing.name,
        description: editing.description,
        isActive: editing.isActive,
        productIds: Array.from(editIds),
      }),
    });
    if (res.ok) {
      setEditing(null);
      setStatus("Collection saved.");
      load();
    } else {
      setStatus("Failed to save collection.");
    }
  };

  const remove = async (c: Collection) => {
    if (!window.confirm(`Delete collection "${c.name}"? Products are not deleted.`))
      return;
    const res = await fetch(`/api/admin/collections/${c.id}`, { method: "DELETE" });
    if (res.ok) {
      setCollections((prev) => prev.filter((x) => x.id !== c.id));
    } else {
      setStatus("Failed to delete.");
    }
  };

  const toggleId = (id: string) =>
    setEditIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="border-b border-neutral-800 bg-zinc-900/70 px-6 py-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Collections</h1>
            <p className="mt-1 text-xs text-neutral-400">
              Group products into collections (e.g. New Arrivals, Hoodies).
            </p>
          </div>
          <AdminPageHelp page="collections" />
        </div>
      </div>

      <section className="space-y-6 px-6 py-6">
        {/* Create */}
        <div className="flex items-end gap-2">
          <div className="flex-1 max-w-sm">
            <label className="mb-1 block text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-neutral-400">
              New collection
            </label>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && create()}
              placeholder="Collection name"
              className="h-9 w-full rounded-md border border-neutral-800 bg-black px-3 text-xs text-white outline-none focus:border-neutral-500"
            />
          </div>
          <button
            type="button"
            onClick={create}
            className="h-9 rounded-md bg-white px-4 text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-black hover:bg-neutral-200"
          >
            Create
          </button>
          {status && <p className="text-[0.7rem] text-neutral-400">{status}</p>}
        </div>

        {loading ? (
          <p className="py-10 text-center text-xs text-neutral-500">Loading…</p>
        ) : collections.length === 0 ? (
          <div className="rounded-md border border-dashed border-neutral-800 bg-zinc-950/60 py-12 text-center text-xs text-neutral-500">
            No collections yet. Create one above.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {collections.map((c) => (
              <div
                key={c.id}
                className="rounded-md border border-neutral-800 bg-zinc-950/60 p-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">{c.name}</p>
                    <p className="text-[0.7rem] text-neutral-500">/{c.slug}</p>
                  </div>
                  {!c.isActive && (
                    <span className="rounded bg-neutral-700/50 px-1.5 py-0.5 text-[0.55rem] uppercase text-neutral-300">
                      Hidden
                    </span>
                  )}
                </div>
                <p className="mt-2 text-[0.7rem] text-neutral-400">
                  {c.productCount} product{c.productCount === 1 ? "" : "s"}
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(c)}
                    className="flex-1 rounded-md border border-neutral-700 px-2 py-1 text-[0.6rem] uppercase tracking-[0.14em] text-neutral-200 hover:bg-neutral-900"
                  >
                    Edit / assign
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(c)}
                    className="rounded-md border border-rose-900/60 px-2 py-1 text-[0.6rem] uppercase tracking-[0.14em] text-rose-300 hover:bg-rose-950/40"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setEditing(null)}
        >
          <div
            className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-lg border border-neutral-800 bg-zinc-950 p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-3 text-sm font-semibold text-white">
              Edit collection
            </h3>
            <label className="mb-1 block text-[0.65rem] uppercase tracking-[0.16em] text-neutral-400">
              Name
            </label>
            <input
              value={editing.name}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              className="mb-3 h-9 w-full rounded-md border border-neutral-800 bg-black px-3 text-xs text-white outline-none focus:border-neutral-500"
            />
            <label className="mb-1 block text-[0.65rem] uppercase tracking-[0.16em] text-neutral-400">
              Description
            </label>
            <textarea
              rows={2}
              value={editing.description ?? ""}
              onChange={(e) =>
                setEditing({ ...editing, description: e.target.value })
              }
              className="mb-3 w-full rounded-md border border-neutral-800 bg-black px-3 py-2 text-xs text-white outline-none focus:border-neutral-500"
            />
            <label className="mb-3 flex items-center gap-2 text-[0.7rem] text-neutral-300">
              <input
                type="checkbox"
                checked={editing.isActive}
                onChange={(e) =>
                  setEditing({ ...editing, isActive: e.target.checked })
                }
              />
              Active (visible on store)
            </label>

            <p className="mb-2 text-[0.65rem] uppercase tracking-[0.16em] text-neutral-400">
              Products in this collection
            </p>
            <div className="max-h-56 space-y-1 overflow-y-auto rounded-md border border-neutral-800 p-2">
              {products.length === 0 ? (
                <p className="p-2 text-[0.7rem] text-neutral-500">
                  No products yet.
                </p>
              ) : (
                products.map((p) => (
                  <label
                    key={p.id}
                    className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-xs text-neutral-200 hover:bg-neutral-900"
                  >
                    <input
                      type="checkbox"
                      checked={editIds.has(p.id)}
                      onChange={() => toggleId(p.id)}
                    />
                    {p.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.image}
                        alt=""
                        className="h-6 w-6 rounded object-cover"
                      />
                    ) : (
                      <span className="h-6 w-6 rounded bg-neutral-800" />
                    )}
                    {p.name}
                  </label>
                ))
              )}
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-md border border-neutral-700 px-3 py-1.5 text-[0.7rem] text-neutral-300 hover:bg-neutral-900"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveEdit}
                className="rounded-md bg-white px-4 py-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-black hover:bg-neutral-200"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
