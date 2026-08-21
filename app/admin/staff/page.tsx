import { AdminPageHelp } from "@/components/AdminPageHelp";
import { StaffManager } from "./StaffManager";

export const dynamic = "force-dynamic";

export default function AdminStaffPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="border-b border-neutral-800 bg-zinc-900/70 px-6 py-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Staff &amp; Permissions
            </h1>
            <p className="mt-1 text-xs text-neutral-400">
              Manage who can access the admin and what they can do.
            </p>
          </div>
          <AdminPageHelp page="staff" />
        </div>
      </div>

      <section className="px-6 py-6">
        <StaffManager />
      </section>
    </main>
  );
}
