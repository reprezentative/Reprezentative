"use client";

import { useState } from "react";
import Link from "next/link";
import { AdminPageHelp } from "@/components/AdminPageHelp";

const SAMPLE = `name,price,sku,category,description,image,status,tags,sizes
Heritage Hoodie,120,RZ-HOODIE,Hoodies,Heavyweight fleece hoodie,https://…/hoodie.jpg,ACTIVE,hoodie|new-drop,S:10|M:20|L:15|XL:8
Everyday Tee,45,RZ-TEE,Tees,Soft cotton tee,,ACTIVE,tee,S:25|M:25|L:25`;

type Result = {
  created: number;
  skipped: string[];
  errors: string[];
  total: number;
};

export default function ImportProductsPage() {
  const [csv, setCsv] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onFile = async (file: File) => {
    setCsv(await file.text());
  };

  const runImport = async () => {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/admin/products/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error || "Import failed.");
        return;
      }
      setResult(body);
    } catch {
      setError("Import failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="border-b border-neutral-800 bg-zinc-900/70 px-6 py-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Bulk Import Products
            </h1>
            <p className="mt-1 text-xs text-neutral-400">
              Create many products at once from a CSV.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin/products"
              className="rounded-md border border-neutral-700 px-3 py-1.5 text-[0.7rem] uppercase tracking-[0.16em] text-neutral-200 hover:bg-neutral-900"
            >
              Back to products
            </Link>
            <AdminPageHelp page="products" />
          </div>
        </div>
      </div>

      <section className="space-y-5 px-6 py-6">
        <div className="rounded-md border border-neutral-800 bg-zinc-950/60 p-4 text-xs">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-neutral-300">
            CSV format
          </p>
          <p className="mt-2 text-neutral-400">
            First row must be the header. Columns:{" "}
            <span className="text-neutral-200">
              name, price, sku, category, description, image, status, tags, sizes
            </span>
            . Only <span className="text-neutral-200">name</span> is required.
          </p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-neutral-400">
            <li>
              <span className="text-neutral-200">tags</span>: separate with{" "}
              <code>|</code> — e.g. <code>hoodie|new-drop</code>
            </li>
            <li>
              <span className="text-neutral-200">sizes</span>:{" "}
              <code>SIZE:STOCK</code> separated with <code>|</code> — e.g.{" "}
              <code>S:10|M:20|L:15</code>
            </li>
            <li>
              <span className="text-neutral-200">status</span>: ACTIVE, DRAFT,
              or ARCHIVED (defaults to ACTIVE)
            </li>
            <li>Rows with a SKU that already exists are skipped.</li>
          </ul>
          <pre className="mt-3 overflow-x-auto rounded bg-black/60 p-3 text-[0.65rem] text-neutral-400">
{SAMPLE}
          </pre>
          <button
            type="button"
            onClick={() => setCsv(SAMPLE)}
            className="mt-2 rounded-md border border-neutral-700 px-2.5 py-1 text-[0.6rem] uppercase tracking-[0.16em] text-neutral-200 hover:bg-neutral-900"
          >
            Load sample
          </button>
        </div>

        <div>
          <div className="mb-2 flex items-center gap-3">
            <label className="inline-flex cursor-pointer items-center rounded-md border border-neutral-700 px-3 py-1.5 text-[0.65rem] uppercase tracking-[0.16em] text-neutral-200 hover:bg-neutral-900">
              Upload .csv
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onFile(f);
                  e.currentTarget.value = "";
                }}
              />
            </label>
            <span className="text-[0.7rem] text-neutral-500">
              or paste CSV below
            </span>
          </div>
          <textarea
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
            rows={10}
            placeholder="Paste CSV here…"
            className="w-full rounded-md border border-neutral-800 bg-black px-3 py-2 font-mono text-xs text-white outline-none focus:border-neutral-500"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={busy || !csv.trim()}
            onClick={runImport}
            className="rounded-md bg-white px-5 py-2 text-[0.75rem] font-semibold uppercase tracking-[0.18em] text-black hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? "Importing…" : "Import products"}
          </button>
          {error && <p className="text-[0.75rem] text-red-400">{error}</p>}
        </div>

        {result && (
          <div className="rounded-md border border-neutral-800 bg-zinc-950/60 p-4 text-xs">
            <p className="text-sm font-semibold text-emerald-300">
              Imported {result.created} of {result.total} rows
            </p>
            {result.skipped.length > 0 && (
              <div className="mt-2">
                <p className="text-[0.7rem] uppercase tracking-[0.16em] text-neutral-400">
                  Skipped ({result.skipped.length})
                </p>
                <ul className="mt-1 list-inside list-disc text-[0.7rem] text-neutral-400">
                  {result.skipped.slice(0, 20).map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
            {result.errors.length > 0 && (
              <div className="mt-2">
                <p className="text-[0.7rem] uppercase tracking-[0.16em] text-rose-400">
                  Errors ({result.errors.length})
                </p>
                <ul className="mt-1 list-inside list-disc text-[0.7rem] text-rose-300">
                  {result.errors.slice(0, 20).map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
            <Link
              href="/admin/products"
              className="mt-3 inline-block rounded-md border border-neutral-700 px-3 py-1.5 text-[0.7rem] uppercase tracking-[0.16em] text-neutral-200 hover:bg-neutral-900"
            >
              View products
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
