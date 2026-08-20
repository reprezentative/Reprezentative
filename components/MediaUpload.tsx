"use client";

import { useState } from "react";

/**
 * Small "Upload image" button that uploads to Supabase Storage via the admin
 * upload API and calls back with the resulting public URL. Drop it next to any
 * image/media URL input.
 */
export function MediaUpload({
  onUploaded,
  label = "Upload image",
}: {
  onUploaded: (url: string) => void;
  label?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handle = async (file: File) => {
    setErr(null);
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Upload failed");
      onUploaded(body.url as string);
    } catch (e: any) {
      setErr(e.message || "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-1.5">
      <label className="inline-flex cursor-pointer items-center rounded-md border border-neutral-700 px-2.5 py-1 text-[0.6rem] uppercase tracking-[0.16em] text-neutral-200 hover:bg-neutral-900">
        {busy ? "Uploading…" : label}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handle(f);
            e.currentTarget.value = "";
          }}
        />
      </label>
      {err && <span className="ml-2 text-[0.65rem] text-red-400">{err}</span>}
    </div>
  );
}
