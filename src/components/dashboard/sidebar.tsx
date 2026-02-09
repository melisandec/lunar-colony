"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { useUIStore } from "@/stores/ui-store";

const NAV_ITEMS = [
  { href: "/dashboard/colony", icon: "🗺️", label: "Colony", shortcut: "C" },
  {
    href: "/dashboard/production",
    icon: "📊",
    label: "Production",
    shortcut: "P",
  },
  { href: "/dashboard/market", icon: "📈", label: "Market", shortcut: "M" },
  {
    href: "/dashboard/research",
    icon: "🔬",
    label: "Research",
    shortcut: "R",
  },
  {
    href: "/dashboard/alliance",
    icon: "🤝",
    label: "Alliance",
    shortcut: "A",
  },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggle = useUIStore((s) => s.toggleSidebar);

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 64 : 240 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      className="hidden lg:flex flex-col border-r border-slate-800/60 bg-slate-950/80 backdrop-blur-xl"
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-slate-800/40 px-4">
        <span className="text-2xl">🌙</span>
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm font-bold tracking-wider text-cyan-400"
          >
            LUNAR COLONY
          </motion.span>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex flex-1 flex-col gap-1 p-2">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all
                ${active ? "bg-cyan-500/10 text-cyan-400" : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"}`}
            >
              {active && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-lg bg-cyan-500/10 border border-cyan-500/20"
                  transition={{ duration: 0.2 }}
                />
              )}
              <span className="relative z-10 text-lg">{item.icon}</span>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="relative z-10"
                >
                  {item.label}
                </motion.span>
              )}
              {!collapsed && (
                <span className="relative z-10 ml-auto text-xs text-slate-600 opacity-0 transition group-hover:opacity-100">
                  {item.shortcut}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={toggle}
        className="flex h-12 items-center justify-center border-t border-slate-800/40 text-slate-500 transition hover:text-slate-300"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <span
          className="transition-transform"
          style={{ transform: collapsed ? "rotate(0deg)" : "rotate(180deg)" }}
        >
          ◀
        </span>
      </button>
    </motion.aside>
  );
}
