import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

type IntegrationStatus = {
  configured: boolean;
  viaDashboard?: boolean;
};

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const env = process.env;

  const secrets = await prisma.integrationSecret.findMany({
    select: { service: true },
  });
  const hasDbKey = new Set(secrets.map((s) => s.service));

  const stripe: IntegrationStatus = {
    configured: !!env.STRIPE_SECRET_KEY || hasDbKey.has("stripe"),
    viaDashboard: hasDbKey.has("stripe") || undefined,
  };

  const deepseek: IntegrationStatus = {
    configured: !!env.DEEPSEEK_API_KEY || hasDbKey.has("deepseek"),
    viaDashboard: hasDbKey.has("deepseek") || undefined,
  };

  const sendgrid: IntegrationStatus = {
    configured: !!env.SENDGRID_API_KEY || hasDbKey.has("sendgrid"),
    viaDashboard: hasDbKey.has("sendgrid") || undefined,
  };

  const s3: IntegrationStatus = {
    configured:
      (!!env.AWS_ACCESS_KEY_ID &&
        !!env.AWS_SECRET_ACCESS_KEY &&
        !!env.AWS_S3_BUCKET) ||
      hasDbKey.has("s3"),
    viaDashboard: hasDbKey.has("s3") || undefined,
  };

  const taxjar: IntegrationStatus = {
    configured: !!env.TAXJAR_API_KEY || hasDbKey.has("taxjar"),
    viaDashboard: hasDbKey.has("taxjar") || undefined,
  };

  const smarty: IntegrationStatus = {
    configured:
      (!!env.SMARTY_AUTH_ID && !!env.SMARTY_AUTH_TOKEN) ||
      hasDbKey.has("smarty"),
    viaDashboard: hasDbKey.has("smarty") || undefined,
  };

  return NextResponse.json(
    {
      stripe,
      deepseek,
      sendgrid,
      s3,
      taxjar,
      smarty,
    },
    { status: 200 },
  );
}

