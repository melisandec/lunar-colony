"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ROUTE_MAP, type RouteNode } from "@/stores/navigation-store";
import { useFeedback } from "@/hooks/use-feedback";
import { useReducedMotion } from "@/stores/accessibility-store";

/* ========================================================================= */
/* Contextual Action Bar — secondary nav for within-page navigation          */
/* Shows child pages / sub-sections of the current primary route.            */
/* ========================================================================= */

export function ContextualActionBar() {
  const pathname = usePathname();
  const fb = useFeedback();
  const reduced = useReducedMotion();

  // Find the current primary route and its children
  const { parent, children, activeChild } = useMemo(() => {
    let matched: RouteNode | undefined;
    let active: string | undefined;

    for (const route of ROUTE_MAP) {
      // Exact primary match
      if (pathname === route.path || pathname.startsWith(route.path + "/")) {
        matched = route;

        // Find active child
        if (route.children) {
          for (const child of route.children) {
            if (
              pathname === child.path ||
              pathname.startsWith(child.path + "/")
            ) {
              active = child.path;
            }
          }
          // If on parent page exactly, first child (the main view) is active
          if (!active && pathname === route.path && route.children.length > 0) {
            active = route.children[0]?.path;
          }
        }
        break;
      }
    }

    return {
      parent: matched,
      children: matched?.children ?? [],
      activeChild: active,
    };
  }, [pathname]);

  if (!parent || children.length === 0) return null;

  return (
    <nav
      aria-label="Section navigation"
      className="flex items-center gap-1 overflow-x-auto px-1 py-1 scrollbar-none"
    >
      {children.map((child) => {
        const isActive =
          activeChild === child.path ||
          (!activeChild && pathname === parent.path && children[0] === child);

        return (
          <Link
            key={child.path}
            href={child.path}
            onClick={() => fb.click()}
            className={`relative flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              isActive
                ? "text-white"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
            }`}
            aria-current={isActive ? "page" : undefined}
          >
            <span aria-hidden="true">{child.icon}</span>
            <span>{child.shortLabel ?? child.label}</span>

            {/* Active indicator */}
            {isActive && (
              <motion.div
                layoutId={reduced ? undefined : "ctx-tab-indicator"}
                className="absolute inset-0 -z-10 rounded-lg bg-cyan-500/15 ring-1 ring-cyan-500/25"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
