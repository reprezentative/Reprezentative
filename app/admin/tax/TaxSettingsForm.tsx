"use client";

import { useEffect, useState } from "react";

export function TaxSettingsForm() {
  const [enabled, setEnabled] = useState(false);
  const [ratePercent, setRatePercent] = useState("0");
  const [label, setLabel] = useState("Sales tax");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/tax")
      .then((r) => r.json())
      .then((d) => {
        setEnabled(!!d.enabled);
        setRatePercent(String(d.ratePercent ?? 0));
        setLabel(d.label ?? "Sales tax");
      })
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setBusy(true);
    setMsg(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/tax", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled,
          ratePercent: Number(ratePercent) || 0,
          label,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Save failed");
        return;
      }
      setMsg("Tax settings saved.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="text-xs text-neutral-500">Loading…</p>;

  return (
    <div className="max-w-md space-y-4 text-xs">
      <label className="flex items-center gap-2 text-neutral-300">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
        />
        Charge tax at checkout
      </label>

      <div>
        <label className="mb-1 block text-[0.7rem] uppercase tracking-[0.16em] text-neutral-400">
          Tax rate (%)
        </label>
        <input
          type="number"
          step="0.01"
          min="0"
          max="100"
          value={ratePercent}
          onChange={(e) => setRatePercent(e.target.value)}
          disabled={!enabled}
          className="w-32 rounded border border-neutral-700 bg-black px-3 py-2 text-white disabled:opacity-50"
        />
        <span className="ml-2 text-neutral-500">
          e.g. 8.25 for 8.25%
        </span>
      </div>

      <div>
        <label className="mb-1 block text-[0.7rem] uppercase tracking-[0.16em] text-neutral-400">
          Label shown to customers
        </label>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          disabled={!enabled}
          className="w-full rounded border border-neutral-700 bg-black px-3 py-2 text-white disabled:opacity-50"
        />
      </div>

      {msg && <p className="text-emerald-400">{msg}</p>}
      {error && <p className="text-rose-400">{error}</p>}

      <button
        onClick={save}
        disabled={busy}
        className="rounded bg-white px-4 py-2 text-[0.7rem] uppercase tracking-[0.16em] text-black disabled:opacity-50"
      >
        {busy ? "Saving…" : "Save tax settings"}
      </button>
      <p className="text-[0.7rem] text-neutral-500">
        Tax is applied to the discounted subtotal during checkout.
      </p>
    </div>
  );
}
