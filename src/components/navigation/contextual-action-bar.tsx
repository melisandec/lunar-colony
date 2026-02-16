"use client";

import { useMemo, useRef, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ROUTE_MAP, type RouteNode } from "@/stores/navigation-store";
import { useFeedback } from "@/hooks/use-feedback";
import { useReducedMotion } from "@/stores/accessibility-store";
import { haptic } from "@/lib/haptics-engine";

/* ========================================================================= */
/* Contextual Action Bar — secondary nav for within-page navigation          */
/* Shows child pages / sub-sections of the current primary route.            */
/* ========================================================================= */

export function ContextualActionBar() {
  const pathname = usePathname();
  const fb = useFeedback();
  const reduced = useReducedMotion();
  const navRef = useRef<HTMLElement>(null);

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

  // Show scroll shadow when content overflows
  const [canScrollRight, setCanScrollRight] = useState(false);
  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    const check = () => {
      setCanScrollRight(el.scrollWidth > el.clientWidth);
    };
    check();
    const obs = new ResizeObserver(check);
    obs.observe(el);
    return () => obs.disconnect();
  }, [children]);

  return (
    <nav
      ref={navRef}
      aria-label="Section navigation"
      className="relative flex items-center gap-1 overflow-x-auto px-1 py-2 scrollbar-none"
    >
      {children.map((child) => {
        const isActive =
          activeChild === child.path ||
          (!activeChild && pathname === parent.path && children[0] === child);

        return (
          <Link
            key={child.path}
            href={child.path}
            onClick={() => {
              fb.click();
              haptic("tap");
            }}
            className={`relative flex min-h-[44px] min-w-[44px] flex-shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-4 py-2.5 text-xs font-medium transition-colors
              ${isActive
                ? "bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-500/40"
                : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
              }`}
            aria-current={isActive ? "page" : undefined}
          >
            <span aria-hidden="true">{child.icon}</span>
            <span>{child.shortLabel ?? child.label}</span>

            {/* Active indicator — stronger visual */}
            {isActive && (
              <motion.div
                layoutId={reduced ? undefined : "ctx-tab-indicator"}
                className="absolute inset-0 -z-10 rounded-lg bg-cyan-500/15 ring-1 ring-cyan-500/30"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
          </Link>
        );
      })}
      {/* Scroll hint gradient when content overflows */}
      {canScrollRight && (
        <div
          className="pointer-events-none absolute right-0 top-0 h-full w-8 bg-gradient-to-l from-slate-950/80 to-transparent"
          aria-hidden="true"
        />
      )}
    </nav>
  );
}
