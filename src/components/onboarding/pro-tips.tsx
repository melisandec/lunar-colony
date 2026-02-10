"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useOnboardingStore,
  PRO_TIPS,
  type ProTip,
} from "@/stores/onboarding-store";
import { useGameStore } from "@/stores/game-store";
import { usePathname } from "next/navigation";

// ---------------------------------------------------------------------------
// Progressive Tooltip System
//
// Shows contextual "pro tip" pop-ups based on player level and current page.
// Only one tip is shown at a time, with a min delay between tips.
// Tips are persisted as dismissed so they won't re-appear.
// ---------------------------------------------------------------------------

const TIP_DELAY_MS = 8_000; // wait 8s after page load before showing a tip
const TIP_COOLDOWN_MS = 60_000; // at least 60s between tips

export function ProTipProvider() {
  const pathname = usePathname();
  const colony = useGameStore((s) => s.colony);
  const dismissedTips = useOnboardingStore((s) => s.dismissedTips);
  const dismissTip = useOnboardingStore((s) => s.dismissTip);
  const maxLevelSeen = useOnboardingStore((s) => s.maxLevelSeen);
  const hasCompleted = useOnboardingStore((s) => s.hasCompletedTutorial);
  const step = useOnboardingStore((s) => s.step);

  const [activeTip, setActiveTip] = useState<ProTip | null>(null);
  const [lastShownAt, setLastShownAt] = useState(0);

  // Determine current page key from pathname
  const currentPage = pathname.split("/").filter(Boolean).pop() ?? "colony";

  const playerLevel = colony?.level ?? 1;

  // Show tip after delay — cooldown check happens in the setTimeout callback (not during render)
  useEffect(() => {
    if (!hasCompleted || step !== "COMPLETED") {
      // Use timeout with 0ms to clear asynchronously (avoids sync setState in effect)
      const clear = setTimeout(() => setActiveTip(null), 0);
      return () => clearTimeout(clear);
    }

    const timer = setTimeout(() => {
      const now = Date.now();
      if (now - lastShownAt < TIP_COOLDOWN_MS) return;

      const tip =
        PRO_TIPS.find(
          (t) =>
            t.page === currentPage &&
            t.minLevel <= Math.max(playerLevel, maxLevelSeen) &&
            !dismissedTips.includes(t.id),
        ) ?? null;

      if (tip) {
        setActiveTip(tip);
        setLastShownAt(now);
      }
    }, TIP_DELAY_MS);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- lastShownAt intentionally excluded to avoid re-trigger loop
  }, [
    currentPage,
    playerLevel,
    maxLevelSeen,
    dismissedTips,
    hasCompleted,
    step,
  ]);

  const handleDismiss = useCallback(() => {
    if (activeTip) {
      dismissTip(activeTip.id);
      setActiveTip(null);
    }
  }, [activeTip, dismissTip]);

  return (
    <AnimatePresence>
      {activeTip && (
        <motion.div
          key={activeTip.id}
          initial={{ opacity: 0, y: 20, x: 20 }}
          animate={{ opacity: 1, y: 0, x: 0 }}
          exit={{ opacity: 0, y: 10, x: 20 }}
          transition={{ type: "spring", damping: 22 }}
          className="fixed bottom-24 right-4 z-[70] max-w-xs lg:bottom-6"
        >
          <div className="rounded-xl border border-indigo-500/20 bg-indigo-950/90 p-4 shadow-xl shadow-indigo-500/5 backdrop-blur-md">
            <div className="mb-2 flex items-center gap-2">
              <span className="text-lg">{activeTip.icon}</span>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                Pro Tip
              </span>
            </div>
            <h4 className="mb-1 text-sm font-semibold text-white">
              {activeTip.title}
            </h4>
            <p className="mb-3 text-xs leading-relaxed text-slate-300">
              {activeTip.body}
            </p>
            <button
              onClick={handleDismiss}
              className="text-xs text-indigo-400 transition hover:text-indigo-300"
            >
              Got it ✓
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------
// Contextual Tooltip (hover/click info bubbles on elements)
// ---------------------------------------------------------------------------

interface InfoTooltipProps {
  /** Tooltip content */
  content: string;
  /** Optional title */
  title?: string;
  /** Trigger: wrap your target element as children */
  children: React.ReactNode;
  /** Position relative to trigger */
  side?: "top" | "bottom" | "left" | "right";
}

export function InfoTooltip({
  content,
  title,
  children,
  side = "top",
}: InfoTooltipProps) {
  const [visible, setVisible] = useState(false);

  const positionClasses: Record<string, string> = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onClick={() => setVisible((v) => !v)}
    >
      {children}
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={`pointer-events-none absolute z-[60] w-56 rounded-lg border border-slate-700 bg-slate-900/95 px-3 py-2 shadow-lg ${positionClasses[side]}`}
          >
            {title && (
              <div className="mb-0.5 text-xs font-semibold text-white">
                {title}
              </div>
            )}
            <div className="text-[11px] leading-relaxed text-slate-300">
              {content}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
