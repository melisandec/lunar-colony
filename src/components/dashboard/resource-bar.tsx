"use client";

import { useColony, useCollectEarnings } from "@/hooks/use-colony";
import { useGameStore } from "@/stores/game-store";
import { useUIStore } from "@/stores/ui-store";
import { motion, AnimatePresence } from "framer-motion";

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(0);
}

export function ResourceBar() {
  const { data: colony } = useColony();
  const fid = useGameStore((s) => s.fid);
  const collect = useCollectEarnings();
  const addToast = useUIStore((s) => s.addToast);

  if (!fid || !colony) return null;

  const handleCollect = async () => {
    try {
      const result = await collect.mutateAsync();
      if (result.collected > 0) {
        addToast({
          type: "success",
          title: "Collected!",
          message: `+${fmt(result.collected)} $LUNAR`,
          icon: "⚡",
        });
      } else {
        addToast({
          type: "info",
          title: "Nothing to collect",
          message: "Wait for your modules to produce more.",
          icon: "⏳",
        });
      }
    } catch {
      addToast({ type: "error", title: "Collection failed", icon: "❌" });
    }
  };

  return (
    <div className="flex h-12 items-center gap-2 border-b border-slate-800/40 bg-slate-950/60 px-3 backdrop-blur-md sm:gap-4 sm:px-5">
      {/* Balance */}
      <div className="flex items-center gap-1.5">
        <span className="text-sm">💰</span>
        <AnimatePresence mode="popLayout">
          <motion.span
            key={colony.lunarBalance}
            initial={{ y: -8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 8, opacity: 0 }}
            className="text-sm font-bold text-cyan-400 tabular-nums"
          >
            {fmt(colony.lunarBalance)}
          </motion.span>
        </AnimatePresence>
        <span className="hidden text-xs text-slate-500 sm:inline">$LUNAR</span>
      </div>

      {/* Divider */}
      <div className="h-5 w-px bg-slate-800" />

      {/* Production rate */}
      <div className="flex items-center gap-1.5">
        <span className="text-sm">⚡</span>
        <span className="text-xs font-medium text-emerald-400 tabular-nums">
          {fmt(colony.productionRate)}/tick
        </span>
      </div>

      {/* Divider */}
      <div className="h-5 w-px bg-slate-800" />

      {/* Modules */}
      <div className="hidden items-center gap-1.5 md:flex">
        <span className="text-sm">🏗️</span>
        <span className="text-xs text-slate-400">
          {colony.modules.length}/20
        </span>
      </div>

      {/* Level */}
      <div className="hidden items-center gap-1.5 md:flex">
        <span className="text-sm">⭐</span>
        <span className="text-xs text-amber-400">Lv.{colony.level}</span>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Pending earnings + collect */}
      {colony.pendingEarnings > 0 && (
        <button
          onClick={handleCollect}
          disabled={collect.isPending}
          className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 transition hover:bg-emerald-500/20 active:scale-95 disabled:opacity-50"
        >
          <span className="animate-pulse">⏳</span>+
          {fmt(colony.pendingEarnings)}
          <span className="hidden sm:inline">Collect</span>
        </button>
      )}

      {/* Player */}
      <div className="flex items-center gap-1.5 text-xs text-slate-500">
        <span>👨‍🚀</span>
        <span className="hidden sm:inline">{colony.playerName}</span>
      </div>
    </div>
  );
}
