import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const {
      category,
      subcategory,
      description,
      amount,
      date,
      vendor,
      isRecurring,
      frequency,
      receiptUrl,
      notes,
    } = body as {
      category?: string;
      subcategory?: string;
      description?: string;
      amount?: number;
      date?: string;
      vendor?: string;
      isRecurring?: boolean;
      frequency?: string;
      receiptUrl?: string;
      notes?: string;
    };

    const amountNum = typeof amount === "number" ? amount : Number(amount);

    if (!category || !description || !Number.isFinite(amountNum) || amountNum < 0) {
      return NextResponse.json(
        { error: "category, description, and a valid amount are required" },
        { status: 400 },
      );
    }

    const expense = await prisma.expense.create({
      data: {
        category,
        subcategory: subcategory || null,
        description,
        amount: amountNum,
        date: date ? new Date(date) : new Date(),
        vendor: vendor || null,
        isRecurring: !!isRecurring,
        frequency: isRecurring ? frequency || null : null,
        receiptUrl: receiptUrl || null,
        notes: notes || null,
        // Attribute to the authenticated admin (satisfies required createdBy).
        createdBy: auth.userId ?? auth.email ?? "admin",
      },
      select: { id: true },
    });

    return NextResponse.json({ id: expense.id }, { status: 201 });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Create expense error:", error);
    }
    return NextResponse.json(
      { error: "Failed to add expense" },
      { status: 500 },
    );
  }
}
