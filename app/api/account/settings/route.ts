import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ settings: null }, { status: 200 });
    }

    const userId = (session.user as any).id as string | undefined;
    if (!userId) {
      return NextResponse.json(
        { error: "User session is missing an id" },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        language: true,
        currency: true,
        timezone: true,
      },
    });

    return NextResponse.json({ settings: user }, { status: 200 });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.error("Settings GET error:", error);
    }
    return NextResponse.json(
      { error: "Failed to load settings" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id as string | undefined;
    if (!userId) {
      return NextResponse.json(
        { error: "User session is missing an id" },
        { status: 400 },
      );
    }

    const body = await req.json();
    const { language, currency, timezone } = body as {
      language?: string;
      currency?: string;
      timezone?: string;
    };

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        language,
        currency,
        timezone,
      },
      select: {
        language: true,
        currency: true,
        timezone: true,
      },
    });

    return NextResponse.json({ settings: updated }, { status: 200 });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.error("Settings POST error:", error);
    }
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 },
    );
  }
}



