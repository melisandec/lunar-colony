"use client";

import { useColony, useCollectEarnings } from "@/hooks/use-colony";
import { useGameStore } from "@/stores/game-store";
import { useUIStore } from "@/stores/ui-store";
import { motion, AnimatePresence } from "framer-motion";
import { useFeedback } from "@/hooks/use-feedback";
import { useIsMobile } from "@/hooks/use-device";
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
  const isMobile = useIsMobile();
  const [coinTrigger, setCoinTrigger] = useState(0);
  const [lastCollected, setLastCollected] = useState(0);
  const [expanded, setExpanded] = useState(false);

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

  const hasPending = colony.pendingEarnings > 0;
  const showCompact = isMobile && !expanded;

  return (
    <div
      data-tutorial="resource-bar"
      role="region"
      aria-label={`Colony resources: ${fmt(colony.lunarBalance)} LUNAR balance, ${fmt(colony.productionRate)} per tick production, Level ${colony.level}`}
      className="flex min-h-[44px] flex-col gap-1 border-b border-slate-800/40 bg-slate-950/60 px-3 backdrop-blur-md sm:flex-row sm:items-center sm:gap-4 sm:px-5"
      style={{ paddingTop: "max(env(safe-area-inset-top, 0px), 8px)" }}
    >
      <div className="flex h-12 min-h-[44px] items-center gap-2 sm:gap-4">
        {/* Balance — always visible, min 44px touch target */}
        <div
          className="flex min-w-[44px] min-h-[44px] items-center justify-center gap-1.5 rounded-lg hover:bg-slate-800/30 sm:min-w-0 sm:min-h-0 sm:justify-start"
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
        <div className="hidden h-5 w-px bg-slate-800 sm:block" aria-hidden="true" />

        {/* Production rate — always on desktop, on mobile when expanded */}
        <div
          className={`items-center gap-1.5 ${showCompact ? "hidden" : "flex"}`}
          aria-label={`Production: ${fmt(colony.productionRate)} per tick`}
        >
          <span className="text-sm" aria-hidden="true">⚡</span>
          <span className="text-xs font-medium text-emerald-400 tabular-nums">
            {fmt(colony.productionRate)}/tick
          </span>
        </div>
        <div className={`h-5 w-px bg-slate-800 ${showCompact ? "hidden" : "block"}`} aria-hidden="true" />

        {/* Mobile expand toggle — tap to show more */}
        {isMobile && (
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="flex min-w-[44px] min-h-[44px] items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-800/30 hover:text-slate-300 sm:hidden"
            aria-expanded={expanded ? "true" : "false"}
            aria-label={expanded ? "Hide details" : "Show production and stats"}
          >
            {expanded ? "▲" : "▼"}
          </button>
        )}

        {/* Modules, level, tick — visible when expanded (mobile) or always (desktop) */}
        {!showCompact && (
          <>
            <div
              className="flex items-center gap-1.5"
              aria-label={`${colony.modules.length} of 20 modules`}
            >
              <span className="text-sm" aria-hidden="true">🏗️</span>
              <span className="text-xs text-slate-400">{colony.modules.length}/20</span>
            </div>
            <div
              className="hidden items-center gap-1.5 lg:flex"
              aria-label={`Level ${colony.level}, ${colony.xp ?? 0} of ${colony.xpForNextLevel ?? 100} XP`}
            >
              <span className="text-sm" aria-hidden="true">⭐</span>
              <span className="text-xs text-amber-400">Lv.{colony.level}</span>
              {colony.xpForNextLevel && (
                <div className="flex items-center gap-1">
                  <div className="h-1.5 w-12 rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-amber-500 transition-all"
                      style={{
                        width: `${Math.min(100, ((colony.xp ?? 0) / colony.xpForNextLevel) * 100)}%`,
                      }}
                    />
                  </div>
                  <span className="text-[9px] text-slate-600 tabular-nums">
                    {colony.xp ?? 0}/{colony.xpForNextLevel}
                  </span>
                </div>
              )}
            </div>
            <div className="hidden h-5 w-px bg-slate-800 lg:block" aria-hidden="true" />
            <div className="hidden items-center gap-1.5 lg:flex">
              <TickCountdown size={28} />
            </div>
            <div className="hidden items-center gap-1 lg:flex">
              <StatusDot
                status={
                  colony.efficiency >= 80 ? "active" : colony.efficiency >= 50 ? "warning" : "critical"
                }
                size={6}
              />
              <span className="text-xs text-slate-500">{colony.efficiency}% eff</span>
            </div>
          </>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Pending earnings + collect — with "Pending" label and glow */}
        {hasPending && (
          <div className="relative flex min-w-[44px] min-h-[44px] items-center">
            <CoinFlip trigger={coinTrigger} amount={lastCollected} />
            <motion.button
              onClick={handleCollect}
              disabled={collect.isPending}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.94 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              aria-label={`Collect ${fmt(colony.pendingEarnings)} pending LUNAR earnings`}
              className="flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-0.5 rounded-lg px-3 py-2 text-xs font-semibold text-emerald-400 transition-colors hover:bg-emerald-500/20 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-cyan-500
                border border-emerald-500/30 bg-emerald-500/15 shadow-[0_0_12px_rgba(16,185,129,0.15)]"
            >
              {collect.isPending ? (
                <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
                </svg>
              ) : (
                <span className="animate-pulse" aria-hidden="true">⏳</span>
              )}
              <span>+{fmt(colony.pendingEarnings)}</span>
              <span className="text-[9px] font-medium text-emerald-500/80">Collect</span>
            </motion.button>
          </div>
        )}

        {/* Player */}
        <div
          className="flex min-w-[44px] min-h-[44px] items-center justify-center gap-1.5 rounded-lg text-xs text-slate-500 transition hover:bg-slate-800/30 sm:min-w-0 sm:min-h-0"
          aria-label={`Player: ${colony.playerName}`}
        >
          <span aria-hidden="true">👨‍🚀</span>
          <span className="hidden sm:inline">{colony.playerName}</span>
        </div>
      </div>
    </div>
  );
}
