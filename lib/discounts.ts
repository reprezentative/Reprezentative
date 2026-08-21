import { prisma } from "@/lib/prisma";

export type CouponEval = {
  ok: boolean;
  error?: string;
  code?: string;
  discount: number; // dollar amount off the subtotal
  freeShipping: boolean;
};

// Validates a coupon against a subtotal and returns the discount to apply.
export async function evaluateCoupon(
  rawCode: string | undefined | null,
  subtotal: number,
): Promise<CouponEval> {
  const code = (rawCode ?? "").trim().toUpperCase();
  if (!code) return { ok: false, discount: 0, freeShipping: false };

  const coupon = await prisma.coupon.findUnique({ where: { code } });
  if (!coupon || !coupon.active) {
    return { ok: false, error: "Invalid or inactive code.", discount: 0, freeShipping: false };
  }

  const now = new Date();
  if (coupon.startsAt && coupon.startsAt > now) {
    return { ok: false, error: "This code isn't active yet.", discount: 0, freeShipping: false };
  }
  if (coupon.endsAt && coupon.endsAt < now) {
    return { ok: false, error: "This code has expired.", discount: 0, freeShipping: false };
  }
  if (coupon.maxRedemptions != null && coupon.timesUsed >= coupon.maxRedemptions) {
    return { ok: false, error: "This code has reached its usage limit.", discount: 0, freeShipping: false };
  }
  if (coupon.minSubtotal != null && subtotal < coupon.minSubtotal) {
    return {
      ok: false,
      error: `Requires a subtotal of at least $${coupon.minSubtotal.toFixed(2)}.`,
      discount: 0,
      freeShipping: false,
    };
  }

  let discount = 0;
  let freeShipping = false;
  if (coupon.type === "PERCENT") {
    discount = (subtotal * coupon.value) / 100;
  } else if (coupon.type === "FIXED") {
    discount = Math.min(coupon.value, subtotal);
  } else if (coupon.type === "FREE_SHIPPING") {
    freeShipping = true;
  }
  discount = Math.max(0, Math.round(discount * 100) / 100);

  return { ok: true, code, discount, freeShipping };
}

export type GiftCardEval = {
  ok: boolean;
  error?: string;
  code?: string;
  balance: number;
};

export async function evaluateGiftCard(
  rawCode: string | undefined | null,
): Promise<GiftCardEval> {
  const code = (rawCode ?? "").trim().toUpperCase();
  if (!code) return { ok: false, balance: 0 };

  const gc = await prisma.giftCard.findUnique({ where: { code } });
  if (!gc || !gc.active) {
    return { ok: false, error: "Invalid gift card.", balance: 0 };
  }
  if (gc.balance <= 0) {
    return { ok: false, error: "This gift card has no balance.", balance: 0 };
  }
  return { ok: true, code, balance: gc.balance };
}
