"use client";

import { useColony, useCollectEarnings } from "@/hooks/use-colony";
import { useGameStore } from "@/stores/game-store";
import { useUIStore } from "@/stores/ui-store";
import { motion, AnimatePresence } from "framer-motion";
import { useFeedback } from "@/hooks/use-feedback";
import { CoinFlip } from "@/components/microinteractions/coin-flip";
import { TickCountdown } from "@/components/visualizations/live-displays";
import { StatusDot } from "@/components/visualizations/status-indicators";
import { useState } from "react";

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
  const fb = useFeedback();
  const [coinTrigger, setCoinTrigger] = useState(0);
  const [lastCollected, setLastCollected] = useState(0);

  if (!fid || !colony) return null;

  const handleCollect = async () => {
    try {
      const result = await collect.mutateAsync();
      if (result.collected > 0) {
        fb.collect();
        setLastCollected(result.collected);
        setCoinTrigger((p) => p + 1);
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
      fb.error();
      addToast({ type: "error", title: "Collection failed", icon: "❌" });
    }
  };

  return (
    <div
      data-tutorial="resource-bar"
      role="region"
      aria-label={`Colony resources: ${fmt(colony.lunarBalance)} LUNAR balance, ${fmt(colony.productionRate)} per tick production, Level ${colony.level}`}
      className="flex h-12 items-center gap-2 border-b border-slate-800/40 bg-slate-950/60 px-3 backdrop-blur-md sm:gap-4 sm:px-5"
    >
      {/* Balance */}
      <div
        className="flex items-center gap-1.5"
        aria-label={`Balance: ${fmt(colony.lunarBalance)} LUNAR`}
      >
        <span className="text-sm" aria-hidden="true">
          💰
        </span>
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
      <div className="h-5 w-px bg-slate-800" aria-hidden="true" />

      {/* Production rate */}
      <div
        className="flex items-center gap-1.5"
        aria-label={`Production: ${fmt(colony.productionRate)} per tick`}
      >
        <span className="text-sm" aria-hidden="true">
          ⚡
        </span>
        <span className="text-xs font-medium text-emerald-400 tabular-nums">
          {fmt(colony.productionRate)}/tick
        </span>
      </div>

      {/* Divider */}
      <div className="h-5 w-px bg-slate-800" aria-hidden="true" />

      {/* Modules */}
      <div
        className="hidden items-center gap-1.5 md:flex"
        aria-label={`${colony.modules.length} of 20 modules`}
      >
        <span className="text-sm" aria-hidden="true">
          🏗️
        </span>
        <span className="text-xs text-slate-400">
          {colony.modules.length}/20
        </span>
      </div>

      {/* Level */}
      <div
        className="hidden items-center gap-1.5 md:flex"
        aria-label={`Level ${colony.level}`}
      >
        <span className="text-sm" aria-hidden="true">
          ⭐
        </span>
        <span className="text-xs text-amber-400">Lv.{colony.level}</span>
      </div>

      {/* Divider */}
      <div
        className="hidden h-5 w-px bg-slate-800 md:block"
        aria-hidden="true"
      />

      {/* Tick Countdown */}
      <div className="hidden items-center gap-1.5 md:flex">
        <TickCountdown size={28} />
      </div>

      {/* Colony Status */}
      <div className="hidden items-center gap-1 md:flex">
        <StatusDot
          status={
            colony.efficiency >= 80
              ? "active"
              : colony.efficiency >= 50
                ? "warning"
                : "critical"
          }
          size={6}
        />
        <span className="text-xs text-slate-500">{colony.efficiency}% eff</span>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Pending earnings + collect */}
      {colony.pendingEarnings > 0 && (
        <div className="relative">
          <CoinFlip trigger={coinTrigger} amount={lastCollected} />
          <motion.button
            onClick={handleCollect}
            disabled={collect.isPending}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.94 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            aria-label={`Collect ${fmt(colony.pendingEarnings)} pending LUNAR earnings`}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 transition-colors hover:bg-emerald-500/20 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-cyan-500"
            style={{ minHeight: 60, minWidth: 60 }}
          >
            {collect.isPending ? (
              <svg
                className="h-3.5 w-3.5 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="3"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z"
                />
              </svg>
            ) : (
              <span className="animate-pulse" aria-hidden="true">
                ⏳
              </span>
            )}
            +{fmt(colony.pendingEarnings)}
            <span className="hidden sm:inline">Collect</span>
          </motion.button>
        </div>
      )}

      {/* Player */}
      <div
        className="flex items-center gap-1.5 text-xs text-slate-500"
        aria-label={`Player: ${colony.playerName}`}
      >
        <span aria-hidden="true">👨‍🚀</span>
        <span className="hidden sm:inline">{colony.playerName}</span>
      </div>
    </div>
  );
}
