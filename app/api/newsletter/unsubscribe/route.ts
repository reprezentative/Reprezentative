import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public endpoint: lets a subscriber opt out of the newsletter.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const emailRaw = (body?.email ?? "") as string;
    const email = emailRaw.trim().toLowerCase();

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "A valid email is required" },
        { status: 400 },
      );
    }

    const existing = await prisma.newsletter.findUnique({ where: { email } });

    // Respond the same whether or not the email exists (no enumeration).
    if (existing) {
      await prisma.newsletter.update({
        where: { email },
        data: { subscribed: false, unsubscribedAt: new Date() },
      });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Newsletter unsubscribe error:", error);
    }
    return NextResponse.json(
      { error: "Failed to unsubscribe" },
      { status: 500 },
    );
  }
}
