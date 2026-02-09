"use client";

import { useUIStore } from "@/stores/ui-store";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useCallback } from "react";
import { playSound } from "@/lib/audio-engine";
import { haptic } from "@/lib/haptics-engine";

export function Modal() {
  const open = useUIStore((s) => s.modalOpen);
  const content = useUIStore((s) => s.modalContent);
  const close = useUIStore((s) => s.closeModal);
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Store the element that was focused before the modal opened
  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      playSound("click");
      haptic("tap");
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, close]);

  // Focus trap — keep Tab within modal
  useEffect(() => {
    if (!open || !panelRef.current) return;

    // Auto-focus the close button or first focusable element
    const focusable = panelRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    if (focusable.length > 0) {
      focusable[0]!.focus();
    }

    function trapFocus(e: KeyboardEvent) {
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusableEls = panelRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusableEls.length === 0) return;
      const first = focusableEls[0]!;
      const last = focusableEls[focusableEls.length - 1]!;

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    window.addEventListener("keydown", trapFocus);
    return () => {
      window.removeEventListener("keydown", trapFocus);
      // Restore focus on close
      previousFocusRef.current?.focus();
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
            aria-hidden="true"
          />
          {/* Panel */}
          <motion.div
            className="fixed inset-0 z-[91] flex items-center justify-center p-4"
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.2 }}
          >
            <div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-label="Dialog"
              className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={close}
                aria-label="Close dialog"
                className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-800 hover:text-white focus-visible:ring-2 focus-visible:ring-cyan-500"
              >
                ✕
              </button>
              {content}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------
// Context Menu
// ---------------------------------------------------------------------------

export function ContextMenu() {
  const menu = useUIStore((s) => s.contextMenu);
  const close = useUIStore((s) => s.closeContextMenu);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside or another context menu
  useEffect(() => {
    if (!menu) return;
    const handler = () => close();
    window.addEventListener("click", handler);
    window.addEventListener("contextmenu", handler);
    return () => {
      window.removeEventListener("click", handler);
      window.removeEventListener("contextmenu", handler);
    };
  }, [menu, close]);

  // Close on Escape, arrow-key navigation
  useEffect(() => {
    if (!menu || !menuRef.current) return;

    // Focus first item
    const items =
      menuRef.current.querySelectorAll<HTMLButtonElement>('[role="menuitem"]');
    if (items.length > 0) items[0]!.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }

      if (!menuRef.current) return;
      const items =
        menuRef.current.querySelectorAll<HTMLButtonElement>(
          '[role="menuitem"]',
        );
      const currentIdx = Array.from(items).indexOf(
        document.activeElement as HTMLButtonElement,
      );

      if (e.key === "ArrowDown") {
        e.preventDefault();
        const next = currentIdx < items.length - 1 ? currentIdx + 1 : 0;
        items[next]!.focus();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const prev = currentIdx > 0 ? currentIdx - 1 : items.length - 1;
        items[prev]!.focus();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [menu, close]);

  const handleAction = useCallback(
    (action: () => void) => {
      playSound("click");
      haptic("tap");
      action();
      close();
    },
    [close],
  );

  if (!menu) return null;

  return (
    <motion.div
      ref={menuRef}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      role="menu"
      aria-label="Context menu"
      className="fixed z-[80] min-w-[160px] rounded-xl border border-slate-800 bg-slate-950/95 py-1 shadow-2xl backdrop-blur-xl"
      style={{ left: menu.x, top: menu.y }}
    >
      {menu.items.map((item, i) => (
        <button
          key={i}
          role="menuitem"
          onClick={() => handleAction(item.action)}
          className={`flex w-full items-center gap-2 px-4 py-3 text-left text-sm transition min-h-[44px]
            focus-visible:bg-slate-800/50 focus-visible:outline-none
            ${item.danger ? "text-red-400 hover:bg-red-500/10" : "text-slate-300 hover:bg-slate-800/50"}`}
        >
          {item.icon && <span aria-hidden="true">{item.icon}</span>}
          {item.label}
        </button>
      ))}
    </motion.div>
  );
}
