"use client";

import { useUIStore, type Toast } from "@/stores/ui-store";
import { motion, AnimatePresence } from "framer-motion";

const TYPE_STYLES: Record<Toast["type"], { bg: string; border: string }> = {
  success: { bg: "bg-emerald-500/10", border: "border-emerald-500/30" },
  error: { bg: "bg-red-500/10", border: "border-red-500/30" },
  warning: { bg: "bg-amber-500/10", border: "border-amber-500/30" },
  info: { bg: "bg-cyan-500/10", border: "border-cyan-500/30" },
};

export function ToastProvider() {
  const toasts = useUIStore((s) => s.toasts);
  const remove = useUIStore((s) => s.removeToast);

  return (
    <div className="pointer-events-none fixed right-4 top-16 z-[100] flex flex-col gap-2">
      <AnimatePresence>
        {toasts.map((t) => {
          const styles = TYPE_STYLES[t.type];
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 60, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 60, scale: 0.95 }}
              transition={{ duration: 0.25 }}
              className={`pointer-events-auto flex items-start gap-3 rounded-xl border ${styles.border} ${styles.bg} px-4 py-3 shadow-2xl backdrop-blur-lg`}
              style={{ minWidth: 260, maxWidth: 360 }}
            >
              {t.icon && <span className="text-lg">{t.icon}</span>}
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
                className="text-slate-500 transition hover:text-white"
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
