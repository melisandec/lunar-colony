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
 * Shortcuts are disabled when:
 * - An input/textarea/select/contenteditable element is focused
 * - A modal or dialog is open (role="dialog" present in DOM)
 */
export function useKeyboardShortcuts(shortcuts: Shortcut[]) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;

      // Skip when user is typing in an editable field
      const tag = target.tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        target.isContentEditable
      )
        return;

      // Skip when a modal/dialog is open (prevent shortcuts behind dialogs)
      const activeDialog = document.querySelector(
        '[role="dialog"][aria-modal="true"]',
      );
      if (activeDialog && !activeDialog.contains(target)) return;

      for (const s of shortcuts) {
        const keyMatch = e.key.toLowerCase() === s.key.toLowerCase();
        const ctrlMatch = s.ctrl
          ? e.ctrlKey || e.metaKey
          : !e.ctrlKey && !e.metaKey;
        const shiftMatch = s.shift ? e.shiftKey : !e.shiftKey;

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
  COLONY: { key: "c", description: "Colony view" },
  PRODUCTION: { key: "p", description: "Production cycle" },
  MARKET: { key: "m", description: "Market terminal" },
  RESEARCH: { key: "r", description: "Research tree" },
  ALLIANCE: { key: "a", description: "Alliance" },
  COLLECT: { key: "e", description: "Collect earnings" },
  BUILD: { key: "b", description: "Build module" },
  SHORTCUTS: { key: "?", shift: true, description: "Keyboard shortcuts" },
  ESCAPE: { key: "Escape", description: "Close modal / deselect" },
} as const;
