"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  searchRoutes,
  searchActions,
  type SearchResult,
  type QuickAction,
} from "@/stores/navigation-store";
import { useFeedback } from "@/hooks/use-feedback";
import { useReducedMotion } from "@/stores/accessibility-store";

/* ========================================================================= */
/* Command Palette (⌘K or Ctrl+K)                                           */
/* ========================================================================= */

type PaletteItem =
  | { type: "route"; data: SearchResult }
  | { type: "action"; data: QuickAction };

interface CommandPaletteProps {
  /** Called when user triggers a quick action by id */
  onAction?: (actionId: string) => void;
}

export function CommandPalette({ onAction }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const fb = useFeedback();
  const reduced = useReducedMotion();

  // ---- Open / close ----

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // ⌘K / Ctrl+K to open
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
        return;
      }
      // "/" to open (when not in an input)
      if (e.key === "/" && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        const tag = (e.target as HTMLElement).tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
        if ((e.target as HTMLElement).isContentEditable) return;
        // Don't conflict with ? shortcut for help
        e.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Auto-focus input when opened
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Close on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // ---- Search results ----

  const items: PaletteItem[] = useMemo(() => {
    const routeResults = searchRoutes(query).map(
      (r): PaletteItem => ({ type: "route", data: r }),
    );
    const actionResults = searchActions(query).map(
      (a): PaletteItem => ({ type: "action", data: a }),
    );

    if (!query.trim()) {
      // Show recent actions first, then routes
      return [...actionResults.slice(0, 4), ...routeResults];
    }

    // Merge and sort by type (routes first if query matches)
    return [...routeResults, ...actionResults];
  }, [query]);

  // Clamp selected index
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // ---- Execution ----

  const execute = useCallback(
    (item: PaletteItem) => {
      fb.click();
      if (item.type === "route") {
        router.push(item.data.route.path);
      } else {
        onAction?.(item.data.id);
      }
      setOpen(false);
    },
    [fb, router, onAction],
  );

  // ---- Keyboard navigation inside palette ----

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) => (prev < items.length - 1 ? prev + 1 : 0));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : items.length - 1));
          break;
        case "Enter":
          e.preventDefault();
          if (items[selectedIndex]) execute(items[selectedIndex]);
          break;
        case "Escape":
          e.preventDefault();
          setOpen(false);
          break;
      }
    },
    [items, selectedIndex, execute],
  );

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm"
            initial={reduced ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />

          {/* Palette */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            className="fixed left-1/2 top-[15vh] z-[201] w-[94vw] max-w-lg -translate-x-1/2 overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-950 shadow-2xl"
            initial={
              reduced ? { opacity: 1 } : { opacity: 0, y: -10, scale: 0.98 }
            }
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={
              reduced ? { opacity: 0 } : { opacity: 0, y: -10, scale: 0.98 }
            }
            transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Search input */}
            <div className="flex items-center gap-3 border-b border-slate-800 px-4 py-3">
              <svg
                className="h-4 w-4 shrink-0 text-slate-500"
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
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search pages, actions, modules…"
                aria-label="Search"
                aria-activedescendant={
                  items[selectedIndex]
                    ? `palette-item-${selectedIndex}`
                    : undefined
                }
                className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none"
              />
              <kbd className="hidden rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-500 sm:inline">
                ESC
              </kbd>
            </div>

            {/* Results */}
            <div
              ref={listRef}
              role="listbox"
              aria-label="Search results"
              className="max-h-[50vh] overflow-y-auto p-2"
            >
              {items.length === 0 && query.trim() && (
                <div className="px-3 py-8 text-center text-sm text-slate-500">
                  No results for &ldquo;{query}&rdquo;
                </div>
              )}

              {!query.trim() && items.length > 0 && (
                <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                  Quick actions
                </div>
              )}

              {items.map((item, i) => {
                const isSelected = i === selectedIndex;
                const label =
                  item.type === "route"
                    ? item.data.route.label
                    : item.data.label;
                const icon =
                  item.type === "route" ? item.data.route.icon : item.data.icon;
                const parent =
                  item.type === "route" ? item.data.parent : undefined;
                const shortcut =
                  item.type === "action" ? item.data.shortcut : undefined;
                const kind = item.type === "route" ? "Page" : "Action";

                return (
                  <div
                    key={`${item.type}-${i}`}
                    id={`palette-item-${i}`}
                    role="option"
                    aria-selected={isSelected}
                    data-index={i}
                    onClick={() => execute(item)}
                    onMouseEnter={() => setSelectedIndex(i)}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                      isSelected
                        ? "bg-cyan-500/10 text-white"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <span className="text-base" aria-hidden="true">
                      {icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {parent && (
                          <>
                            <span className="text-xs text-slate-500">
                              {parent}
                            </span>
                            <span className="text-slate-600" aria-hidden="true">
                              ›
                            </span>
                          </>
                        )}
                        <span className="truncate">{label}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {shortcut && (
                        <kbd className="rounded border border-slate-700 bg-slate-800/60 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">
                          {shortcut}
                        </kbd>
                      )}
                      <span className="text-[10px] text-slate-600">{kind}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer hint */}
            <div className="flex items-center justify-between border-t border-slate-800/60 px-4 py-2">
              <div className="flex items-center gap-3 text-[10px] text-slate-600">
                <span>
                  <kbd className="rounded border border-slate-700 bg-slate-800/60 px-1 py-0.5 font-mono">
                    ↑↓
                  </kbd>{" "}
                  Navigate
                </span>
                <span>
                  <kbd className="rounded border border-slate-700 bg-slate-800/60 px-1 py-0.5 font-mono">
                    ↵
                  </kbd>{" "}
                  Select
                </span>
                <span>
                  <kbd className="rounded border border-slate-700 bg-slate-800/60 px-1 py-0.5 font-mono">
                    /
                  </kbd>{" "}
                  Search
                </span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
