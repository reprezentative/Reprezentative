"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ReviewActions({
  id,
  status,
}: {
  id: string;
  status: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function setStatus(next: string) {
    setBusy(true);
    try {
      await fetch(`/api/admin/reviews/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm("Delete this review permanently?")) return;
    setBusy(true);
    try {
      await fetch(`/api/admin/reviews/${id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {status !== "APPROVED" && (
        <button
          onClick={() => setStatus("APPROVED")}
          disabled={busy}
          className="rounded border border-emerald-700 px-2 py-1 text-[0.65rem] uppercase tracking-[0.14em] text-emerald-300 hover:bg-emerald-950 disabled:opacity-50"
        >
          Approve
        </button>
      )}
      {status !== "REJECTED" && (
        <button
          onClick={() => setStatus("REJECTED")}
          disabled={busy}
          className="rounded border border-amber-700 px-2 py-1 text-[0.65rem] uppercase tracking-[0.14em] text-amber-300 hover:bg-amber-950 disabled:opacity-50"
        >
          Reject
        </button>
      )}
      <button
        onClick={remove}
        disabled={busy}
        className="rounded border border-neutral-700 px-2 py-1 text-[0.65rem] uppercase tracking-[0.14em] text-neutral-400 hover:bg-neutral-800 disabled:opacity-50"
      >
        Delete
      </button>
    </div>
  );
}
