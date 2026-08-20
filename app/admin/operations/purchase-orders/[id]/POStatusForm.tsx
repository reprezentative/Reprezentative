"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  id: string;
  status: string;
};

const STATUSES = [
  "DRAFT",
  "SENT",
  "CONFIRMED",
  "IN_PRODUCTION",
  "SHIPPED",
  "PARTIALLY_RECEIVED",
  "RECEIVED",
  "CANCELLED",
] as const;

export function POStatusForm({ id, status }: Props) {
  const router = useRouter();
  const [value, setValue] = useState(status);
  const [saving, setSaving] = useState(false);

  const onChange = async (next: string) => {
    setValue(next);
    setSaving(true);
    try {
      const res = await fetch(
        `/api/admin/operations/purchase-orders/${encodeURIComponent(id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: next }),
        },
      );
      if (!res.ok) {
        throw new Error("Failed to update status");
      }
      router.refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-2 text-[0.7rem] text-neutral-300">
      <span className="text-neutral-400">Status:</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={saving}
        className="h-8 rounded-md border border-neutral-700 bg-black px-2 text-xs text-neutral-100 outline-none"
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </div>
  );
}



