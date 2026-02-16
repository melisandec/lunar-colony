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

  // Find the current primary route and its children
  const { parent, children, activeChild } = useMemo(() => {
    let matched: RouteNode | undefined;
    let active: string | undefined;

    for (const route of ROUTE_MAP) {
      if (pathname === route.path || pathname.startsWith(route.path + "/")) {
        matched = route;
        if (route.children) {
          for (const child of route.children) {
            if (
              pathname === child.path ||
              pathname.startsWith(child.path + "/")
            ) {
              active = child.path;
            }
          }
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
    <ContextualNavBarInner
      pathname={pathname}
      parent={parent}
      routeChildren={children}
      activeChild={activeChild}
      fb={fb}
      reduced={reduced}
    />
  );
}

/* Inner component — holds scroll-state hooks, only mounted when nav is shown */
function ContextualNavBarInner({
  pathname,
  parent,
  routeChildren,
  activeChild,
  fb,
  reduced,
}: {
  pathname: string;
  parent: RouteNode;
  routeChildren: RouteNode[];
  activeChild: string | undefined;
  fb: ReturnType<typeof useFeedback>;
  reduced: boolean;
}) {
  const navRef = useRef<HTMLElement>(null);
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
  }, [parent.path, routeChildren.length]);

  return (
    <nav
      ref={navRef}
      aria-label="Section navigation"
      className="relative flex items-center gap-1 overflow-x-auto px-1 py-1.5 scrollbar-none sm:py-2"
    >
      {routeChildren.map((child) => {
        const isActive =
          activeChild === child.path ||
          (!activeChild && pathname === parent.path && routeChildren[0] === child);

        return (
          <Link
            key={child.path}
            href={child.path}
            onClick={() => {
              fb.click();
              haptic("tap");
            }}
            className={`relative flex min-h-[36px] min-w-[36px] shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-lg px-3 py-2 text-[11px] font-medium transition-colors sm:min-h-[44px] sm:min-w-[44px] sm:gap-1.5 sm:px-4 sm:py-2.5 sm:text-xs
              ${isActive
                ? "bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-500/30"
                : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
              }`}
            aria-current={isActive ? "page" : undefined}
          >
            <span aria-hidden="true">{child.icon}</span>
            <span>{child.shortLabel ?? child.label}</span>

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
      {canScrollRight && (
        <div
          className="pointer-events-none absolute right-0 top-0 h-full w-8 bg-gradient-to-l from-slate-950/80 to-transparent"
          aria-hidden="true"
        />
      )}
    </nav>
  );
}
