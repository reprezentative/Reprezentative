import { prisma } from "@/lib/prisma";

// Email is "build now, activate later": sends via Resend or SendGrid when a key
// is present, otherwise records a SKIPPED log entry (no crash). Every attempt is
// logged to EmailLog so the admin has visibility even while dormant.
type SendOpts = {
  to: string;
  subject: string;
  html: string;
  template?: string;
};

function fromAddress() {
  return process.env.EMAIL_FROM || "Reprezentative <onboarding@resend.dev>";
}

async function log(
  opts: SendOpts,
  status: "SENT" | "SKIPPED" | "FAILED",
  error?: string,
) {
  try {
    await prisma.emailLog.create({
      data: {
        to: opts.to,
        subject: opts.subject,
        template: opts.template ?? null,
        status,
        error: error ?? null,
      },
    });
  } catch {
    /* logging must never break the caller */
  }
}

export async function sendEmail(
  opts: SendOpts,
): Promise<{ sent: boolean; skipped?: boolean; error?: string }> {
  const resendKey = process.env.RESEND_API_KEY;
  const sendgridKey = process.env.SENDGRID_API_KEY;

  // Dormant: no provider configured.
  if (!resendKey && !sendgridKey) {
    await log(opts, "SKIPPED");
    return { sent: false, skipped: true };
  }

  try {
    if (resendKey) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromAddress(),
          to: [opts.to],
          subject: opts.subject,
          html: opts.html,
        }),
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        await log(opts, "FAILED", t.slice(0, 200));
        return { sent: false, error: t };
      }
    } else if (sendgridKey) {
      const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sendgridKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: opts.to }] }],
          from: { email: (fromAddress().match(/<(.+)>/)?.[1] ?? fromAddress()) },
          subject: opts.subject,
          content: [{ type: "text/html", value: opts.html }],
        }),
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        await log(opts, "FAILED", t.slice(0, 200));
        return { sent: false, error: t };
      }
    }
    await log(opts, "SENT");
    return { sent: true };
  } catch (e: any) {
    await log(opts, "FAILED", e?.message);
    return { sent: false, error: e?.message };
  }
}
