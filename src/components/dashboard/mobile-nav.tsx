"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { useFeedback } from "@/hooks/use-feedback";
import { useNavBadges } from "@/hooks/use-nav-badges";
import { ROUTE_MAP } from "@/stores/navigation-store";

export function MobileNav() {
  const pathname = usePathname();
  const fb = useFeedback();
  const badges = useNavBadges();

  const getBadgeCount = (path: string) => {
    if (path.startsWith("/dashboard/market")) return badges.market;
    if (path.startsWith("/dashboard/alliance")) return badges.alliance;
    return 0;
  };

  return (
    <nav
      aria-label="Mobile navigation"
      className="lg:hidden fixed bottom-0 inset-x-0 z-50 flex items-center justify-around border-t border-slate-800/40 bg-slate-950/95 backdrop-blur-xl px-0.5 pt-1.5 pb-[max(env(safe-area-inset-bottom),6px)] sm:pt-2 sm:pb-[max(env(safe-area-inset-bottom),8px)]"
    >
      {ROUTE_MAP.map((route) => {
        const active =
          pathname === route.path || pathname.startsWith(route.path + "/");
        const label = route.shortLabel ?? route.label;
        const badgeCount = getBadgeCount(route.path);
        return (
          <Link
            key={route.path}
            href={route.path}
            onClick={() => fb.click()}
            aria-current={active ? "page" : undefined}
            aria-label={`${label}${badgeCount > 0 ? `, ${badgeCount} notifications` : ""}`}
            className={`relative flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-0 rounded-lg px-1.5 py-1.5 text-[10px] font-medium transition-colors
              focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:rounded-lg
              sm:min-h-[48px] sm:min-w-[48px] sm:gap-0.5 sm:px-2 sm:py-2 sm:text-xs
              ${active ? "text-cyan-300" : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/30"}`}
          >
            {active && (
              <motion.div
                layoutId="mobile-nav-active"
                className="absolute inset-x-1.5 -top-px h-0.5 rounded-full bg-cyan-400 sm:inset-x-2"
                transition={{ duration: 0.2 }}
              />
            )}
            <span className="relative text-lg sm:text-xl" aria-hidden="true">
              {route.icon}
              {badgeCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-amber-500 px-0.5 text-[9px] font-bold text-white sm:-right-2 sm:-top-1.5 sm:h-4 sm:min-w-[16px] sm:px-1 sm:text-[10px]">
                  {badgeCount > 9 ? "9+" : badgeCount}
                </span>
              )}
            </span>
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
