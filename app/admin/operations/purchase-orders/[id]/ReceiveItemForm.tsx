"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  poId: string;
  itemId: string;
  maxQty: number;
};

export function ReceiveItemForm({ poId, itemId, maxQty }: Props) {
  const router = useRouter();
  const [qty, setQty] = useState<string>(
    maxQty > 0 ? String(maxQty) : "0",
  );
  const [damaged, setDamaged] = useState<string>("0");
  const [saving, setSaving] = useState(false);

  const onReceive = async () => {
    const parsed = parseInt(qty, 10) || 0;
    const damagedParsed = parseInt(damaged, 10) || 0;
    if (parsed + damagedParsed <= 0) return;
    setSaving(true);
    try {
      const res = await fetch(
        `/api/admin/operations/purchase-orders/${encodeURIComponent(
          poId,
        )}/receive`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            itemId,
            quantity: parsed,
            damaged: damagedParsed,
          }),
        },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to receive items");
      }
      router.refresh();
    } catch (err) {
      console.error(err);
      window.alert(err instanceof Error ? err.message : "Failed to receive items");
    } finally {
      setSaving(false);
    }
  };

  if (maxQty <= 0) {
    return (
      <span className="text-[0.7rem] text-neutral-500">
        Fully received
      </span>
    );
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <input
        type="number"
        min={0}
        max={maxQty}
        value={qty}
        onChange={(e) => setQty(e.target.value)}
        title="Good units received"
        className="h-7 w-14 rounded-md border border-neutral-800 bg-black px-2 text-right text-[0.7rem] text-white outline-none focus:border-neutral-500"
      />
      <input
        type="number"
        min={0}
        max={maxQty}
        value={damaged}
        onChange={(e) => setDamaged(e.target.value)}
        title="Damaged units (not added to stock)"
        className="h-7 w-12 rounded-md border border-rose-900/60 bg-black px-2 text-right text-[0.7rem] text-rose-300 outline-none focus:border-rose-500"
      />
      <button
        type="button"
        disabled={saving}
        onClick={onReceive}
        className="inline-flex items-center justify-center rounded-md border border-emerald-500 px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-emerald-300 hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {saving ? "Saving..." : "Receive"}
      </button>
    </div>
  );
}



