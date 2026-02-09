"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ---------------------------------------------------------------------------
// Keyboard Shortcut Help Dialog
//
// Triggered by pressing "?" — shows all available shortcuts grouped by
// category. Helps discoverability per WCAG 2.1 SC 3.3.5.
// ---------------------------------------------------------------------------

const SHORTCUT_GROUPS = [
  {
    title: "Navigation",
    shortcuts: [
      { keys: ["C"], description: "Colony map" },
      { keys: ["P"], description: "Production stats" },
      { keys: ["M"], description: "Market terminal" },
      { keys: ["R"], description: "Research tree" },
      { keys: ["A"], description: "Alliance" },
    ],
  },
  {
    title: "Actions",
    shortcuts: [
      { keys: ["E"], description: "Collect earnings" },
      { keys: ["B"], description: "Build module" },
      { keys: ["Esc"], description: "Close / deselect" },
    ],
  },
  {
    title: "Accessibility",
    shortcuts: [
      { keys: ["?"], description: "Show this help dialog" },
      { keys: ["Tab"], description: "Navigate forward" },
      { keys: ["Shift", "Tab"], description: "Navigate backward" },
      { keys: ["Enter"], description: "Activate focused element" },
      { keys: ["Space"], description: "Toggle / activate button" },
    ],
  },
] as const;

export function KeyboardShortcutsDialog() {
  const [open, setOpen] = useState(false);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement).tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    if (e.key === "?" || (e.shiftKey && e.key === "/")) {
      e.preventDefault();
      setOpen((prev) => !prev);
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
            aria-hidden="true"
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            role="dialog"
            aria-modal="true"
            aria-label="Keyboard shortcuts"
            className="fixed inset-0 z-[101] flex items-center justify-center p-4"
          >
            <div
              className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">
                  <span aria-hidden="true" className="mr-2">
                    ⌨️
                  </span>
                  Keyboard Shortcuts
                </h2>
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Close keyboard shortcuts dialog"
                  className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-800 hover:text-white focus-visible:ring-2 focus-visible:ring-cyan-500"
                >
                  ✕
                </button>
              </div>

              {/* Shortcut groups */}
              <div className="space-y-5">
                {SHORTCUT_GROUPS.map((group) => (
                  <div key={group.title}>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      {group.title}
                    </h3>
                    <div className="space-y-1.5">
                      {group.shortcuts.map((s) => (
                        <div
                          key={s.description}
                          className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-slate-900/50"
                        >
                          <span className="text-sm text-slate-300">
                            {s.description}
                          </span>
                          <div className="flex gap-1">
                            {s.keys.map((k) => (
                              <kbd
                                key={k}
                                className="rounded border border-slate-700 bg-slate-800 px-2 py-1 font-mono text-xs text-slate-300"
                              >
                                {k}
                              </kbd>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer hint */}
              <p className="mt-5 text-center text-xs text-slate-600">
                Press{" "}
                <kbd className="rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 font-mono text-[10px]">
                  ?
                </kbd>{" "}
                to toggle this dialog
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
