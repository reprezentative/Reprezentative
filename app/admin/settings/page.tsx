"use client";

import { useEffect, useState } from "react";
import { AdminPageHelp } from "@/components/AdminPageHelp";

type HomepageLayout = "ralph" | "drop";

type GeneralSettings = {
  storeName: string;
  supportEmail: string;
  defaultCurrency: string;
  timezone: string;
  enableWishlist: boolean;
  enableAiAssistant: boolean;
  homepageLayout: HomepageLayout;
};

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<GeneralSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [resetConfirm, setResetConfirm] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/admin/settings/general");
        if (!res.ok) {
          throw new Error("Failed to load settings");
        }
        const json = (await res.json()) as GeneralSettings;
        if (!cancelled) {
          setSettings(json);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setError("Could not load settings.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleChange = (
    field: keyof GeneralSettings,
    value: string | boolean,
  ) => {
    if (!settings) return;
    setSettings({ ...settings, [field]: value } as GeneralSettings);
    setSaved(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    try {
      setSaving(true);
      setError(null);
      const res = await fetch("/api/admin/settings/general", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      });
      if (!res.ok) {
        throw new Error("Failed to save settings");
      }
      setSaved(true);
    } catch (err) {
      console.error(err);
      setError("There was a problem saving settings. Check server logs.");
    } finally {
      setSaving(false);
    }
  };

  const handleSystemReset = async () => {
    setResetError(null);
    setResetMessage(null);

    try {
      setResetLoading(true);
      const res = await fetch("/api/admin/settings/reset", {
        method: "POST",
      });

      const json = (await res.json()) as {
        error?: string;
        message?: string;
      };

      if (!res.ok) {
        throw new Error(json.error || "Failed to reset system");
      }

      setResetMessage(
        json.message ?? "System reset complete. Demo data has been reloaded.",
      );
      setResetConfirm("");
    } catch (err) {
      console.error(err);
      setResetError(
        "There was a problem running the system reset. Check server logs.",
      );
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="border-b border-neutral-800 bg-zinc-900/70 px-6 py-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              System Settings
            </h1>
            <p className="mt-1 text-xs text-neutral-400">
              Store basics and feature toggles. Changes apply across the admin
              and storefront.
            </p>
          </div>
          <AdminPageHelp page="settings" />
        </div>
      </div>

      <section className="px-6 py-6 text-xs">
        {loading && (
          <p className="text-[0.8rem] text-neutral-400">Loading settings…</p>
        )}
        {error && (
          <p className="mb-3 text-[0.8rem] text-red-400">
            {error} You might need to re-authenticate as an admin.
          </p>
        )}

        {settings && (
          <form
            onSubmit={handleSubmit}
            className="space-y-6 rounded-md border border-neutral-800 bg-zinc-950/60 p-4"
          >
            <div>
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-neutral-300">
                Brand Basics
              </p>
              <p className="mt-1 text-[0.7rem] text-neutral-500">
                These values appear in nav, emails, and key metadata.
              </p>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <label className="flex flex-col gap-1">
                  <span className="text-[0.7rem] text-neutral-300">
                    Store name
                  </span>
                  <input
                    type="text"
                    value={settings.storeName}
                    onChange={(e) =>
                      handleChange("storeName", e.target.value)
                    }
                    className="rounded-md border border-neutral-700 bg-black px-3 py-1.5 text-[0.8rem] text-neutral-100 placeholder:text-neutral-600 focus:border-neutral-400 focus:outline-none"
                    placeholder="Reprezentative"
                  />
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-[0.7rem] text-neutral-300">
                    Support email
                  </span>
                  <input
                    type="email"
                    value={settings.supportEmail}
                    onChange={(e) =>
                      handleChange("supportEmail", e.target.value)
                    }
                    className="rounded-md border border-neutral-700 bg-black px-3 py-1.5 text-[0.8rem] text-neutral-100 placeholder:text-neutral-600 focus:border-neutral-400 focus:outline-none"
                    placeholder="support@example.com"
                  />
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-[0.7rem] text-neutral-300">
                    Default currency
                  </span>
                  <input
                    type="text"
                    value={settings.defaultCurrency}
                    onChange={(e) =>
                      handleChange("defaultCurrency", e.target.value)
                    }
                    className="rounded-md border border-neutral-700 bg-black px-3 py-1.5 text-[0.8rem] text-neutral-100 placeholder:text-neutral-600 focus:border-neutral-400 focus:outline-none"
                    placeholder="USD"
                  />
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-[0.7rem] text-neutral-300">
                    Timezone (IANA)
                  </span>
                  <input
                    type="text"
                    value={settings.timezone}
                    onChange={(e) =>
                      handleChange("timezone", e.target.value)
                    }
                    className="rounded-md border border-neutral-700 bg-black px-3 py-1.5 text-[0.8rem] text-neutral-100 placeholder:text-neutral-600 focus:border-neutral-400 focus:outline-none"
                    placeholder="America/New_York"
                  />
                </label>
              </div>
            </div>

            <div className="border-t border-neutral-900 pt-4">
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-neutral-300">
                Feature Toggles
              </p>
              <p className="mt-1 text-[0.7rem] text-neutral-500">
                Turn platform features on or off without code changes.
              </p>

              <div className="mt-3 space-y-3">
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={settings.enableWishlist}
                    onChange={(e) =>
                      handleChange("enableWishlist", e.target.checked)
                    }
                    className="mt-0.5 h-3.5 w-3.5 rounded border-neutral-600 bg-black text-neutral-100"
                  />
                  <span className="text-[0.75rem] text-neutral-200">
                    Enable wishlist
                    <span className="block text-[0.7rem] text-neutral-500">
                      Controls wishlist visibility and related actions.
                    </span>
                  </span>
                </label>

                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={settings.enableAiAssistant}
                    onChange={(e) =>
                      handleChange("enableAiAssistant", e.target.checked)
                    }
                    className="mt-0.5 h-3.5 w-3.5 rounded border-neutral-600 bg-black text-neutral-100"
                  />
                  <span className="text-[0.75rem] text-neutral-200">
                    Enable AI Assistant
                    <span className="block text-[0.7rem] text-neutral-500">
                      Shows or hides AI surfaces like the Admin AI Assistant
                      entry point.
                    </span>
                  </span>
                </label>
              </div>
            </div>

            <div className="border-t border-neutral-900 pt-4">
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-neutral-300">
                Homepage Layout
              </p>
              <p className="mt-1 text-[0.7rem] text-neutral-500">
                Choose how the storefront homepage is structured.
              </p>

              <div className="mt-3 space-y-2 text-[0.75rem] text-neutral-200">
                <label className="flex items-start gap-2">
                  <input
                    type="radio"
                    name="homepageLayout"
                    value="ralph"
                    checked={settings.homepageLayout === "ralph"}
                    onChange={() => handleChange("homepageLayout", "ralph")}
                    className="mt-0.5 h-3.5 w-3.5 text-white"
                  />
                  <span>
                    Classic Editorial (Ralph‑style)
                    <span className="block text-[0.7rem] text-neutral-500">
                      Large hero with campaign imagery, curated product grids,
                      and editorial bands.
                    </span>
                  </span>
                </label>

                <label className="flex items-start gap-2">
                  <input
                    type="radio"
                    name="homepageLayout"
                    value="drop"
                    checked={settings.homepageLayout === "drop"}
                    onChange={() => handleChange("homepageLayout", "drop")}
                    className="mt-0.5 h-3.5 w-3.5 text-white"
                  />
                  <span>
                    Drop Feed (Stüssy / Supreme‑style)
                    <span className="block text-[0.7rem] text-neutral-500">
                      Focused on weekly drops with a stacked feed and punchy
                      product grid.
                    </span>
                  </span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-neutral-900 pt-4 text-[0.7rem]">
              <div className="text-neutral-500">
                {saved && (
                  <span className="text-emerald-400">Settings saved.</span>
                )}
              </div>
              <button
                type="submit"
                disabled={saving}
                className="rounded-md bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-black disabled:cursor-not-allowed disabled:opacity-40"
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </form>
        )}

        {process.env.NODE_ENV !== "production" && (
          <div className="mt-6 space-y-3 rounded-md border border-red-900/70 bg-red-950/40 p-4">
            <div>
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-red-200">
                System Reset (Local / QA Only)
              </p>
              <p className="mt-1 text-[0.7rem] text-red-100/90">
                This will clear volatile data like carts, orders, stock history,
                newsletter signups, and AI chat history, then repopulate a
                small demo dataset.{" "}
                <span className="font-semibold">
                  It cannot be undone. Do not use in production.
                </span>
              </p>
            </div>

            {resetError && (
              <p className="text-[0.7rem] text-red-300">{resetError}</p>
            )}
            {resetMessage && (
              <p className="text-[0.7rem] text-emerald-300">{resetMessage}</p>
            )}

            <div className="mt-2 grid gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] md:items-end">
              <label className="flex flex-col gap-1">
                <span className="text-[0.7rem] text-red-100">
                  Type <span className="font-mono font-semibold">RESET</span>{" "}
                  to confirm
                </span>
                <input
                  type="text"
                  value={resetConfirm}
                  onChange={(e) => setResetConfirm(e.target.value)}
                  className="rounded-md border border-red-700 bg-black px-3 py-1.5 text-[0.8rem] text-red-50 placeholder:text-red-400/60 focus:border-red-400 focus:outline-none"
                  placeholder="RESET"
                />
              </label>

              <button
                type="button"
                disabled={
                  resetLoading || resetConfirm.trim().toUpperCase() !== "RESET"
                }
                onClick={handleSystemReset}
                className="h-9 rounded-md bg-red-500 px-4 text-[0.75rem] font-semibold uppercase tracking-[0.16em] text-white shadow-sm hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {resetLoading ? "Resetting…" : "Run system reset"}
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

