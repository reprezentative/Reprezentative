import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { validateAddress } from "@/lib/smarty";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { street, city, state, zipCode } = body as {
      street?: string;
      city?: string;
      state?: string;
      zipCode?: string;
    };

    if (!street || !zipCode) {
      return NextResponse.json(
        { error: "street and zipCode are required" },
        { status: 400 },
      );
    }

    const validated = await validateAddress({
      street,
      city,
      state,
      zipcode: zipCode,
    });

    if (!validated) {
      return NextResponse.json(
        { valid: false, message: "Address could not be validated" },
        { status: 200 },
      );
    }

    return NextResponse.json(
      {
        valid: true,
        address: validated,
      },
      { status: 200 },
    );
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.error("Checkout validate-address error:", error);
    }
    return NextResponse.json(
      { error: "Failed to validate address" },
      { status: 500 },
    );
  }
}



