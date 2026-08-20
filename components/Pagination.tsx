import Link from "next/link";

/**
 * Windowed pagination control. Shows first/last, the current page ±1, and
 * ellipses for the gaps — so a catalog with hundreds of pages never renders
 * hundreds of page pills.
 */
function getPageWindow(page: number, totalPages: number): (number | "gap")[] {
  const pages: (number | "gap")[] = [];
  const left = Math.max(2, page - 1);
  const right = Math.min(totalPages - 1, page + 1);

  pages.push(1);
  if (left > 2) pages.push("gap");
  for (let i = left; i <= right; i++) pages.push(i);
  if (right < totalPages - 1) pages.push("gap");
  if (totalPages > 1) pages.push(totalPages);

  return pages;
}

export function Pagination({
  page,
  totalPages,
  hrefForPage,
}: {
  page: number;
  totalPages: number;
  hrefForPage: (page: number) => string;
}) {
  if (totalPages <= 1) return null;

  const window = getPageWindow(page, totalPages);

  return (
    <div className="flex items-center gap-2">
      <Link
        href={hrefForPage(Math.max(page - 1, 1))}
        aria-label="Previous page"
        className={`rounded-md px-2 py-1 uppercase tracking-[0.16em] hover:text-white ${
          page === 1 ? "pointer-events-none opacity-40" : ""
        }`}
      >
        Prev
      </Link>
      <div className="flex items-center gap-1">
        {window.map((entry, i) =>
          entry === "gap" ? (
            <span
              key={`gap-${i}`}
              className="px-1 text-neutral-600 select-none"
            >
              …
            </span>
          ) : (
            <Link
              key={entry}
              href={hrefForPage(entry)}
              className={`flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-[0.7rem] ${
                entry === page
                  ? "bg-white text-black"
                  : "text-neutral-400 hover:bg-neutral-900 hover:text-white"
              }`}
            >
              {entry}
            </Link>
          ),
        )}
      </div>
      <Link
        href={hrefForPage(Math.min(page + 1, totalPages))}
        aria-label="Next page"
        className={`rounded-md px-2 py-1 uppercase tracking-[0.16em] hover:text-white ${
          page === totalPages ? "pointer-events-none opacity-40" : ""
        }`}
      >
        Next
      </Link>
    </div>
  );
}
