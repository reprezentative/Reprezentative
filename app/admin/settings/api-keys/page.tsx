"use client";

import { useEffect, useState } from "react";
import { AdminPageHelp } from "@/components/AdminPageHelp";

type IntegrationStatus = {
  configured: boolean;
  viaDashboard?: boolean;
};

type IntegrationsResponse = {
  stripe: IntegrationStatus;
  deepseek: IntegrationStatus;
  sendgrid: IntegrationStatus;
  s3: IntegrationStatus;
  taxjar: IntegrationStatus;
  smarty: IntegrationStatus;
};

export default function AdminApiKeysPage() {
  const [data, setData] = useState<IntegrationsResponse | null>(null);
  const [dashboardKeys, setDashboardKeys] = useState<Record<string, boolean>>(
    {},
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [stripeKey, setStripeKey] = useState("");
  const [stripeEditing, setStripeEditing] = useState(false);
  const [deepseekKey, setDeepseekKey] = useState("");
  const [deepseekEditing, setDeepseekEditing] = useState(false);
  const [sendgridKey, setSendgridKey] = useState("");
  const [sendgridEditing, setSendgridEditing] = useState(false);
  const [taxjarKey, setTaxjarKey] = useState("");
  const [taxjarEditing, setTaxjarEditing] = useState(false);
  const [s3AccessKeyId, setS3AccessKeyId] = useState("");
  const [s3SecretAccessKey, setS3SecretAccessKey] = useState("");
  const [s3Bucket, setS3Bucket] = useState("");
  const [s3Editing, setS3Editing] = useState(false);
  const [smartyAuthId, setSmartyAuthId] = useState("");
  const [smartyAuthToken, setSmartyAuthToken] = useState("");
  const [smartyEditing, setSmartyEditing] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [integrationsRes, keysRes] = await Promise.all([
          fetch("/api/admin/settings/integrations"),
          fetch("/api/admin/settings/keys"),
        ]);

        if (!integrationsRes.ok) {
          throw new Error("Failed to load integrations");
        }

        const json = (await integrationsRes.json()) as IntegrationsResponse;

        let keysJson: Record<string, boolean> = {};
        if (keysRes.ok) {
          keysJson = (await keysRes.json()) as Record<string, boolean>;
        }

        if (!cancelled) {
          setData(json);
          setDashboardKeys(keysJson);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) setError("Could not load integration status.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const renderBadge = (configured: boolean) => (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.16em] ${
        configured
          ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/40"
          : "bg-red-500/10 text-red-300 border border-red-500/40"
      }`}
    >
      {configured ? "Configured" : "Missing"}
    </span>
  );

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="border-b border-neutral-800 bg-zinc-900/70 px-6 py-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              API Keys & Integrations
            </h1>
            <p className="mt-1 text-xs text-neutral-400">
              Quick status overview for Stripe, DeepSeek, email, storage, and
              tax integrations. Secrets stay server-side; owners can update
              keys from this screen.
            </p>
          </div>
          <AdminPageHelp page="api-keys" />
        </div>
      </div>

      <section className="space-y-4 px-6 py-6 text-xs">
        {loading && (
          <p className="text-[0.8rem] text-neutral-400">Loading status…</p>
        )}
        {error && (
          <p className="text-[0.8rem] text-red-400">
            {error} Check your server logs.
          </p>
        )}

        {data && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2 rounded-md border border-neutral-800 bg-zinc-950/60 p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[0.75rem] font-semibold uppercase tracking-[0.16em] text-neutral-300">
                    Stripe
                  </p>
                  <p className="mt-1 text-[0.7rem] text-neutral-400">
                    Payments & checkout.
                  </p>
                </div>
                {renderBadge(data.stripe.configured)}
              </div>
              <p className="mt-2 text-[0.7rem] text-neutral-500">
                Uses either an environment variable (
                <code className="font-mono">STRIPE_SECRET_KEY</code>) or a key
                saved from this dashboard (planned). For production, env vars
                are still recommended.
              </p>
              <div className="mt-3 space-y-2">
                {dashboardKeys.stripe && (
                  <p className="text-[0.7rem] text-emerald-400">
                    Key stored via dashboard. Coordinate with your developer to
                    ensure Stripe is wired to use it safely.
                  </p>
                )}
                {!stripeEditing ? (
                  <button
                    type="button"
                    onClick={() => setStripeEditing(true)}
                    className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-[0.7rem] font-medium text-neutral-100 hover:border-neutral-500 hover:bg-neutral-800"
                  >
                    {dashboardKeys.stripe ? "Update Stripe key" : "Add Stripe key"}
                  </button>
                ) : (
                  <form
                    className="space-y-2"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!stripeKey.trim()) return;
                      try {
                        setSaving(true);
                        const res = await fetch("/api/admin/settings/keys", {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                          },
                          body: JSON.stringify({
                            service: "stripe",
                            apiKey: stripeKey.trim(),
                          }),
                        });
                        if (!res.ok) {
                          throw new Error("Failed to save key");
                        }
                        setDashboardKeys((prev) => ({
                          ...prev,
                          stripe: true,
                        }));
                        setStripeKey("");
                        setStripeEditing(false);
                      } catch (err) {
                        console.error(err);
                        alert(
                          "There was a problem saving the Stripe key. Check server logs.",
                        );
                      } finally {
                        setSaving(false);
                      }
                    }}
                  >
                    <input
                      type="password"
                      className="w-full rounded-md border border-neutral-700 bg-black px-3 py-1.5 text-[0.75rem] text-neutral-100 placeholder:text-neutral-500 focus:border-neutral-400 focus:outline-none"
                      placeholder="Paste Stripe secret key"
                      value={stripeKey}
                      onChange={(e) => setStripeKey(e.target.value)}
                    />
                    <div className="flex items-center gap-2 text-[0.7rem]">
                      <button
                        type="submit"
                        disabled={saving || !stripeKey.trim()}
                        className="rounded-md bg-white px-3 py-1.5 font-medium text-black disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {saving ? "Saving…" : "Save key"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setStripeEditing(false);
                          setStripeKey("");
                        }}
                        className="rounded-md px-3 py-1.5 text-neutral-400 hover:text-neutral-100"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>

            <div className="space-y-2 rounded-md border border-neutral-800 bg-zinc-950/60 p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[0.75rem] font-semibold uppercase tracking-[0.16em] text-neutral-300">
                    DeepSeek
                  </p>
                  <p className="mt-1 text-[0.7rem] text-neutral-400">
                    AI assistant & pricing.
                  </p>
                </div>
                {renderBadge(data.deepseek.configured)}
              </div>
              <p className="mt-2 text-[0.7rem] text-neutral-500">
                Uses either an environment variable (
                <code className="font-mono">DEEPSEEK_API_KEY</code>) or a key
                saved from this dashboard (preferred).
              </p>
              <div className="mt-3 space-y-2">
                {dashboardKeys.deepseek && (
                  <p className="text-[0.7rem] text-emerald-400">
                    Key stored via dashboard. You can rotate it at any time.
                  </p>
                )}
                {!deepseekEditing ? (
                  <button
                    type="button"
                    onClick={() => setDeepseekEditing(true)}
                    className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-[0.7rem] font-medium text-neutral-100 hover:border-neutral-500 hover:bg-neutral-800"
                  >
                    {dashboardKeys.deepseek ? "Update DeepSeek key" : "Add DeepSeek key"}
                  </button>
                ) : (
                  <form
                    className="space-y-2"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!deepseekKey.trim()) return;
                      try {
                        setSaving(true);
                        const res = await fetch(
                          "/api/admin/settings/keys",
                          {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                              service: "deepseek",
                              apiKey: deepseekKey.trim(),
                            }),
                          },
                        );
                        if (!res.ok) {
                          throw new Error("Failed to save key");
                        }
                        setDashboardKeys((prev) => ({
                          ...prev,
                          deepseek: true,
                        }));
                        setDeepseekKey("");
                        setDeepseekEditing(false);
                        // Optionally refresh integrations status
                      } catch (err) {
                        console.error(err);
                        alert(
                          "There was a problem saving the DeepSeek key. Check server logs.",
                        );
                      } finally {
                        setSaving(false);
                      }
                    }}
                  >
                    <input
                      type="password"
                      className="w-full rounded-md border border-neutral-700 bg-black px-3 py-1.5 text-[0.75rem] text-neutral-100 placeholder:text-neutral-500 focus:border-neutral-400 focus:outline-none"
                      placeholder="Paste DeepSeek API key"
                      value={deepseekKey}
                      onChange={(e) => setDeepseekKey(e.target.value)}
                    />
                    <div className="flex items-center gap-2 text-[0.7rem]">
                      <button
                        type="submit"
                        disabled={saving || !deepseekKey.trim()}
                        className="rounded-md bg-white px-3 py-1.5 font-medium text-black disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {saving ? "Saving…" : "Save key"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDeepseekEditing(false);
                          setDeepseekKey("");
                        }}
                        className="rounded-md px-3 py-1.5 text-neutral-400 hover:text-neutral-100"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>

            <div className="space-y-2 rounded-md border border-neutral-800 bg-zinc-950/60 p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[0.75rem] font-semibold uppercase tracking-[0.16em] text-neutral-300">
                    SendGrid
                  </p>
                  <p className="mt-1 text-[0.7rem] text-neutral-400">
                    Transactional & marketing email.
                  </p>
                </div>
                {renderBadge(data.sendgrid.configured)}
              </div>
              <p className="mt-2 text-[0.7rem] text-neutral-500">
                Uses either an environment variable (
                <code className="font-mono">SENDGRID_API_KEY</code>) or a key
                saved from this dashboard (planned). For production, env vars
                are still recommended.
              </p>
              <div className="mt-3 space-y-2">
                {dashboardKeys.sendgrid && (
                  <p className="text-[0.7rem] text-emerald-400">
                    Key stored via dashboard. Coordinate with your developer to
                    ensure email sending is wired to use it safely.
                  </p>
                )}
                {!sendgridEditing ? (
                  <button
                    type="button"
                    onClick={() => setSendgridEditing(true)}
                    className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-[0.7rem] font-medium text-neutral-100 hover:border-neutral-500 hover:bg-neutral-800"
                  >
                    {dashboardKeys.sendgrid
                      ? "Update SendGrid key"
                      : "Add SendGrid key"}
                  </button>
                ) : (
                  <form
                    className="space-y-2"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!sendgridKey.trim()) return;
                      try {
                        setSaving(true);
                        const res = await fetch("/api/admin/settings/keys", {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                          },
                          body: JSON.stringify({
                            service: "sendgrid",
                            apiKey: sendgridKey.trim(),
                          }),
                        });
                        if (!res.ok) {
                          throw new Error("Failed to save key");
                        }
                        setDashboardKeys((prev) => ({
                          ...prev,
                          sendgrid: true,
                        }));
                        setSendgridKey("");
                        setSendgridEditing(false);
                      } catch (err) {
                        console.error(err);
                        alert(
                          "There was a problem saving the SendGrid key. Check server logs.",
                        );
                      } finally {
                        setSaving(false);
                      }
                    }}
                  >
                    <input
                      type="password"
                      className="w-full rounded-md border border-neutral-700 bg-black px-3 py-1.5 text-[0.75rem] text-neutral-100 placeholder:text-neutral-500 focus:border-neutral-400 focus:outline-none"
                      placeholder="Paste SendGrid API key"
                      value={sendgridKey}
                      onChange={(e) => setSendgridKey(e.target.value)}
                    />
                    <div className="flex items-center gap-2 text-[0.7rem]">
                      <button
                        type="submit"
                        disabled={saving || !sendgridKey.trim()}
                        className="rounded-md bg-white px-3 py-1.5 font-medium text-black disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {saving ? "Saving…" : "Save key"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSendgridEditing(false);
                          setSendgridKey("");
                        }}
                        className="rounded-md px-3 py-1.5 text-neutral-400 hover:text-neutral-100"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>

            <div className="space-y-2 rounded-md border border-neutral-800 bg-zinc-950/60 p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[0.75rem] font-semibold uppercase tracking-[0.16em] text-neutral-300">
                    S3 Storage
                  </p>
                  <p className="mt-1 text-[0.7rem] text-neutral-400">
                    Product and content media.
                  </p>
                </div>
                {renderBadge(data.s3.configured)}
              </div>
              <p className="mt-2 text-[0.7rem] text-neutral-500">
                Uses either environment variables (
                <code className="font-mono">
                  AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / AWS_S3_BUCKET
                </code>
                ) or credentials saved from this dashboard (planned). For
                production, env vars are still recommended.
              </p>
              <div className="mt-3 space-y-2">
                {dashboardKeys.s3 && (
                  <p className="text-[0.7rem] text-emerald-400">
                    Credentials stored via dashboard. Coordinate with your
                    developer to ensure S3 client is wired to use them safely.
                  </p>
                )}
                {!s3Editing ? (
                  <button
                    type="button"
                    onClick={() => setS3Editing(true)}
                    className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-[0.7rem] font-medium text-neutral-100 hover:border-neutral-500 hover:bg-neutral-800"
                  >
                    {dashboardKeys.s3 ? "Update S3 credentials" : "Add S3 credentials"}
                  </button>
                ) : (
                  <form
                    className="space-y-2"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (
                        !s3AccessKeyId.trim() ||
                        !s3SecretAccessKey.trim() ||
                        !s3Bucket.trim()
                      ) {
                        return;
                      }
                      try {
                        setSaving(true);
                        const payload = {
                          accessKeyId: s3AccessKeyId.trim(),
                          secretAccessKey: s3SecretAccessKey.trim(),
                          bucket: s3Bucket.trim(),
                        };
                        const res = await fetch("/api/admin/settings/keys", {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                          },
                          body: JSON.stringify({
                            service: "s3",
                            apiKey: JSON.stringify(payload),
                          }),
                        });
                        if (!res.ok) {
                          throw new Error("Failed to save S3 credentials");
                        }
                        setDashboardKeys((prev) => ({
                          ...prev,
                          s3: true,
                        }));
                        setS3AccessKeyId("");
                        setS3SecretAccessKey("");
                        setS3Bucket("");
                        setS3Editing(false);
                      } catch (err) {
                        console.error(err);
                        alert(
                          "There was a problem saving the S3 credentials. Check server logs.",
                        );
                      } finally {
                        setSaving(false);
                      }
                    }}
                  >
                    <input
                      type="password"
                      className="w-full rounded-md border border-neutral-700 bg-black px-3 py-1.5 text-[0.75rem] text-neutral-100 placeholder:text-neutral-500 focus:border-neutral-400 focus:outline-none"
                      placeholder="AWS_ACCESS_KEY_ID"
                      value={s3AccessKeyId}
                      onChange={(e) => setS3AccessKeyId(e.target.value)}
                    />
                    <input
                      type="password"
                      className="w-full rounded-md border border-neutral-700 bg-black px-3 py-1.5 text-[0.75rem] text-neutral-100 placeholder:text-neutral-500 focus:border-neutral-400 focus:outline-none"
                      placeholder="AWS_SECRET_ACCESS_KEY"
                      value={s3SecretAccessKey}
                      onChange={(e) => setS3SecretAccessKey(e.target.value)}
                    />
                    <input
                      type="text"
                      className="w-full rounded-md border border-neutral-700 bg-black px-3 py-1.5 text-[0.75rem] text-neutral-100 placeholder:text-neutral-500 focus:border-neutral-400 focus:outline-none"
                      placeholder="AWS_S3_BUCKET"
                      value={s3Bucket}
                      onChange={(e) => setS3Bucket(e.target.value)}
                    />
                    <div className="flex items-center gap-2 text-[0.7rem]">
                      <button
                        type="submit"
                        disabled={
                          saving ||
                          !s3AccessKeyId.trim() ||
                          !s3SecretAccessKey.trim() ||
                          !s3Bucket.trim()
                        }
                        className="rounded-md bg-white px-3 py-1.5 font-medium text-black disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {saving ? "Saving…" : "Save credentials"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setS3Editing(false);
                          setS3AccessKeyId("");
                          setS3SecretAccessKey("");
                          setS3Bucket("");
                        }}
                        className="rounded-md px-3 py-1.5 text-neutral-400 hover:text-neutral-100"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>

            <div className="space-y-2 rounded-md border border-neutral-800 bg-zinc-950/60 p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[0.75rem] font-semibold uppercase tracking-[0.16em] text-neutral-300">
                    TaxJar
                  </p>
                  <p className="mt-1 text-[0.7rem] text-neutral-400">
                    Sales tax calculations.
                  </p>
                </div>
                {renderBadge(data.taxjar.configured)}
              </div>
              <p className="mt-2 text-[0.7rem] text-neutral-500">
                Uses either an environment variable (
                <code className="font-mono">TAXJAR_API_KEY</code>) or a key
                saved from this dashboard (planned). For production, env vars
                are still recommended.
              </p>
              <div className="mt-3 space-y-2">
                {dashboardKeys.taxjar && (
                  <p className="text-[0.7rem] text-emerald-400">
                    Key stored via dashboard. Coordinate with your developer to
                    ensure tax calculation is wired to use it safely.
                  </p>
                )}
                {!taxjarEditing ? (
                  <button
                    type="button"
                    onClick={() => setTaxjarEditing(true)}
                    className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-[0.7rem] font-medium text-neutral-100 hover:border-neutral-500 hover:bg-neutral-800"
                  >
                    {dashboardKeys.taxjar ? "Update TaxJar key" : "Add TaxJar key"}
                  </button>
                ) : (
                  <form
                    className="space-y-2"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!taxjarKey.trim()) return;
                      try {
                        setSaving(true);
                        const res = await fetch("/api/admin/settings/keys", {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                          },
                          body: JSON.stringify({
                            service: "taxjar",
                            apiKey: taxjarKey.trim(),
                          }),
                        });
                        if (!res.ok) {
                          throw new Error("Failed to save key");
                        }
                        setDashboardKeys((prev) => ({
                          ...prev,
                          taxjar: true,
                        }));
                        setTaxjarKey("");
                        setTaxjarEditing(false);
                      } catch (err) {
                        console.error(err);
                        alert(
                          "There was a problem saving the TaxJar key. Check server logs.",
                        );
                      } finally {
                        setSaving(false);
                      }
                    }}
                  >
                    <input
                      type="password"
                      className="w-full rounded-md border border-neutral-700 bg-black px-3 py-1.5 text-[0.75rem] text-neutral-100 placeholder:text-neutral-500 focus:border-neutral-400 focus:outline-none"
                      placeholder="Paste TaxJar API key"
                      value={taxjarKey}
                      onChange={(e) => setTaxjarKey(e.target.value)}
                    />
                    <div className="flex items-center gap-2 text-[0.7rem]">
                      <button
                        type="submit"
                        disabled={saving || !taxjarKey.trim()}
                        className="rounded-md bg-white px-3 py-1.5 font-medium text-black disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {saving ? "Saving…" : "Save key"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setTaxjarEditing(false);
                          setTaxjarKey("");
                        }}
                        className="rounded-md px-3 py-1.5 text-neutral-400 hover:text-neutral-100"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>

            <div className="space-y-2 rounded-md border border-neutral-800 bg-zinc-950/60 p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[0.75rem] font-semibold uppercase tracking-[0.16em] text-neutral-300">
                    SmartyStreets
                  </p>
                  <p className="mt-1 text-[0.7rem] text-neutral-400">
                    Address validation.
                  </p>
                </div>
                {renderBadge(data.smarty.configured)}
              </div>
              <p className="mt-2 text-[0.7rem] text-neutral-500">
                Uses either environment variables (
                <code className="font-mono">
                  SMARTYSTREETS_AUTH_ID / SMARTYSTREETS_AUTH_TOKEN
                </code>
                ) or credentials saved from this dashboard (planned). For
                production, env vars are still recommended.
              </p>
              <div className="mt-3 space-y-2">
                {dashboardKeys.smarty && (
                  <p className="text-[0.7rem] text-emerald-400">
                    Credentials stored via dashboard. Coordinate with your
                    developer to ensure address validation is wired to use them
                    safely.
                  </p>
                )}
                {!smartyEditing ? (
                  <button
                    type="button"
                    onClick={() => setSmartyEditing(true)}
                    className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-[0.7rem] font-medium text-neutral-100 hover:border-neutral-500 hover:bg-neutral-800"
                  >
                    {dashboardKeys.smarty
                      ? "Update SmartyStreets credentials"
                      : "Add SmartyStreets credentials"}
                  </button>
                ) : (
                  <form
                    className="space-y-2"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!smartyAuthId.trim() || !smartyAuthToken.trim()) {
                        return;
                      }
                      try {
                        setSaving(true);
                        const payload = {
                          authId: smartyAuthId.trim(),
                          authToken: smartyAuthToken.trim(),
                        };
                        const res = await fetch("/api/admin/settings/keys", {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                          },
                          body: JSON.stringify({
                            service: "smarty",
                            apiKey: JSON.stringify(payload),
                          }),
                        });
                        if (!res.ok) {
                          throw new Error("Failed to save SmartyStreets credentials");
                        }
                        setDashboardKeys((prev) => ({
                          ...prev,
                          smarty: true,
                        }));
                        setSmartyAuthId("");
                        setSmartyAuthToken("");
                        setSmartyEditing(false);
                      } catch (err) {
                        console.error(err);
                        alert(
                          "There was a problem saving the SmartyStreets credentials. Check server logs.",
                        );
                      } finally {
                        setSaving(false);
                      }
                    }}
                  >
                    <input
                      type="password"
                      className="w-full rounded-md border border-neutral-700 bg-black px-3 py-1.5 text-[0.75rem] text-neutral-100 placeholder:text-neutral-500 focus:border-neutral-400 focus:outline-none"
                      placeholder="SMARTYSTREETS_AUTH_ID"
                      value={smartyAuthId}
                      onChange={(e) => setSmartyAuthId(e.target.value)}
                    />
                    <input
                      type="password"
                      className="w-full rounded-md border border-neutral-700 bg-black px-3 py-1.5 text-[0.75rem] text-neutral-100 placeholder:text-neutral-500 focus:border-neutral-400 focus:outline-none"
                      placeholder="SMARTYSTREETS_AUTH_TOKEN"
                      value={smartyAuthToken}
                      onChange={(e) => setSmartyAuthToken(e.target.value)}
                    />
                    <div className="flex items-center gap-2 text-[0.7rem]">
                      <button
                        type="submit"
                        disabled={
                          saving ||
                          !smartyAuthId.trim() ||
                          !smartyAuthToken.trim()
                        }
                        className="rounded-md bg-white px-3 py-1.5 font-medium text-black disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {saving ? "Saving…" : "Save credentials"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSmartyEditing(false);
                          setSmartyAuthId("");
                          setSmartyAuthToken("");
                        }}
                        className="rounded-md px-3 py-1.5 text-neutral-400 hover:text-neutral-100"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

