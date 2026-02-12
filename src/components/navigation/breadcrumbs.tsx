"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { buildBreadcrumbs } from "@/stores/navigation-store";
import { useFeedback } from "@/hooks/use-feedback";

/**
 * Breadcrumbs — shows the current path in the information hierarchy.
 * e.g. Home > Market > Buy / Sell
 */
export function Breadcrumbs() {
  const pathname = usePathname();
  const crumbs = buildBreadcrumbs(pathname);
  const fb = useFeedback();

  // Don't render if only 1 crumb (we're at root)
  if (crumbs.length <= 1) return null;

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs">
      <ol className="flex items-center gap-1">
        {crumbs.map((crumb, i) => {
          const isLast = crumb.current;
          return (
            <li key={crumb.href + i} className="flex items-center gap-1">
              {i > 0 && (
                <span className="text-slate-600" aria-hidden="true">
                  ›
                </span>
              )}
              {isLast ? (
                <span
                  className="font-medium text-slate-200"
                  aria-current="page"
                >
                  {crumb.icon && (
                    <span className="mr-1" aria-hidden="true">
                      {crumb.icon}
                    </span>
                  )}
                  {crumb.label}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  onClick={() => fb.click()}
                  className="text-slate-500 transition hover:text-slate-300 focus-visible:text-cyan-400 focus-visible:outline-none"
                >
                  {crumb.icon && (
                    <span className="mr-1" aria-hidden="true">
                      {crumb.icon}
                    </span>
                  )}
                  {crumb.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
