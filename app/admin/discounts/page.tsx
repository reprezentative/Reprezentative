"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminPageHelp } from "@/components/AdminPageHelp";

type Coupon = {
  id: string;
  code: string;
  type: "PERCENT" | "FIXED" | "FREE_SHIPPING";
  value: number;
  active: boolean;
  minSubtotal: number | null;
  maxRedemptions: number | null;
  timesUsed: number;
};
type GiftCard = {
  id: string;
  code: string;
  initialBalance: number;
  balance: number;
  active: boolean;
};

export default function DiscountsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [giftCards, setGiftCards] = useState<GiftCard[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  // coupon form
  const [code, setCode] = useState("");
  const [type, setType] = useState<Coupon["type"]>("PERCENT");
  const [value, setValue] = useState("10");
  const [minSubtotal, setMinSubtotal] = useState("");
  const [maxRedemptions, setMaxRedemptions] = useState("");

  // gift card form
  const [gcAmount, setGcAmount] = useState("50");

  const load = useCallback(async () => {
    const [c, g] = await Promise.all([
      fetch("/api/admin/coupons").then((r) => r.json()).catch(() => ({})),
      fetch("/api/admin/gift-cards").then((r) => r.json()).catch(() => ({})),
    ]);
    setCoupons(c.coupons ?? []);
    setGiftCards(g.giftCards ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const createCoupon = async () => {
    setStatus(null);
    const res = await fetch("/api/admin/coupons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, type, value, minSubtotal, maxRedemptions }),
    });
    const b = await res.json().catch(() => ({}));
    if (!res.ok) return setStatus(b.error ?? "Failed to create coupon.");
    setCode("");
    setValue("10");
    setMinSubtotal("");
    setMaxRedemptions("");
    setStatus("Coupon created.");
    load();
  };

  const toggleCoupon = async (c: Coupon) => {
    await fetch(`/api/admin/coupons/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !c.active }),
    });
    load();
  };

  const deleteCoupon = async (c: Coupon) => {
    if (!window.confirm(`Delete code ${c.code}?`)) return;
    await fetch(`/api/admin/coupons/${c.id}`, { method: "DELETE" });
    load();
  };

  const createGiftCard = async () => {
    setStatus(null);
    const res = await fetch("/api/admin/gift-cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: gcAmount }),
    });
    const b = await res.json().catch(() => ({}));
    if (!res.ok) return setStatus(b.error ?? "Failed to create gift card.");
    setStatus(`Gift card created: ${b.code}`);
    load();
  };

  const describe = (c: Coupon) =>
    c.type === "PERCENT"
      ? `${c.value}% off`
      : c.type === "FIXED"
        ? `$${c.value.toFixed(2)} off`
        : "Free shipping";

  const input =
    "h-9 w-full rounded-md border border-neutral-800 bg-black px-3 text-xs text-white outline-none focus:border-neutral-500";
  const label =
    "mb-1 block text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-neutral-400";

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="border-b border-neutral-800 bg-zinc-900/70 px-6 py-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Discounts &amp; Gift Cards
            </h1>
            <p className="mt-1 text-xs text-neutral-400">
              Create promo codes and gift cards customers can redeem at checkout.
            </p>
          </div>
          <AdminPageHelp page="discounts" />
        </div>
      </div>

      <section className="grid gap-6 px-6 py-6 lg:grid-cols-2">
        {/* Coupons */}
        <div className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-300">
            Promo Codes
          </h2>
          <div className="space-y-3 rounded-md border border-neutral-800 bg-zinc-950/60 p-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={label}>Code</label>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="SUMMER20"
                  className={input}
                />
              </div>
              <div>
                <label className={label}>Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as Coupon["type"])}
                  className={input}
                >
                  <option value="PERCENT">Percent off</option>
                  <option value="FIXED">Fixed $ off</option>
                  <option value="FREE_SHIPPING">Free shipping</option>
                </select>
              </div>
              {type !== "FREE_SHIPPING" && (
                <div>
                  <label className={label}>
                    {type === "PERCENT" ? "Percent" : "Amount ($)"}
                  </label>
                  <input
                    type="number"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className={input}
                  />
                </div>
              )}
              <div>
                <label className={label}>Min subtotal ($)</label>
                <input
                  type="number"
                  value={minSubtotal}
                  onChange={(e) => setMinSubtotal(e.target.value)}
                  placeholder="optional"
                  className={input}
                />
              </div>
              <div>
                <label className={label}>Max uses</label>
                <input
                  type="number"
                  value={maxRedemptions}
                  onChange={(e) => setMaxRedemptions(e.target.value)}
                  placeholder="optional"
                  className={input}
                />
              </div>
            </div>
            <button
              type="button"
              onClick={createCoupon}
              className="rounded-md bg-white px-4 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-black hover:bg-neutral-200"
            >
              Create code
            </button>
          </div>

          <div className="overflow-hidden rounded-md border border-neutral-800">
            <table className="min-w-full text-xs">
              <thead className="bg-zinc-900/80 text-[0.65rem] uppercase tracking-[0.14em] text-neutral-400">
                <tr>
                  <th className="px-3 py-2 text-left">Code</th>
                  <th className="px-3 py-2 text-left">Discount</th>
                  <th className="px-3 py-2 text-right">Used</th>
                  <th className="px-3 py-2 text-center">Active</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((c) => (
                  <tr key={c.id} className="border-t border-neutral-900">
                    <td className="px-3 py-2 font-mono text-neutral-100">{c.code}</td>
                    <td className="px-3 py-2 text-neutral-300">{describe(c)}</td>
                    <td className="px-3 py-2 text-right text-neutral-300">
                      {c.timesUsed}
                      {c.maxRedemptions ? `/${c.maxRedemptions}` : ""}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => toggleCoupon(c)}
                        className={`rounded px-2 py-0.5 text-[0.6rem] uppercase ${
                          c.active
                            ? "bg-emerald-500/15 text-emerald-300"
                            : "bg-neutral-700/50 text-neutral-400"
                        }`}
                      >
                        {c.active ? "On" : "Off"}
                      </button>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => deleteCoupon(c)}
                        className="text-[0.6rem] uppercase tracking-[0.14em] text-rose-300 hover:underline"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {coupons.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-4 text-center text-neutral-500">
                      No codes yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Gift cards */}
        <div className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-300">
            Gift Cards
          </h2>
          <div className="flex items-end gap-2 rounded-md border border-neutral-800 bg-zinc-950/60 p-4">
            <div className="w-32">
              <label className={label}>Amount ($)</label>
              <input
                type="number"
                value={gcAmount}
                onChange={(e) => setGcAmount(e.target.value)}
                className={input}
              />
            </div>
            <button
              type="button"
              onClick={createGiftCard}
              className="h-9 rounded-md bg-white px-4 text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-black hover:bg-neutral-200"
            >
              Issue gift card
            </button>
          </div>
          <div className="overflow-hidden rounded-md border border-neutral-800">
            <table className="min-w-full text-xs">
              <thead className="bg-zinc-900/80 text-[0.65rem] uppercase tracking-[0.14em] text-neutral-400">
                <tr>
                  <th className="px-3 py-2 text-left">Code</th>
                  <th className="px-3 py-2 text-right">Balance</th>
                  <th className="px-3 py-2 text-right">Initial</th>
                </tr>
              </thead>
              <tbody>
                {giftCards.map((g) => (
                  <tr key={g.id} className="border-t border-neutral-900">
                    <td className="px-3 py-2 font-mono text-neutral-100">{g.code}</td>
                    <td className="px-3 py-2 text-right text-neutral-200">
                      ${g.balance.toFixed(2)}
                    </td>
                    <td className="px-3 py-2 text-right text-neutral-500">
                      ${g.initialBalance.toFixed(2)}
                    </td>
                  </tr>
                ))}
                {giftCards.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-3 py-4 text-center text-neutral-500">
                      No gift cards yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        {status && (
          <p className="text-[0.75rem] text-neutral-400 lg:col-span-2">{status}</p>
        )}
      </section>
    </main>
  );
}
