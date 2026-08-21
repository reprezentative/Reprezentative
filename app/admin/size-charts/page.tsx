"use client";

import { useEffect, useState } from "react";
import { AdminPageHelp } from "@/components/AdminPageHelp";

type Chart = { id: string; name: string; csv: string };

function newId() {
  return Math.random().toString(36).slice(2, 9);
}

// Parse the CSV into a header row + body rows for a small live preview.
function preview(csv: string): { headers: string[]; rows: string[][] } {
  const lines = csv
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return { headers: [], rows: [] };
  const split = (l: string) => l.split(",").map((c) => c.trim());
  return { headers: split(lines[0]), rows: lines.slice(1).map(split) };
}

export default function SizeChartsPage() {
  const [charts, setCharts] = useState<Chart[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/size-charts");
        const body = await res.json().catch(() => ({}));
        setCharts(body.charts ?? []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const addChart = () =>
    setCharts((prev) => [
      ...prev,
      {
        id: newId(),
        name: "New size chart",
        csv: "Size,Chest (in),Length (in)\nS,38,27\nM,40,28\nL,42,29\nXL,44,30",
      },
    ]);

  const update = (id: string, patch: Partial<Chart>) =>
    setCharts((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));

  const remove = (id: string) =>
    setCharts((prev) => prev.filter((c) => c.id !== id));

  const save = async () => {
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch("/api/admin/size-charts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ charts }),
      });
      if (!res.ok) throw new Error();
      setStatus("Saved.");
    } catch {
      setStatus("Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="border-b border-neutral-800 bg-zinc-900/70 px-6 py-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Size Charts</h1>
            <p className="mt-1 text-xs text-neutral-400">
              Reusable sizing tables shown on product pages.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="rounded-md bg-white px-4 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-black hover:bg-neutral-200 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save all"}
            </button>
            <AdminPageHelp page="size-charts" />
          </div>
        </div>
      </div>

      <section className="space-y-4 px-6 py-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={addChart}
            className="rounded-md border border-neutral-700 px-3 py-1.5 text-[0.7rem] uppercase tracking-[0.16em] text-neutral-200 hover:bg-neutral-900"
          >
            + Add size chart
          </button>
          {status && <p className="text-[0.7rem] text-neutral-400">{status}</p>}
        </div>

        {loading ? (
          <p className="py-10 text-center text-xs text-neutral-500">Loading…</p>
        ) : charts.length === 0 ? (
          <div className="rounded-md border border-dashed border-neutral-800 bg-zinc-950/60 py-12 text-center text-xs text-neutral-500">
            No size charts yet. Add one above.
          </div>
        ) : (
          <div className="space-y-4">
            {charts.map((c) => {
              const pv = preview(c.csv);
              return (
                <div
                  key={c.id}
                  className="rounded-md border border-neutral-800 bg-zinc-950/60 p-4"
                >
                  <div className="mb-3 flex items-center gap-2">
                    <input
                      value={c.name}
                      onChange={(e) => update(c.id, { name: e.target.value })}
                      className="h-9 flex-1 rounded-md border border-neutral-800 bg-black px-3 text-xs text-white outline-none focus:border-neutral-500"
                    />
                    <button
                      type="button"
                      onClick={() => remove(c.id)}
                      className="rounded-md border border-rose-900/60 px-2 py-1 text-[0.6rem] uppercase tracking-[0.14em] text-rose-300 hover:bg-rose-950/40"
                    >
                      Delete
                    </button>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-[0.6rem] uppercase tracking-[0.16em] text-neutral-500">
                        CSV (first row = headers)
                      </label>
                      <textarea
                        value={c.csv}
                        onChange={(e) => update(c.id, { csv: e.target.value })}
                        rows={6}
                        className="w-full rounded-md border border-neutral-800 bg-black px-3 py-2 font-mono text-[0.7rem] text-white outline-none focus:border-neutral-500"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[0.6rem] uppercase tracking-[0.16em] text-neutral-500">
                        Preview
                      </label>
                      <div className="overflow-x-auto rounded-md border border-neutral-800">
                        <table className="min-w-full text-[0.7rem]">
                          <thead className="bg-zinc-900/80 text-neutral-300">
                            <tr>
                              {pv.headers.map((h, i) => (
                                <th key={i} className="px-2 py-1 text-left">
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {pv.rows.map((row, ri) => (
                              <tr key={ri} className="border-t border-neutral-900">
                                {row.map((cell, ci) => (
                                  <td key={ci} className="px-2 py-1 text-neutral-200">
                                    {cell}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
