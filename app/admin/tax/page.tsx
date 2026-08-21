import { AdminPageHelp } from "@/components/AdminPageHelp";
import { TaxSettingsForm } from "./TaxSettingsForm";

export const dynamic = "force-dynamic";

export default function AdminTaxPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="border-b border-neutral-800 bg-zinc-900/70 px-6 py-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Tax</h1>
            <p className="mt-1 text-xs text-neutral-400">
              Configure the sales tax rate applied at checkout.
            </p>
          </div>
          <AdminPageHelp page="tax" />
        </div>
      </div>

      <section className="px-6 py-6">
        <TaxSettingsForm />
      </section>
    </main>
  );
}
