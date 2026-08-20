import Link from "next/link";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { stripe } from "@/lib/stripe";

export default async function AccountPaymentMethodsPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return (
      <main className="min-h-screen bg-black text-white">
        <section className="mx-auto flex min-h-[60vh] max-width-3xl flex-col items-center justify-center px-4 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Payment methods
          </h1>
          <p className="mt-3 text-sm text-neutral-400">
            Please sign in to manage your payment methods.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-flex items-center justify-center rounded-md bg-white px-5 py-2 text-[0.8rem] font-semibold uppercase tracking-[0.18em] text-black hover:bg-neutral-200"
          >
            Sign in
          </Link>
        </section>
      </main>
    );
  }

  const userId = (session.user as any).id as string | undefined;

  if (!userId) {
    return (
      <main className="min-h-screen bg-black text-white">
        <section className="mx-auto flex min-h-[60vh] max-width-3xl flex-col items-center justify-center px-4 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Payment methods
          </h1>
          <p className="mt-3 text-sm text-neutral-400">
            We could not determine your account. Please sign out and sign back
            in.
          </p>
        </section>
      </main>
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      stripeCustomerId: true,
    },
  });

  let paymentMethods:
    | {
        id: string;
        brand: string;
        last4: string;
        expMonth: number;
        expYear: number;
        isDefault: boolean;
      }[] = [];

  if (stripe && user?.stripeCustomerId) {
    try {
      const [customer, methods] = await Promise.all([
        stripe.customers.retrieve(user.stripeCustomerId),
        stripe.paymentMethods.list({
          customer: user.stripeCustomerId,
          type: "card",
        }),
      ]);

      const defaultId =
        (customer as any).invoice_settings?.default_payment_method ??
        (customer as any).default_source;

      paymentMethods =
        methods.data.map((pm: any) => ({
          id: pm.id,
          brand: (pm.card?.brand ?? "").toUpperCase(),
          last4: pm.card?.last4 ?? "",
          expMonth: pm.card?.exp_month ?? 0,
          expYear: pm.card?.exp_year ?? 0,
          isDefault: pm.id === defaultId,
        })) ?? [];
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        // eslint-disable-next-line no-console
        console.error("Failed to load Stripe payment methods:", error);
      }
    }
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="border-b border-neutral-900 bg-black/90 px-4 py-4 md:px-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Payment methods
            </h1>
            <p className="mt-1 text-xs text-neutral-400">
              View your saved cards and manage them via Stripe&apos;s Customer
              Portal.
            </p>
          </div>
          <Link
            href="/account/orders"
            className="text-xs uppercase tracking-[0.18em] text-neutral-400 hover:text-white"
          >
            Back to orders
          </Link>
        </div>
      </div>

      <section className="mx-auto max-w-5xl px 4 py-8 md:px-8 md:py-12">
        <div className="mb-4 rounded-md border border-neutral-900 bg-neutral-950 p-4 text-xs">
          <p className="text-[0.7rem] uppercase tracking-[0.18em] text-neutral-500">
            Billing
          </p>
          <p className="mt-1 text-neutral-300">
            {user?.email
              ? `Billing email: ${user.email}`
              : "No billing email on file."}
          </p>
          <p className="mt-2 text-[0.7rem] text-neutral-400">
            To add, update, or remove cards, you can integrate Stripe&apos;s
            Customer Portal and link it here.
          </p>
        </div>

        <div className="rounded-md border border-neutral-900 bg-neutral-950 p-4 text-xs">
          <h2 className="mb-3 text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-neutral-300">
            Saved cards
          </h2>
          {(!stripe || !user?.stripeCustomerId) && (
            <p className="text-[0.7rem] text-neutral-400">
              Payment methods are not yet configured. Once a Stripe customer is
              created for your account and cards are added, they will appear
              here.
            </p>
          )}
          {stripe && user?.stripeCustomerId && paymentMethods.length === 0 && (
            <p className="text-[0.7rem] text-neutral-400">
              You do not have any saved payment methods.
            </p>
          )}
          {paymentMethods.length > 0 && (
            <div className="space-y-2">
              {paymentMethods.map((pm) => (
                <div
                  key={pm.id}
                  className="flex items-center justify-between rounded-md border border-neutral-800 bg-black/40 p-3"
                >
                  <div>
                    <p className="text-sm text-white">
                      {pm.brand} •••• {pm.last4}
                    </p>
                    <p className="text-[0.7rem] text-neutral-400">
                      Expires {pm.expMonth.toString().padStart(2, "0")} /{" "}
                      {pm.expYear}
                    </p>
                  </div>
                  {pm.isDefault && (
                    <span className="rounded-full bg-emerald-500/15 px 2 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-emerald-300">
                      Default
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}



