"use client";

import { useState, useTransition } from "react";

type VariantWithProduct = {
  id: string;
  stock: number;
  reserved: number;
  available: number;
  color: string;
  colorHex: string;
  size: string;
  product: {
    id: string;
    name: string;
    sku: string;
    category: string;
    images: string[];
  };
};

type Props = {
  variant: VariantWithProduct;
};

const LOW_STOCK_THRESHOLD = 10;

function getLevelLabel(available: number) {
  if (available <= 0) return "Out of stock";
  if (available < LOW_STOCK_THRESHOLD) return "Low";
  return "In stock";
}

function getLevelColorClasses(available: number) {
  if (available <= 0) {
    return "bg-red-500/15 text-red-300 border-red-500/40";
  }
  if (available < LOW_STOCK_THRESHOLD) {
    return "bg-amber-500/15 text-amber-300 border-amber-500/40";
  }
  return "bg-emerald-500/15 text-emerald-300 border-emerald-500/40";
}

export function InventoryRow({ variant }: Props) {
  const [stockValue, setStockValue] = useState<string>(
    String(variant.stock),
  );
  // Track available/status locally so they reflect the save without a reload.
  const [available, setAvailable] = useState<number>(variant.available);
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<string | null>(null);

  const onSave = () => {
    const parsed = parseInt(stockValue, 10);
    if (Number.isNaN(parsed) || parsed < 0) {
      setStatus("Enter a valid number");
      return;
    }

    startTransition(async () => {
      setStatus(null);
      try {
        const res = await fetch("/api/admin/inventory/stock", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            variantId: variant.id,
            newStock: parsed,
            reason: "manual_adjustment",
          }),
        });
        if (!res.ok) {
          throw new Error("Failed to update stock");
        }
        // Reflect the server-computed available immediately.
        const updated = await res.json().catch(() => null);
        if (updated && typeof updated.available === "number") {
          setAvailable(updated.available);
        } else {
          setAvailable(parsed - variant.reserved);
        }
        setStatus("Saved");
      } catch (err) {
        console.error(err);
        setStatus("Error");
      }
    });
  };

  return (
    <tr className="border-t border-neutral-900 hover:bg-neutral-900/40">
      <td className="px-3 py-2 align-top">
        <div className="flex items-center gap-3">
          {variant.product.images?.[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={variant.product.images[0]}
              alt={variant.product.name}
              className="h-10 w-10 flex-shrink-0 rounded object-cover ring-1 ring-neutral-800"
            />
          ) : (
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded bg-neutral-900 text-[0.55rem] text-neutral-600 ring-1 ring-neutral-800">
              No img
            </div>
          )}
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-medium text-white">
              {variant.product.name}
            </span>
            <span className="text-[0.7rem] text-neutral-500">
              {variant.product.sku} • {variant.product.category}
            </span>
          </div>
        </div>
      </td>
      <td className="px-3 py-2 align-top">
        <div className="flex items-center gap-2">
          <span
            className="h-3 w-3 rounded-full border border-neutral-700"
            style={{ backgroundColor: variant.colorHex }}
          />
          <span className="text-xs text-neutral-200">
            {variant.color}
          </span>
        </div>
      </td>
      <td className="px-3 py-2 align-top text-xs text-neutral-200">
        {variant.size}
      </td>
      <td className="px-3 py-2 align-top text-right text-xs text-neutral-100">
        <div className="flex flex-col items-end gap-1">
          <input
            type="number"
            value={stockValue}
            onChange={(e) => setStockValue(e.target.value)}
            className="h-7 w-16 rounded-md border border-neutral-800 bg-black px-2 text-right text-[0.7rem] text-white outline-none placeholder:text-neutral-600 focus:border-neutral-500"
          />
          <button
            type="button"
            onClick={onSave}
            disabled={isPending}
            className="h-6 rounded-md border border-neutral-700 px-2 text-[0.6rem] uppercase tracking-[0.16em] text-neutral-200 hover:bg-neutral-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Saving..." : "Update"}
          </button>
          {status && (
            <span className="text-[0.6rem] text-neutral-500">
              {status}
            </span>
          )}
        </div>
      </td>
      <td className="px-3 py-2 align-top text-right text-xs text-neutral-100">
        {variant.reserved}
      </td>
      <td className="px-3 py-2 align-top text-right text-xs text-neutral-100">
        {available}
      </td>
      <td className="px-3 py-2 align-top text-center">
        <span
          className={`inline-flex items-center justify-center rounded-full border px-2 py-1 text-[0.65rem] font-semibold ${getLevelColorClasses(
            available,
          )}`}
        >
          {getLevelLabel(available)}
        </span>
      </td>
    </tr>
  );
}


