"use client";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="rounded bg-black px-6 py-2 text-xs uppercase tracking-[0.16em] text-white"
    >
      Print
    </button>
  );
}
