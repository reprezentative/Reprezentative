"use client";

import { useState, FormEvent } from "react";

type SettingsFormProps = {
  initialLanguage: string | null;
  initialCurrency: string | null;
  initialTimezone: string | null;
};

export function SettingsForm({
  initialLanguage,
  initialCurrency,
  initialTimezone,
}: SettingsFormProps) {
  const [language, setLanguage] = useState(initialLanguage ?? "en-US");
  const [currency, setCurrency] = useState(initialCurrency ?? "USD");
  const [timezone, setTimezone] = useState(
    initialTimezone ?? "America/New_York",
  );
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setStatus(null);
    setSubmitting(true);
    try {
      const response = await fetch("/api/account/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language,
          currency,
          timezone,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setStatus(data.error ?? "Failed to update settings.");
        return;
      }
      setStatus("Settings updated.");
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        // eslint-disable-next-line no-console
        console.error("Settings update failed:", error);
      }
      setStatus("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-md border border-neutral-900 bg-neutral-950 p-4 text-xs"
    >
      <div className="grid gap-3 md:grid-cols-3">
        <div>
          <label className="mb-1 block text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-neutral-400">
            Language
          </label>
          <select
            value={language}
            onChange={(event) => setLanguage(event.target.value)}
            className="h-9 w-full rounded-md border border-neutral-800 bg-black px-2 text-xs text-white outline-none focus:border-neutral-500"
          >
            <option value="en-US">English (United States)</option>
            <option value="en-GB">English (United Kingdom)</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-neutral-400">
            Currency
          </label>
          <select
            value={currency}
            onChange={(event) => setCurrency(event.target.value)}
            className="h-9 w-full rounded-md border border-neutral-800 bg-black px-2 text-xs text-white outline-none focus:border-neutral-500"
          >
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-neutral-400">
            Timezone
          </label>
          <select
            value={timezone}
            onChange={(event) => setTimezone(event.target.value)}
            className="h-9 w-full rounded-md border border-neutral-800 bg-black px-2 text-xs text-white outline-none focus:border-neutral-500"
          >
            <option value="America/New_York">America/New_York</option>
            <option value="America/Los_Angeles">America/Los_Angeles</option>
            <option value="Europe/London">Europe/London</option>
          </select>
        </div>
      </div>

      {status && (
        <p className="text-[0.7rem] text-neutral-400">
          {status}
        </p>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center justify-center rounded-md bg-white px-4 py-2 text-[0.75rem] font-semibold uppercase tracking-[0.18em] text-black hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Saving..." : "Save settings"}
        </button>
      </div>
    </form>
  );
}



