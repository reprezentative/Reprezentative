import { prisma } from "@/lib/prisma";
import { formatCurrency, formatNumber } from "@/lib/format";

export default async function ApiCallsPage() {
  const [rows, totalsByService] = await Promise.all([
    prisma.apiCall.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.apiCall.groupBy({
      by: ["service", "currency"],
      _sum: { estimatedCost: true, units: true },
    }),
  ]);

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="border-b border-neutral-800 bg-zinc-900/70 px-6 py-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              API Calls &amp; Usage
            </h1>
            <p className="mt-1 text-xs text-neutral-400">
              Internal log of external API calls made by Reprezentative, with
              rough usage and cost estimates per provider.
            </p>
          </div>
        </div>
      </div>

      <section className="space-y-6 px-6 py-6 text-xs">
        {/* Totals by service */}
        <div className="grid gap-4 md:grid-cols-3">
          {totalsByService.map((row) => (
            <div
              key={`${row.service}-${row.currency ?? "USD"}`}
              className="rounded-md border border-neutral-800 bg-zinc-950/60 p-4"
            >
              <p className="text-[0.7rem] uppercase tracking-[0.16em] text-neutral-400">
                {row.service}
              </p>
              <p className="mt-2 text-lg font-semibold text-white">
                {formatCurrency(row._sum.estimatedCost ?? 0)}
              </p>
              <p className="mt-1 text-[0.7rem] text-neutral-500">
                Estimated cost ({row.currency ?? "USD"}) across logged calls.
              </p>
              {row._sum.units && (
                <p className="mt-1 text-[0.7rem] text-neutral-500">
                  Units: {formatNumber(Number(row._sum.units.toFixed(2)))}
                </p>
              )}
            </div>
          ))}
          {totalsByService.length === 0 && (
            <p className="text-[0.7rem] text-neutral-500">
              No API calls have been logged yet. Once the system begins logging
              external calls, you&apos;ll see provider-level summaries here.
            </p>
          )}
        </div>

        {/* Recent calls table */}
        <div className="overflow-x-auto rounded-md border border-neutral-800 bg-zinc-950/60">
          <table className="min-w-full border-collapse text-[0.7rem]">
            <thead className="bg-zinc-900/80 text-[0.7rem] uppercase tracking-[0.16em] text-neutral-400">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Time</th>
                <th className="px-3 py-2 text-left font-medium">Service</th>
                <th className="px-3 py-2 text-left font-medium">Platform</th>
                <th className="px-3 py-2 text-left font-medium">Operation</th>
                <th className="px-3 py-2 text-right font-medium">Units</th>
                <th className="px-3 py-2 text-left font-medium">Unit Type</th>
                <th className="px-3 py-2 text-right font-medium">
                  Est. Cost
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-t border-neutral-900 hover:bg-neutral-900/40"
                >
                  <td className="px-3 py-2 text-neutral-400">
                    {row.createdAt.toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-3 py-2 text-neutral-100">{row.service}</td>
                  <td className="px-3 py-2 text-neutral-300">
                    {row.platform ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-neutral-300">
                    {row.operation}
                  </td>
                  <td className="px-3 py-2 text-right text-neutral-100">
                    {row.units != null
                      ? formatNumber(Number(row.units.toFixed(4)))
                      : "—"}
                  </td>
                  <td className="px-3 py-2 text-neutral-300">
                    {row.unitType ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-right text-neutral-100">
                    {row.estimatedCost != null
                      ? formatCurrency(row.estimatedCost)
                      : "—"}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-[0.7rem] text-neutral-500"
                  >
                    No API calls logged yet. Once external services are used,
                    recent calls will appear here.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="text-[0.65rem] text-neutral-500">
          Note: This log is intended for high-level monitoring and does not
          replace provider-side billing dashboards. Estimated costs are best
          guesses based on configured rates and may not exactly match invoices.
        </p>
      </section>
    </main>
  );
}


