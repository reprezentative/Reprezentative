"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminPageHelp } from "@/components/AdminPageHelp";

type Cart = {
  id: string;
  email: string;
  items: any[];
  subtotal: number;
  remindedAt: string | null;
  updatedAt: string;
};
type EmailRow = {
  id: string;
  to: string;
  subject: string;
  status: string;
  createdAt: string;
};

export default function AbandonedCartsPage() {
  const [carts, setCarts] = useState<Cart[]>([]);
  const [emailLog, setEmailLog] = useState<EmailRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/abandoned-carts");
      const body = await res.json().catch(() => ({}));
      setCarts(body.carts ?? []);
      setEmailLog(body.emailLog ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const sendReminder = async (c: Cart) => {
    setBusy(c.id);
    setStatus(null);
    try {
      const res = await fetch(`/api/admin/abandoned-carts/${c.id}/recover`, {
        method: "POST",
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus(body.error ?? "Failed to send.");
        return;
      }
      setStatus(
        body.skipped
          ? "Email is dormant (no provider key) — logged as SKIPPED."
          : "Reminder sent.",
      );
      load();
    } finally {
      setBusy(null);
    }
  };

  const dt = (s: string) => new Date(s).toLocaleString("en-US");

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="border-b border-neutral-800 bg-zinc-900/70 px-6 py-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Abandoned Carts
            </h1>
            <p className="mt-1 text-xs text-neutral-400">
              Shoppers who entered an email but didn&apos;t complete checkout.
            </p>
          </div>
          <AdminPageHelp page="abandoned-carts" />
        </div>
      </div>

      <section className="space-y-8 px-6 py-6">
        {status && <p className="text-[0.75rem] text-neutral-400">{status}</p>}

        <div>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-300">
            Open carts
          </h2>
          {loading ? (
            <p className="py-8 text-center text-xs text-neutral-500">Loading…</p>
          ) : carts.length === 0 ? (
            <div className="rounded-md border border-dashed border-neutral-800 bg-zinc-950/60 py-10 text-center text-xs text-neutral-500">
              No abandoned carts. 🎉
            </div>
          ) : (
            <div className="overflow-hidden rounded-md border border-neutral-800">
              <table className="min-w-full text-xs">
                <thead className="bg-zinc-900/80 text-[0.65rem] uppercase tracking-[0.14em] text-neutral-400">
                  <tr>
                    <th className="px-3 py-2 text-left">Email</th>
                    <th className="px-3 py-2 text-right">Items</th>
                    <th className="px-3 py-2 text-right">Subtotal</th>
                    <th className="px-3 py-2 text-left">Updated</th>
                    <th className="px-3 py-2 text-right">Reminder</th>
                  </tr>
                </thead>
                <tbody>
                  {carts.map((c) => (
                    <tr key={c.id} className="border-t border-neutral-900">
                      <td className="px-3 py-2 text-neutral-100">{c.email}</td>
                      <td className="px-3 py-2 text-right text-neutral-300">
                        {Array.isArray(c.items) ? c.items.length : 0}
                      </td>
                      <td className="px-3 py-2 text-right text-neutral-300">
                        ${c.subtotal.toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-[0.7rem] text-neutral-500">
                        {dt(c.updatedAt)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          disabled={busy === c.id}
                          onClick={() => sendReminder(c)}
                          className="rounded-md border border-neutral-700 px-2 py-1 text-[0.6rem] uppercase tracking-[0.14em] text-neutral-200 hover:bg-neutral-900 disabled:opacity-50"
                        >
                          {busy === c.id
                            ? "Sending…"
                            : c.remindedAt
                              ? "Resend"
                              : "Send reminder"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-300">
            Recent email activity
          </h2>
          {emailLog.length === 0 ? (
            <p className="text-xs text-neutral-500">No emails logged yet.</p>
          ) : (
            <div className="overflow-hidden rounded-md border border-neutral-800">
              <table className="min-w-full text-xs">
                <thead className="bg-zinc-900/80 text-[0.65rem] uppercase tracking-[0.14em] text-neutral-400">
                  <tr>
                    <th className="px-3 py-2 text-left">To</th>
                    <th className="px-3 py-2 text-left">Subject</th>
                    <th className="px-3 py-2 text-center">Status</th>
                    <th className="px-3 py-2 text-left">When</th>
                  </tr>
                </thead>
                <tbody>
                  {emailLog.map((e) => (
                    <tr key={e.id} className="border-t border-neutral-900">
                      <td className="px-3 py-2 text-neutral-200">{e.to}</td>
                      <td className="px-3 py-2 text-neutral-300">{e.subject}</td>
                      <td className="px-3 py-2 text-center">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[0.55rem] uppercase ${
                            e.status === "SENT"
                              ? "bg-emerald-500/15 text-emerald-300"
                              : e.status === "SKIPPED"
                                ? "bg-amber-500/15 text-amber-300"
                                : "bg-rose-500/15 text-rose-300"
                          }`}
                        >
                          {e.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-[0.7rem] text-neutral-500">
                        {dt(e.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-2 text-[0.65rem] text-neutral-600">
            Emails show as SKIPPED until an email provider key (Resend or
            SendGrid) is added — then they send for real.
          </p>
        </div>
      </section>
    </main>
  );
}
