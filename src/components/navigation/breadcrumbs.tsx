"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
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

/**
 * NavHistoryButtons — Back / Forward buttons using the navigation history.
 */
export function NavHistoryButtons() {
  // We import lazily to avoid circular deps
  const { useNavHistory } =
    require("@/stores/navigation-store") as typeof import("@/stores/navigation-store");
  const { useRouter } =
    require("next/navigation") as typeof import("next/navigation");

  const canBack = useNavHistory((s: { canGoBack: () => boolean }) =>
    s.canGoBack(),
  );
  const canForward = useNavHistory((s: { canGoForward: () => boolean }) =>
    s.canGoForward(),
  );
  const goBack = useNavHistory(
    (s: { goBack: () => string | null }) => s.goBack,
  );
  const goForward = useNavHistory(
    (s: { goForward: () => string | null }) => s.goForward,
  );
  const router = useRouter();
  const fb = useFeedback();

  const handleBack = () => {
    const path = goBack();
    if (path) {
      fb.click();
      router.push(path);
    }
  };

  const handleForward = () => {
    const path = goForward();
    if (path) {
      fb.click();
      router.push(path);
    }
  };

  return (
    <div className="flex items-center gap-0.5">
      <motion.button
        onClick={handleBack}
        disabled={!canBack}
        whileTap={canBack ? { scale: 0.9 } : undefined}
        aria-label="Go back"
        className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-800/60 hover:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-cyan-500"
      >
        <svg
          className="h-3.5 w-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </motion.button>
      <motion.button
        onClick={handleForward}
        disabled={!canForward}
        whileTap={canForward ? { scale: 0.9 } : undefined}
        aria-label="Go forward"
        className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-800/60 hover:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-cyan-500"
      >
        <svg
          className="h-3.5 w-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </motion.button>
    </div>
  );
}
