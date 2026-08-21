"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Item = {
  id: string;
  name: string;
  size: string;
  color: string;
  quantity: number;
  price: number;
};

export function ReturnForm({
  orderId,
  items,
  hasPaymentIntent,
}: {
  orderId: string;
  items: Item[];
  hasPaymentIntent: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [reason, setReason] = useState("");
  const [restock, setRestock] = useState(true);
  const [refundNow, setRefundNow] = useState(false);
  const [refundAmount, setRefundAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = items
    .map((i) => ({ item: i, q: qty[i.id] ?? 0 }))
    .filter((x) => x.q > 0);
  const suggestedRefund = selected.reduce(
    (s, x) => s + x.item.price * x.q,
    0,
  );

  async function submit() {
    setError(null);
    if (selected.length === 0) {
      setError("Select at least one item and quantity.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/returns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: selected.map((x) => ({
            orderItemId: x.item.id,
            quantity: x.q,
          })),
          reason: reason || null,
          restock,
          refundNow,
          refundAmount: refundNow
            ? Number(refundAmount || suggestedRefund)
            : 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Failed to create return");
        setBusy(false);
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setError("Network error");
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded border border-neutral-700 px-3 py-1.5 text-[0.7rem] uppercase tracking-[0.16em] text-neutral-200 hover:bg-neutral-800"
      >
        Create Return / RMA
      </button>
    );
  }

  return (
    <div className="space-y-3 text-xs">
      <div className="space-y-2">
        {items.map((i) => (
          <div
            key={i.id}
            className="flex items-center justify-between gap-3 border-b border-neutral-900 pb-2"
          >
            <div className="text-neutral-200">
              {i.name}
              <span className="text-neutral-500">
                {" "}
                • {i.size} • qty {i.quantity}
              </span>
            </div>
            <input
              type="number"
              min={0}
              max={i.quantity}
              value={qty[i.id] ?? 0}
              onChange={(e) =>
                setQty((q) => ({
                  ...q,
                  [i.id]: Math.max(
                    0,
                    Math.min(i.quantity, Number(e.target.value) || 0),
                  ),
                }))
              }
              className="w-16 rounded border border-neutral-700 bg-black px-2 py-1 text-white"
            />
          </div>
        ))}
      </div>

      <input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Reason (optional)"
        className="w-full rounded border border-neutral-700 bg-black px-2 py-1.5 text-white"
      />

      <label className="flex items-center gap-2 text-neutral-300">
        <input
          type="checkbox"
          checked={restock}
          onChange={(e) => setRestock(e.target.checked)}
        />
        Restock returned units to inventory
      </label>

      <label className="flex items-center gap-2 text-neutral-300">
        <input
          type="checkbox"
          checked={refundNow}
          onChange={(e) => setRefundNow(e.target.checked)}
        />
        Issue refund now
        {!hasPaymentIntent && (
          <span className="text-neutral-500">(no payment on file — records only)</span>
        )}
      </label>

      {refundNow && (
        <input
          type="number"
          step="0.01"
          value={refundAmount}
          onChange={(e) => setRefundAmount(e.target.value)}
          placeholder={`Refund amount (suggested $${suggestedRefund.toFixed(2)})`}
          className="w-full rounded border border-neutral-700 bg-black px-2 py-1.5 text-white"
        />
      )}

      {error && <p className="text-rose-400">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={busy}
          className="rounded bg-white px-3 py-1.5 text-[0.7rem] uppercase tracking-[0.16em] text-black disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save Return"}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="rounded border border-neutral-700 px-3 py-1.5 text-[0.7rem] uppercase tracking-[0.16em] text-neutral-300 hover:bg-neutral-800"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
