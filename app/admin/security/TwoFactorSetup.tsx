"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function TwoFactorSetup({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [secret, setSecret] = useState<string | null>(null);
  const [otpauth, setOtpauth] = useState<string | null>(null);
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function call(action: string, extra: any = {}) {
    setError(null);
    setMsg(null);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Something went wrong");
        return null;
      }
      return data;
    } finally {
      setBusy(false);
    }
  }

  async function startSetup() {
    const d = await call("setup");
    if (d) {
      setSecret(d.secret);
      setOtpauth(d.otpauth);
    }
  }

  async function enable() {
    const d = await call("enable", { token });
    if (d) {
      setSecret(null);
      setOtpauth(null);
      setToken("");
      setMsg("Two-factor authentication is now enabled.");
      router.refresh();
    }
  }

  async function disable() {
    if (!confirm("Disable two-factor authentication for your account?")) return;
    const d = await call("disable");
    if (d) {
      setMsg("Two-factor authentication disabled.");
      router.refresh();
    }
  }

  if (enabled) {
    return (
      <div className="space-y-3 text-xs">
        <p className="text-emerald-400">
          ✓ Two-factor authentication is enabled on your account.
        </p>
        <p className="text-neutral-400">
          You&apos;ll be asked for a 6-digit authenticator code each time you sign
          in.
        </p>
        {msg && <p className="text-emerald-400">{msg}</p>}
        {error && <p className="text-rose-400">{error}</p>}
        <button
          onClick={disable}
          disabled={busy}
          className="rounded border border-rose-700 px-3 py-1.5 text-[0.7rem] uppercase tracking-[0.16em] text-rose-300 hover:bg-rose-950 disabled:opacity-50"
        >
          Disable 2FA
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-xs">
      <p className="text-neutral-400">
        Add a second layer of security. You&apos;ll need an authenticator app
        (Google Authenticator, Authy, 1Password, etc.).
      </p>
      {msg && <p className="text-emerald-400">{msg}</p>}

      {!secret ? (
        <button
          onClick={startSetup}
          disabled={busy}
          className="rounded bg-white px-4 py-2 text-[0.7rem] uppercase tracking-[0.16em] text-black disabled:opacity-50"
        >
          {busy ? "Working…" : "Set up 2FA"}
        </button>
      ) : (
        <div className="space-y-3">
          <div className="rounded border border-neutral-800 bg-black/40 p-3">
            <p className="mb-1 text-neutral-400">
              1. Add this secret key to your authenticator app (manual entry):
            </p>
            <code className="block break-all rounded bg-neutral-900 px-2 py-1.5 text-sm tracking-widest text-white">
              {secret}
            </code>
            <p className="mt-2 break-all text-[0.65rem] text-neutral-600">
              {otpauth}
            </p>
          </div>
          <div>
            <p className="mb-1 text-neutral-400">
              2. Enter the current 6-digit code to confirm:
            </p>
            <div className="flex gap-2">
              <input
                value={token}
                onChange={(e) => setToken(e.target.value)}
                inputMode="numeric"
                maxLength={6}
                placeholder="123456"
                className="w-32 rounded border border-neutral-700 bg-black px-3 py-2 tracking-[0.3em] text-white"
              />
              <button
                onClick={enable}
                disabled={busy}
                className="rounded bg-white px-4 py-2 text-[0.7rem] uppercase tracking-[0.16em] text-black disabled:opacity-50"
              >
                Verify &amp; enable
              </button>
            </div>
          </div>
          {error && <p className="text-rose-400">{error}</p>}
        </div>
      )}
      {error && !secret && <p className="text-rose-400">{error}</p>}
    </div>
  );
}
