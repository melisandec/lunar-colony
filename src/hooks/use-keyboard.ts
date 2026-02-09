"use client";

import { useEffect } from "react";

interface Shortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  handler: () => void;
  description: string;
}

/**
 * Register global keyboard shortcuts.
 * Shortcuts are disabled when an input/textarea is focused.
 */
export function useKeyboardShortcuts(shortcuts: Shortcut[]) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // Skip when user is typing in an input
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      for (const s of shortcuts) {
        const keyMatch = e.key.toLowerCase() === s.key.toLowerCase();
        const ctrlMatch = s.ctrl ? e.ctrlKey || e.metaKey : true;
        const shiftMatch = s.shift ? e.shiftKey : true;

        if (keyMatch && ctrlMatch && shiftMatch) {
          e.preventDefault();
          s.handler();
          return;
        }
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [shortcuts]);
}

/** Pre-defined shortcut keys for the dashboard */
export const DASHBOARD_SHORTCUTS = {
  COLLECT: { key: " ", description: "Collect production" },
  BUILD: { key: "b", description: "Build module" },
  MARKET: { key: "m", description: "Market terminal" },
  RESEARCH: { key: "r", description: "Research tree" },
  ALLIANCE: { key: "a", description: "Alliance" },
  ESCAPE: { key: "Escape", description: "Close modal / deselect" },
} as const;
