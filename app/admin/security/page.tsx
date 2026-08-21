import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { AdminPageHelp } from "@/components/AdminPageHelp";
import { TwoFactorSetup } from "./TwoFactorSetup";

export const dynamic = "force-dynamic";

export default async function AdminSecurityPage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;
  const user = userId
    ? await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, twoFactorEnabled: true },
      })
    : null;

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="border-b border-neutral-800 bg-zinc-900/70 px-6 py-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Security</h1>
            <p className="mt-1 text-xs text-neutral-400">
              Protect your admin account with two-factor authentication.
            </p>
          </div>
          <AdminPageHelp page="security" />
        </div>
      </div>

      <section className="max-w-xl px-6 py-6">
        <div className="rounded-md border border-neutral-800 bg-zinc-950/60 p-5">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-300">
            Two-factor authentication
            {user?.email ? (
              <span className="ml-2 font-normal text-neutral-500">
                ({user.email})
              </span>
            ) : null}
          </h2>
          <TwoFactorSetup enabled={!!user?.twoFactorEnabled} />
        </div>
      </section>
    </main>
  );
}
