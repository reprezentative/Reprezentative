"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type SupplierOption = {
  id: string;
  name: string;
};

export function NewPurchaseOrderForm({
  suppliers,
}: {
  suppliers: SupplierOption[];
}) {
  const router = useRouter();
  const [supplierId, setSupplierId] = useState<string>(
    suppliers[0]?.id ?? "",
  );
  const [expectedDate, setExpectedDate] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId) {
      setStatus("Select a supplier.");
      return;
    }
    setSubmitting(true);
    setStatus(null);
    try {
      const res = await fetch(
        "/api/admin/operations/purchase-orders",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            supplierId,
            expectedDate: expectedDate || undefined,
          }),
        },
      );
      if (!res.ok) {
        throw new Error("Failed to create PO");
      }
      const data = (await res.json()) as { id: string };
      setStatus("PO created.");
      router.push(
        `/admin/operations/purchase-orders/${encodeURIComponent(
          data.id,
        )}`,
      );
    } catch (err) {
      console.error(err);
      setStatus("Error creating PO.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-3 rounded-md border border-neutral-800 bg-zinc-950/60 p-4 text-xs"
    >
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-neutral-300">
          New Purchase Order
        </h2>
        {status && (
          <p className="text-[0.7rem] text-neutral-400">{status}</p>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div>
          <label className="mb-1 block text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-neutral-400">
            Supplier
          </label>
          <select
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            className="h-9 w-full rounded-md border border-neutral-800 bg-black px-3 text-xs text-white outline-none focus:border-neutral-500"
          >
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-neutral-400">
            Expected Date
          </label>
          <input
            type="date"
            value={expectedDate}
            onChange={(e) => setExpectedDate(e.target.value)}
            className="h-9 w-full rounded-md border border-neutral-800 bg-black px-3 text-xs text-white outline-none focus:border-neutral-500"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={submitting || !supplierId}
          className="inline-flex items-center justify-center rounded-md bg-white px-4 py-2 text-[0.75rem] font-semibold uppercase tracking-[0.18em] text-black hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Creating..." : "Create PO"}
        </button>
      </div>
    </form>
  );
}



