import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { calculateTax } from "@/lib/taxjar";

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
    const { addressId, shipping = 0 } = body as {
      addressId?: string;
      shipping?: number;
    };

    if (!addressId) {
      return NextResponse.json(
        { error: "addressId is required" },
        { status: 400 },
      );
    }

    const address = await prisma.address.findFirst({
      where: { id: addressId, userId },
    });

    if (!address) {
      return NextResponse.json(
        { error: "Address not found" },
        { status: 404 },
      );
    }

    const cartItems = await prisma.cartItem.findMany({
      where: { userId },
      include: { product: true },
    });

    if (cartItems.length === 0) {
      return NextResponse.json(
        { error: "Cart is empty" },
        { status: 400 },
      );
    }

    const lineItems = cartItems.map((item) => ({
      id: item.id,
      quantity: item.quantity,
      unit_price: item.product.price,
    }));

    const result = await calculateTax(
      {
        to_country: address.country,
        to_zip: address.zipCode,
        to_state: address.state,
        to_city: address.city,
        to_street: address.street,
      },
      lineItems,
      shipping,
    );

    if (!result) {
      return NextResponse.json(
        {
          tax: 0,
          rate: 0,
          message: "Tax could not be calculated (likely missing API key).",
        },
        { status: 200 },
      );
    }

    return NextResponse.json(
      {
        tax: result.amountToCollect,
        rate: result.rate,
      },
      { status: 200 },
    );
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.error("Checkout calculate-tax error:", error);
    }
    return NextResponse.json(
      { error: "Failed to calculate tax" },
      { status: 500 },
    );
  }
}



