"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type VariantOption = {
  id: string;
  label: string;
};

export function AddPOItemForm({
  poId,
  variants,
}: {
  poId: string;
  variants: VariantOption[];
}) {
  const router = useRouter();
  const [variantId, setVariantId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);

    const qty = parseInt(quantity, 10);
    const cost = parseFloat(unitCost);
    if (!variantId || !qty || qty <= 0 || Number.isNaN(cost) || cost < 0) {
      setStatus("Select a variant and enter a valid quantity and unit cost.");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(
        `/api/admin/operations/purchase-orders/${poId}/items`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ variantId, quantity: qty, unitCost: cost }),
        },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to add item");
      }
      setVariantId("");
      setQuantity("");
      setUnitCost("");
      setStatus("Item added.");
      router.refresh();
    } catch (err: any) {
      console.error(err);
      setStatus(err.message ?? "Failed to add item.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className="mt-3 flex flex-wrap items-end gap-2 border-t border-neutral-800 pt-3 text-xs"
    >
      <div className="min-w-[14rem] flex-1">
        <label className="mb-1 block text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-neutral-400">
          Variant
        </label>
        <select
          value={variantId}
          onChange={(e) => setVariantId(e.target.value)}
          className="h-9 w-full rounded-md border border-neutral-800 bg-black px-2 text-xs text-white outline-none focus:border-neutral-500"
        >
          <option value="">Select a product variant…</option>
          {variants.map((v) => (
            <option key={v.id} value={v.id}>
              {v.label}
            </option>
          ))}
        </select>
      </div>
      <div className="w-24">
        <label className="mb-1 block text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-neutral-400">
          Qty
        </label>
        <input
          type="number"
          min="1"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          className="h-9 w-full rounded-md border border-neutral-800 bg-black px-3 text-xs text-white outline-none focus:border-neutral-500"
        />
      </div>
      <div className="w-28">
        <label className="mb-1 block text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-neutral-400">
          Unit Cost
        </label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={unitCost}
          onChange={(e) => setUnitCost(e.target.value)}
          className="h-9 w-full rounded-md border border-neutral-800 bg-black px-3 text-xs text-white outline-none focus:border-neutral-500"
        />
      </div>
      <button
        type="submit"
        disabled={busy}
        className="inline-flex h-9 items-center justify-center rounded-md bg-white px-4 text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-black hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? "Adding…" : "Add Item"}
      </button>
      {status && (
        <p className="w-full text-[0.7rem] text-neutral-400">{status}</p>
      )}
    </form>
  );
}
