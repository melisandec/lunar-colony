"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { useFeedback } from "@/hooks/use-feedback";
import { ROUTE_MAP } from "@/stores/navigation-store";

export function MobileNav() {
  const pathname = usePathname();
  const fb = useFeedback();

  return (
    <nav
      aria-label="Mobile navigation"
      className="lg:hidden fixed bottom-0 inset-x-0 z-50 flex items-center justify-around border-t border-slate-800/60 bg-slate-950/95 backdrop-blur-xl px-1 pb-[env(safe-area-inset-bottom)]"
    >
      {ROUTE_MAP.map((route) => {
        const active =
          pathname === route.path || pathname.startsWith(route.path + "/");
        const label = route.shortLabel ?? route.label;
        return (
          <Link
            key={route.path}
            href={route.path}
            onClick={() => fb.click()}
            aria-label={label}
            aria-current={active ? "page" : undefined}
            className={`relative flex flex-col items-center gap-0.5 px-3 py-3 text-xs font-medium transition-colors min-h-[48px] min-w-[48px]
              focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:rounded-lg
              ${active ? "text-cyan-400" : "text-slate-500"}`}
          >
            {active && (
              <motion.div
                layoutId="mobile-nav-active"
                className="absolute -top-px left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-cyan-400"
                transition={{ duration: 0.2 }}
              />
            )}
            <span className="text-xl" aria-hidden="true">
              {route.icon}
            </span>
            <span className="text-[10px] sm:text-xs">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
