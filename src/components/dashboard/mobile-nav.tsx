"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

const NAV_ITEMS = [
  { href: "/dashboard/colony", icon: "🗺️", label: "Colony" },
  { href: "/dashboard/production", icon: "📊", label: "Stats" },
  { href: "/dashboard/market", icon: "📈", label: "Market" },
  { href: "/dashboard/research", icon: "🔬", label: "Research" },
  { href: "/dashboard/alliance", icon: "🤝", label: "Alliance" },
] as const;

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-50 flex items-center justify-around border-t border-slate-800/60 bg-slate-950/95 backdrop-blur-xl px-1 pb-[env(safe-area-inset-bottom)]">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`relative flex flex-col items-center gap-0.5 px-3 py-2 text-xs font-medium transition-colors
              ${active ? "text-cyan-400" : "text-slate-500"}`}
          >
            {active && (
              <motion.div
                layoutId="mobile-nav-active"
                className="absolute -top-px left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-cyan-400"
                transition={{ duration: 0.2 }}
              />
            )}
            <span className="text-xl">{item.icon}</span>
            <span className="hidden sm:block">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
