"use client";

import { signOut } from "next-auth/react";

export function AdminSignOut() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="mt-3 w-full rounded-md border border-neutral-700 px-2.5 py-2 text-left text-xs text-neutral-300 hover:bg-neutral-800 hover:text-white"
    >
      Sign out
    </button>
  );
}
