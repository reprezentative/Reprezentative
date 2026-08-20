"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteProductButton({
  productId,
  productName,
}: {
  productId: string;
  productName: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const onDelete = async () => {
    if (
      !window.confirm(
        `Delete "${productName}"? This cannot be undone. Products with existing orders cannot be deleted.`,
      )
    ) {
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(`/api/admin/products/${productId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        window.alert(body.error ?? "Failed to delete product.");
        return;
      }
      router.refresh();
    } catch (err) {
      console.error(err);
      window.alert("Failed to delete product.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onDelete}
      disabled={busy}
      className="inline-flex items-center rounded-md border border-rose-900/60 px-2 py-1 text-[0.65rem] uppercase tracking-[0.16em] text-rose-300 hover:bg-rose-950/40 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {busy ? "…" : "Delete"}
    </button>
  );
}
