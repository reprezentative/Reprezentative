import { stripe } from "@/lib/stripe";

// Payments are "build now, activate later": everything works when a
// STRIPE_SECRET_KEY is present, and no-ops gracefully when it isn't.
export function isStripeConfigured(): boolean {
  return !!stripe;
}

// Creates a PaymentIntent for an order total (in dollars). Returns the intent
// id + client secret, or null when Stripe isn't configured.
export async function createPaymentIntent(
  amountDollars: number,
  metadata: Record<string, string> = {},
): Promise<{ id: string; clientSecret: string | null } | null> {
  if (!stripe || amountDollars <= 0) return null;
  try {
    const intent = await stripe.paymentIntents.create({
      amount: Math.round(amountDollars * 100),
      currency: "usd",
      metadata,
      automatic_payment_methods: { enabled: true },
    });
    return { id: intent.id, clientSecret: intent.client_secret };
  } catch {
    return null;
  }
}

// Refunds a payment (full or partial). No-ops when Stripe/paymentIntent absent.
export async function refundPayment(
  paymentIntentId: string | null | undefined,
  amountDollars?: number,
): Promise<{ ok: boolean; refunded: boolean; id?: string; error?: string }> {
  if (!stripe) return { ok: true, refunded: false };
  if (!paymentIntentId) return { ok: true, refunded: false };
  try {
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      ...(amountDollars ? { amount: Math.round(amountDollars * 100) } : {}),
    });
    return { ok: true, refunded: true, id: refund.id };
  } catch (e: any) {
    return { ok: false, refunded: false, error: e?.message ?? "Refund failed" };
  }
}
