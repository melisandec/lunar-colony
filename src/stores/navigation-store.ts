"use client";

/**
 * Navigation Store — route map, breadcrumbs, history, quick-nav search.
 *
 * Central source of truth for the application's information architecture.
 * Drives breadcrumbs, command palette, and sidebar sub-navigation.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

/* ========================================================================= */
/* Route Map — the complete information architecture                         */
/* ========================================================================= */

export interface RouteNode {
  /** URL path, e.g. "/dashboard/colony" */
  path: string;
  /** Display label */
  label: string;
  /** Short label for mobile/breadcrumbs (optional) */
  shortLabel?: string;
  /** Emoji icon */
  icon: string;
  /** Keyboard shortcut key (single key or combo like "ctrl+k") */
  shortcut?: string;
  /** Search keywords for command palette */
  keywords: string[];
  /** Child routes */
  children?: RouteNode[];
  /** If true, this is a section header, not a navigable route */
  isSection?: boolean;
}

export const ROUTE_MAP: RouteNode[] = [
  {
    path: "/dashboard/colony",
    label: "Colony Management",
    shortLabel: "Colony",
    icon: "🗺️",
    shortcut: "c",
    keywords: ["colony", "modules", "grid", "build", "base", "home"],
    children: [
      {
        path: "/dashboard/colony",
        label: "Module Grid",
        icon: "🏗️",
        keywords: ["modules", "grid", "build", "place", "layout"],
      },
      {
        path: "/dashboard/colony/crew",
        label: "Crew Roster",
        icon: "👨‍🚀",
        keywords: ["crew", "workers", "roster", "assign", "people"],
      },
      {
        path: "/dashboard/colony/storage",
        label: "Storage",
        icon: "📦",
        keywords: ["storage", "inventory", "resources", "warehouse"],
      },
      {
        path: "/dashboard/colony/upgrades",
        label: "Upgrades",
        icon: "⬆️",
        keywords: ["upgrade", "improve", "enhance", "level up"],
      },
    ],
  },
  {
    path: "/dashboard/production",
    label: "Production Cycle",
    shortLabel: "Production",
    icon: "📊",
    shortcut: "p",
    keywords: ["production", "stats", "analytics", "output", "earnings"],
  },
  {
    path: "/dashboard/market",
    label: "Lunar Market",
    shortLabel: "Market",
    icon: "📈",
    shortcut: "m",
    keywords: [
      "market",
      "trade",
      "buy",
      "sell",
      "prices",
      "exchange",
      "charts",
      "rates",
    ],
    children: [
      {
        path: "/dashboard/market",
        label: "Resource Prices",
        icon: "💹",
        keywords: ["prices", "charts", "overview", "rates"],
      },
      {
        path: "/dashboard/market/trade",
        label: "Buy / Sell",
        icon: "💱",
        keywords: ["trade", "buy", "sell", "order", "exchange"],
      },
      {
        path: "/dashboard/market/orders",
        label: "Open Orders",
        icon: "📋",
        keywords: ["orders", "pending", "active", "queue"],
      },
      {
        path: "/dashboard/market/history",
        label: "Trade History",
        icon: "📜",
        keywords: ["history", "past", "trades", "log", "transactions"],
      },
    ],
  },
  {
    path: "/dashboard/research",
    label: "Research & Development",
    shortLabel: "Research",
    icon: "🔬",
    shortcut: "r",
    keywords: ["research", "tech", "science", "development", "tree", "unlock"],
  },
  {
    path: "/dashboard/alliance",
    label: "Corporation",
    shortLabel: "Alliance",
    icon: "🤝",
    shortcut: "a",
    keywords: [
      "alliance",
      "corporation",
      "guild",
      "team",
      "social",
      "corp",
      "members",
      "players",
      "roster",
    ],
    children: [
      {
        path: "/dashboard/alliance",
        label: "Members",
        icon: "👥",
        keywords: ["members", "players", "roster"],
      },
      {
        path: "/dashboard/alliance/projects",
        label: "Projects",
        icon: "🎯",
        keywords: ["projects", "goals", "objectives", "missions"],
      },
      {
        path: "/dashboard/alliance/chat",
        label: "Chat",
        icon: "💬",
        keywords: ["chat", "messages", "communicate"],
      },
      {
        path: "/dashboard/alliance/tournament",
        label: "Tournament",
        icon: "🏆",
        keywords: ["tournament", "competition", "leaderboard", "rank"],
      },
    ],
  },
];

/**
 * Flatten every route (and children) into a single searchable list.
 */
export function flattenRoutes(nodes: RouteNode[] = ROUTE_MAP): RouteNode[] {
  const result: RouteNode[] = [];
  for (const node of nodes) {
    result.push(node);
    if (node.children) {
      for (const child of node.children) {
        // Skip if child path equals parent — it's the default tab, already covered
        if (child.path !== node.path) result.push(child);
      }
    }
  }
  return result;
}

/** All searchable routes as a flat list */
export const ALL_ROUTES = flattenRoutes();

/* ========================================================================= */
/* Breadcrumb building                                                       */
/* ========================================================================= */

export interface Breadcrumb {
  label: string;
  href: string;
  icon?: string;
  current?: boolean;
}

/**
 * Build breadcrumb trail for a given pathname.
 * e.g. "/dashboard/market/trade" → [Home, Market, Buy / Sell]
 */
export function buildBreadcrumbs(pathname: string): Breadcrumb[] {
  const crumbs: Breadcrumb[] = [
    { label: "Home", href: "/dashboard/colony", icon: "🌙" },
  ];

  // Find the primary route
  const primary = ROUTE_MAP.find(
    (r) => pathname === r.path || pathname.startsWith(r.path + "/"),
  );
  if (!primary) return crumbs;

  crumbs.push({
    label: primary.shortLabel ?? primary.label,
    href: primary.path,
    icon: primary.icon,
  });

  // Find the sub-route
  if (primary.children && pathname !== primary.path) {
    const child = primary.children.find((c) => pathname === c.path);
    if (child) {
      crumbs.push({
        label: child.label,
        href: child.path,
        icon: child.icon,
      });
    }
  }

  // Mark last as current
  if (crumbs.length > 0) {
    crumbs[crumbs.length - 1]!.current = true;
  }

  return crumbs;
}

/* ========================================================================= */
/* Search scoring                                                            */
/* ========================================================================= */

export interface SearchResult {
  route: RouteNode;
  /** Parent route label, if this is a child */
  parent?: string;
  score: number;
}

/**
 * Score routes against a search query. Returns sorted results.
 */
export function searchRoutes(query: string): SearchResult[] {
  const q = query.toLowerCase().trim();
  // Return all top-level routes on empty query (for browse mode)
  if (!q) {
    return ROUTE_MAP.map((node) => ({
      route: node,
      score: 0,
    }));
  }
  const results: SearchResult[] = [];

  for (const node of ROUTE_MAP) {
    const parentLabel = node.shortLabel ?? node.label;
    const score = scoreRoute(node, q);
    if (score > 0) {
      results.push({ route: node, score });
    }

    if (node.children) {
      for (const child of node.children) {
        // Skip default-tab children that share parent path — the parent result covers them
        if (child.path === node.path) continue;
        const childScore = scoreRoute(child, q);
        if (childScore > 0) {
          results.push({
            route: child,
            parent: parentLabel,
            score: childScore,
          });
        }
      }
    }
  }

  return results.sort((a, b) => b.score - a.score);
}

function scoreRoute(node: RouteNode, query: string): number {
  let score = 0;
  const label = node.label.toLowerCase();
  const shortLabel = (node.shortLabel ?? "").toLowerCase();

  if (label === query || shortLabel === query) score += 100;
  else if (label.startsWith(query) || shortLabel.startsWith(query)) score += 80;
  else if (label.includes(query)) score += 60;

  for (const kw of node.keywords) {
    if (kw === query) score += 50;
    else if (kw.startsWith(query)) score += 30;
    else if (kw.includes(query)) score += 15;
  }

  return score;
}

/* ========================================================================= */
/* Quick actions for command palette                                         */
/* ========================================================================= */

export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  keywords: string[];
  shortcut?: string;
  /** Action type: "navigate" or "action" */
  type: "navigate" | "action";
  /** For navigate type, the target path */
  path?: string;
}

export const QUICK_ACTIONS: QuickAction[] = [
  {
    id: "collect",
    label: "Collect earnings",
    icon: "⚡",
    keywords: ["collect", "earn", "harvest", "claim"],
    shortcut: "e",
    type: "action",
  },
  {
    id: "build",
    label: "Build module",
    icon: "🏗️",
    keywords: ["build", "construct", "new", "create"],
    shortcut: "b",
    type: "action",
  },
  {
    id: "settings",
    label: "Accessibility settings",
    icon: "♿",
    keywords: ["settings", "accessibility", "a11y", "preferences"],
    type: "action",
  },
  {
    id: "shortcuts",
    label: "Keyboard shortcuts",
    icon: "⌨️",
    keywords: ["keyboard", "shortcuts", "keys", "help"],
    shortcut: "?",
    type: "action",
  },
];

/**
 * Search quick actions against a query.
 */
export function searchActions(query: string): QuickAction[] {
  if (!query.trim()) return QUICK_ACTIONS;
  const q = query.toLowerCase().trim();
  return QUICK_ACTIONS.filter((a) => {
    if (a.label.toLowerCase().includes(q)) return true;
    return a.keywords.some((kw) => kw.includes(q));
  });
}

/* ========================================================================= */
/* Navigation History Store                                                  */
/* ========================================================================= */

interface NavHistoryState {
  /** Ordered history stack (newest first), max 50 entries */
  history: string[];
  /** Index pointing to current position in history */
  currentIndex: number;
  /** True when navigating via goBack/goForward — suppresses push */
  _traversing: boolean;

  /** Record a new navigation */
  push: (path: string) => void;
  /** Go back in history. Returns the path or null. */
  goBack: () => string | null;
  /** Go forward in history. Returns the path or null. */
  goForward: () => string | null;
  /** Can we go back? */
  canGoBack: () => boolean;
  /** Can we go forward? */
  canGoForward: () => boolean;
  /** Get recent history for display */
  getRecent: (limit?: number) => string[];
}

export const useNavHistory = create<NavHistoryState>()(
  persist(
    (set, get) => ({
      history: [],
      currentIndex: -1,
      _traversing: false,

      push: (path: string) => {
        const { history, currentIndex, _traversing } = get();
        // When navigating via goBack/goForward, don't add a new entry
        if (_traversing) {
          set({ _traversing: false });
          return;
        }
        // If we're not at the end, drop forward entries
        const trimmed = history.slice(0, currentIndex + 1);
        // Don't add duplicates in a row
        if (trimmed[trimmed.length - 1] === path) return;
        const updated = [...trimmed, path].slice(-50);
        set({ history: updated, currentIndex: updated.length - 1 });
      },

      goBack: () => {
        const { history, currentIndex } = get();
        if (currentIndex <= 0) return null;
        const newIndex = currentIndex - 1;
        set({ currentIndex: newIndex, _traversing: true });
        return history[newIndex] ?? null;
      },

      goForward: () => {
        const { history, currentIndex } = get();
        if (currentIndex >= history.length - 1) return null;
        const newIndex = currentIndex + 1;
        set({ currentIndex: newIndex, _traversing: true });
        return history[newIndex] ?? null;
      },

      canGoBack: () => get().currentIndex > 0,
      canGoForward: () => get().currentIndex < get().history.length - 1,

      getRecent: (limit = 5) => {
        const { history, currentIndex } = get();
        return history
          .slice(0, currentIndex + 1)
          .reverse()
          .slice(0, limit);
      },
    }),
    {
      name: "lunar-colony-nav",
      partialize: (state) => ({
        history: state.history,
        currentIndex: state.currentIndex,
      }),
    },
  ),
);
