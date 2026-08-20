"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const STATUSES = [
  "PENDING",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
] as const;

export function OrderStatusForm({
  orderId,
  status,
  orderNumber,
}: {
  orderId: string;
  status: string;
  orderNumber: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(status);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const apply = async () => {
    if (value === status) return;

    if (
      (value === "CANCELLED" || value === "REFUNDED") &&
      !window.confirm(
        `Set ${orderNumber} to ${value}? This returns the order's units to inventory. Process any monetary refund in Stripe separately.`,
      )
    ) {
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: value }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Failed to update status");
      setMessage(
        body.restocked ? "Status updated and inventory restocked." : "Status updated.",
      );
      router.refresh();
    } catch (err: any) {
      console.error(err);
      setMessage(err.message ?? "Failed to update status.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <select
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="h-8 rounded-md border border-neutral-800 bg-black px-2 text-[0.7rem] text-white outline-none focus:border-neutral-500"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={apply}
          disabled={busy || value === status}
          className="inline-flex h-8 items-center justify-center rounded-md bg-white px-3 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-black hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "…" : "Update"}
        </button>
      </div>
      {message && <p className="text-[0.7rem] text-neutral-400">{message}</p>}
    </div>
  );
}
