import Link from "next/link";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { SettingsForm } from "@/components/SettingsForm";

export default async function AccountSettingsPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return (
      <main className="min-h-screen bg-black text-white">
        <section className="mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center px-4 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Settings
          </h1>
          <p className="mt-3 text-sm text-neutral-400">
            Please sign in to manage your account settings.
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
        <section className="mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center px-4 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Settings
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
      language: true,
      currency: true,
      timezone: true,
    },
  });

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="border-b border-neutral-900 bg-black/90 px-4 py-4 md:px-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight">
            Settings
          </h1>
          <Link
            href="/account/orders"
            className="text-xs uppercase tracking-[0.18em] text-neutral-400 hover:text-white"
          >
            Back to orders
          </Link>
        </div>
      </div>

      <section className="mx-auto max-w-5xl px-4 py-8 md:px-8 md:py-12 space-y-4 text-xs">
        <div className="rounded-md border border-neutral-900 bg-neutral-950 p-4">
          <p className="text-[0.7rem] uppercase tracking-[0.18em] text-neutral-500">
            Preferences
          </p>
          <p className="mt-1 text-sm text-neutral-200">
            Control language, currency, and timezone used across your account.
          </p>
        </div>
        <SettingsForm
          initialLanguage={user?.language ?? null}
          initialCurrency={user?.currency ?? null}
          initialTimezone={user?.timezone ?? null}
        />
      </section>
    </main>
  );
}



