"use client";

import { useUIStore, type Toast } from "@/stores/ui-store";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef } from "react";
import { playSound } from "@/lib/audio-engine";
import { haptic } from "@/lib/haptics-engine";

const TYPE_STYLES: Record<Toast["type"], { bg: string; border: string }> = {
  success: { bg: "bg-emerald-500/10", border: "border-emerald-500/30" },
  error: { bg: "bg-red-500/10", border: "border-red-500/30" },
  warning: { bg: "bg-amber-500/10", border: "border-amber-500/30" },
  info: { bg: "bg-cyan-500/10", border: "border-cyan-500/30" },
};

function toastRole(type: Toast["type"]): "alert" | "status" {
  return type === "error" || type === "warning" ? "alert" : "status";
}

export function ToastProvider() {
  const toasts = useUIStore((s) => s.toasts);
  const remove = useUIStore((s) => s.removeToast);
  const prevCount = useRef(toasts.length);

  // Play sound when a new toast appears
  useEffect(() => {
    if (toasts.length > prevCount.current) {
      const newest = toasts[toasts.length - 1];
      if (newest) {
        const soundMap: Record<Toast["type"], Parameters<typeof playSound>[0]> =
          {
            success: "success",
            error: "error",
            warning: "error",
            info: "click",
          };
        const hapticMap: Record<Toast["type"], Parameters<typeof haptic>[0]> = {
          success: "success",
          error: "error",
          warning: "error",
          info: "tap",
        };
        playSound(soundMap[newest.type]);
        haptic(hapticMap[newest.type]);
      }
    }
    prevCount.current = toasts.length;
  }, [toasts]);

  return (
    <div
      aria-label="Notifications"
      aria-live="polite"
      role="region"
      className="pointer-events-none fixed right-4 top-16 z-[100] flex flex-col gap-2"
    >
      <AnimatePresence>
        {toasts.map((t) => {
          const styles = TYPE_STYLES[t.type];
          return (
            <motion.div
              key={t.id}
              role={toastRole(t.type)}
              initial={{ opacity: 0, x: 60, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 60, scale: 0.95 }}
              transition={{ duration: 0.25 }}
              className={`pointer-events-auto flex items-start gap-3 rounded-xl border ${styles.border} ${styles.bg} px-4 py-3 shadow-2xl backdrop-blur-lg`}
              style={{ minWidth: 260, maxWidth: 360 }}
            >
              {t.icon && (
                <span className="text-lg" aria-hidden="true">
                  {t.icon}
                </span>
              )}
              <div className="flex-1">
                <div className="text-sm font-semibold text-white">
                  {t.title}
                </div>
                {t.message && (
                  <div className="mt-0.5 text-xs text-slate-400">
                    {t.message}
                  </div>
                )}
              </div>
              <button
                onClick={() => remove(t.id)}
                aria-label="Dismiss notification"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white/5 hover:text-white focus-visible:ring-2 focus-visible:ring-cyan-500"
              >
                ✕
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
