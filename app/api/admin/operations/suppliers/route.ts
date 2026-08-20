import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const {
      name,
      contactPerson,
      email,
      phone,
      country,
      supplierType,
      paymentTerms,
      moq,
      leadTimeDays,
      qualityRating,
      onTimeRate,
      defectRate,
      communicationRating,
      notes,
    } = body;

    if (!name || !email || !country) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const supplier = await prisma.supplier.create({
      data: {
        name,
        contactPerson,
        email,
        phone,
        country,
        supplierType,
        paymentTerms,
        moq,
        leadTimeDays,
        qualityRating,
        onTimeRate,
        defectRate,
        communicationRating,
        notes,
      },
    });

    return NextResponse.json(supplier);
  } catch (error) {
    console.error("Create supplier error:", error);
    return NextResponse.json(
      { error: "Failed to create supplier" },
      { status: 500 },
    );
  }
}



