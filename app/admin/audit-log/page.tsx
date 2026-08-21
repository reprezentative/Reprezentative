import { prisma } from "@/lib/prisma";
import { AdminPageHelp } from "@/components/AdminPageHelp";
import { Pagination } from "@/components/Pagination";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const page = Math.max(parseInt(searchParams.page ?? "1", 10) || 1, 1);

  const [total, logs] = await Promise.all([
    prisma.auditLog.count(),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);
  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="border-b border-neutral-800 bg-zinc-900/70 px-6 py-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Audit Log</h1>
            <p className="mt-1 text-xs text-neutral-400">
              A record of important admin actions — order changes, refunds,
              returns, and moderation.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-[0.7rem] text-neutral-400">{total} events</p>
            <AdminPageHelp page="audit-log" />
          </div>
        </div>
      </div>

      <section className="px-6 py-6">
        <div className="overflow-hidden rounded-md border border-neutral-800 bg-zinc-950/60">
          <table className="min-w-full border-collapse text-xs">
            <thead className="bg-zinc-900/80 text-[0.7rem] uppercase tracking-[0.16em] text-neutral-400">
              <tr>
                <th className="px-3 py-2 text-left font-medium">When</th>
                <th className="px-3 py-2 text-left font-medium">Action</th>
                <th className="px-3 py-2 text-left font-medium">Entity</th>
                <th className="px-3 py-2 text-left font-medium">By</th>
                <th className="px-3 py-2 text-left font-medium">Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} className="border-t border-neutral-900">
                  <td className="whitespace-nowrap px-3 py-2 align-top text-[0.7rem] text-neutral-400">
                    {l.createdAt.toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-3 py-2 align-top font-medium text-neutral-100">
                    {l.action}
                  </td>
                  <td className="px-3 py-2 align-top text-[0.7rem] text-neutral-400">
                    {l.entity ?? "—"}
                    {l.entityId ? (
                      <span className="block text-neutral-600">{l.entityId}</span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 align-top text-[0.7rem] text-neutral-400">
                    {l.userEmail ?? "system"}
                  </td>
                  <td className="px-3 py-2 align-top text-[0.7rem] text-neutral-400">
                    {l.meta ? (
                      <code className="break-all text-neutral-500">
                        {JSON.stringify(l.meta)}
                      </code>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-xs text-neutral-500"
                  >
                    No audit events recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex justify-end">
          <Pagination
            page={page}
            totalPages={totalPages}
            hrefForPage={(p) => `?page=${p}`}
          />
        </div>
      </section>
    </main>
  );
}
