import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encryptSecret } from "@/lib/crypto";
import { clearDeepSeekKeyCache } from "@/lib/deepseek";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const secrets = await prisma.integrationSecret.findMany({
    select: { service: true },
  });

  const map: Record<string, boolean> = {};
  for (const s of secrets) {
    map[s.service] = true;
  }

  return NextResponse.json(map, { status: 200 });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { service, apiKey } = body as {
      service?: string;
      apiKey?: string;
    };

    if (!service || !apiKey || !apiKey.trim()) {
      return NextResponse.json(
        { error: "service and apiKey are required" },
        { status: 400 },
      );
    }

    const encrypted = encryptSecret(apiKey.trim());

    await prisma.integrationSecret.upsert({
      where: { service },
      create: { service, secret: encrypted },
      update: { secret: encrypted },
    });

    // Ensure a newly saved DeepSeek key takes effect immediately.
    if (service === "deepseek") {
      clearDeepSeekKeyCache();
    }

    return NextResponse.json({ service }, { status: 200 });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Update integration key error:", error);
    }
    return NextResponse.json(
      { error: "Failed to update integration key" },
      { status: 500 },
    );
  }
}



