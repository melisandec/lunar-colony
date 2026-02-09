"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useUIStore } from "@/stores/ui-store";
import { useFeedback } from "@/hooks/use-feedback";
import { ROUTE_MAP, type RouteNode } from "@/stores/navigation-store";

export function Sidebar({ onOpenA11y }: { onOpenA11y?: () => void }) {
  const pathname = usePathname();
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggle = useUIStore((s) => s.toggleSidebar);
  const fb = useFeedback();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(),
  );

  const toggleSection = (path: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  // Auto-expand section when its child is active
  const isRouteActive = (route: RouteNode): boolean =>
    pathname === route.path || pathname.startsWith(route.path + "/");

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 64 : 240 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      className="hidden lg:flex flex-col border-r border-slate-800/60 bg-slate-950/80 backdrop-blur-xl"
      aria-label="Main sidebar"
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-slate-800/40 px-4">
        <span className="text-2xl" aria-hidden="true">
          🌙
        </span>
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
      <nav
        aria-label="Main navigation"
        className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2"
      >
        {ROUTE_MAP.map((route) => {
          const active = isRouteActive(route);
          const hasChildren = route.children && route.children.length > 0;
          const expanded =
            expandedSections.has(route.path) || (active && hasChildren);

          return (
            <div key={route.path}>
              {/* Primary nav item */}
              <div className="flex items-center">
                <Link
                  href={route.path}
                  onClick={() => fb.click()}
                  aria-label={
                    collapsed ? (route.shortLabel ?? route.label) : undefined
                  }
                  aria-current={pathname === route.path ? "page" : undefined}
                  className={`group relative flex flex-1 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all min-h-[44px]
                    focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950
                    ${active ? "bg-cyan-500/10 text-cyan-400" : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"}`}
                >
                  {active && (
                    <motion.div
                      layoutId="sidebar-active"
                      className="absolute inset-0 rounded-lg bg-cyan-500/10 border border-cyan-500/20"
                      transition={{ duration: 0.2 }}
                    />
                  )}
                  <span className="relative z-10 text-lg" aria-hidden="true">
                    {route.icon}
                  </span>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="relative z-10 flex-1"
                    >
                      {route.shortLabel ?? route.label}
                    </motion.span>
                  )}
                  {!collapsed && route.shortcut && (
                    <span
                      className="relative z-10 ml-auto text-xs text-slate-600 opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100"
                      aria-hidden="true"
                    >
                      {route.shortcut.toUpperCase()}
                    </span>
                  )}
                </Link>

                {/* Expand toggle for items with children */}
                {hasChildren && !collapsed && (
                  <button
                    onClick={() => {
                      fb.click();
                      toggleSection(route.path);
                    }}
                    aria-label={
                      expanded ? "Collapse section" : "Expand section"
                    }
                    aria-expanded={expanded}
                    className="relative z-10 flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:text-slate-300 transition-colors focus-visible:ring-2 focus-visible:ring-cyan-500"
                  >
                    <motion.span
                      animate={{ rotate: expanded ? 90 : 0 }}
                      transition={{ duration: 0.15 }}
                      className="text-xs"
                      aria-hidden="true"
                    >
                      ▶
                    </motion.span>
                  </button>
                )}
              </div>

              {/* Sub-navigation */}
              <AnimatePresence initial={false}>
                {hasChildren && expanded && !collapsed && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="overflow-hidden"
                  >
                    <div className="ml-5 flex flex-col gap-0.5 border-l border-slate-800/40 py-1 pl-3">
                      {route.children!.map((child) => {
                        // Skip first child if it matches parent path (it's the default view)
                        if (child.path === route.path) return null;

                        const childActive =
                          pathname === child.path ||
                          pathname.startsWith(child.path + "/");

                        return (
                          <Link
                            key={child.path}
                            href={child.path}
                            onClick={() => fb.click()}
                            aria-current={childActive ? "page" : undefined}
                            className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium transition-colors min-h-[36px]
                              focus-visible:ring-2 focus-visible:ring-cyan-500
                              ${childActive ? "text-cyan-400 bg-cyan-500/5" : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/30"}`}
                          >
                            <span className="text-sm" aria-hidden="true">
                              {child.icon}
                            </span>
                            <span>{child.shortLabel ?? child.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </nav>

      {/* Search shortcut hint */}
      {!collapsed && (
        <div className="px-3 pb-2">
          <div className="flex items-center gap-2 rounded-lg border border-slate-800/40 bg-slate-900/40 px-3 py-2 text-[11px] text-slate-500">
            <svg
              className="h-3 w-3 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <span>Search</span>
            <kbd className="ml-auto rounded border border-slate-700 bg-slate-800 px-1 py-0.5 font-mono text-[9px]">
              ⌘K
            </kbd>
          </div>
        </div>
      )}

      {/* Bottom actions */}
      <div className="border-t border-slate-800/40">
        {/* Accessibility settings button */}
        {onOpenA11y && (
          <button
            onClick={() => {
              fb.click();
              onOpenA11y();
            }}
            aria-label="Accessibility settings"
            className="flex h-12 w-full items-center justify-center gap-2 text-slate-500 transition hover:text-slate-300 focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          >
            <span aria-hidden="true">♿</span>
            {!collapsed && <span className="text-xs">Accessibility</span>}
          </button>
        )}

        {/* Collapse toggle */}
        <button
          onClick={() => {
            fb.click();
            toggle();
          }}
          className="flex h-12 w-full items-center justify-center border-t border-slate-800/40 text-slate-500 transition hover:text-slate-300 focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <span
            aria-hidden="true"
            className="transition-transform"
            style={{ transform: collapsed ? "rotate(0deg)" : "rotate(180deg)" }}
          >
            ◀
          </span>
        </button>
      </div>
    </motion.aside>
  );
}
