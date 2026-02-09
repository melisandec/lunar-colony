"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useOnboardingStore } from "@/stores/onboarding-store";
import { useGameStore } from "@/stores/game-store";

// ---------------------------------------------------------------------------
// Welcome Back Modal — shown when returning after ≥ 4 hours
// ---------------------------------------------------------------------------

export function WelcomeBackModal() {
  const show = useOnboardingStore((s) => s.showWelcomeBack);
  const dismiss = useOnboardingStore((s) => s.dismissWelcomeBack);
  const sessionCount = useOnboardingStore((s) => s.sessionCount);
  const lastVisitAt = useOnboardingStore((s) => s.lastVisitAt);
  const colony = useGameStore((s) => s.colony);

  const summary = useMemo(() => {
    if (!colony) return null;
    return {
      balance: Math.floor(colony.lunarBalance),
      modules: colony.modules.length,
      activeModules: colony.modules.filter((m) => m.isActive).length,
      pending: Math.floor(colony.pendingEarnings),
      level: colony.level,
      streak: colony.dailyStreak,
    };
  }, [colony]);

  const hoursAway = useMemo(() => {
    if (!lastVisitAt) return 0;
    return Math.round((Date.now() - lastVisitAt) / (60 * 60 * 1000));
  }, [lastVisitAt]);

  // Pick a contextual greeting based on time away
  const greeting = useMemo(() => {
    if (hoursAway >= 48)
      return { text: "Long time no see, Commander!", emoji: "👋" };
    if (hoursAway >= 24)
      return { text: "Welcome back, Commander!", emoji: "🌙" };
    return { text: "Good to see you again!", emoji: "🫡" };
  }, [hoursAway]);

  return (
    <AnimatePresence>
      {show && summary && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.2 } }}
          role="dialog"
          aria-modal="true"
          aria-label="Welcome back"
          className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-950/80 backdrop-blur-md"
          onClick={dismiss}
        >
          <motion.div
            initial={{ scale: 0.92, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 10 }}
            transition={{ type: "spring", damping: 22, stiffness: 280 }}
            onClick={(e) => e.stopPropagation()}
            className="mx-4 w-full max-w-md rounded-2xl border border-cyan-500/15 bg-gradient-to-b from-slate-900 to-slate-950 p-6 shadow-2xl"
          >
            {/* Greeting */}
            <div className="mb-4 text-center">
              <motion.span
                animate={{ rotate: [0, 15, -15, 0] }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="mb-2 block text-4xl"
              >
                {greeting.emoji}
              </motion.span>
              <h2 className="text-xl font-bold text-white">{greeting.text}</h2>
              {hoursAway > 0 && (
                <p className="mt-1 text-sm text-slate-400">
                  You&apos;ve been away for ~{hoursAway}h
                  {sessionCount > 1 && ` · Visit #${sessionCount}`}
                </p>
              )}
            </div>

            {/* Colony status cards */}
            <div className="mb-4 grid grid-cols-2 gap-2">
              <StatusCard
                icon="💰"
                label="Balance"
                value={`${summary.balance.toLocaleString()} $L`}
              />
              <StatusCard
                icon="⚡"
                label="Pending"
                value={`+${summary.pending.toLocaleString()} $L`}
                highlight={summary.pending > 0}
              />
              <StatusCard
                icon="🏗️"
                label="Modules"
                value={`${summary.activeModules}/${summary.modules} active`}
              />
              <StatusCard icon="⭐" label="Level" value={`${summary.level}`} />
            </div>

            {/* Streak */}
            {summary.streak > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="mb-4 flex items-center justify-center gap-2 rounded-lg border border-orange-500/20 bg-orange-500/5 py-2"
              >
                <span className="text-lg">🔥</span>
                <span className="text-sm font-semibold text-orange-400">
                  {summary.streak}-day streak!
                </span>
                <span className="text-xs text-slate-500">Keep it up!</span>
              </motion.div>
            )}

            {/* Pending earnings CTA */}
            {summary.pending > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="mb-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-center"
              >
                <p className="text-sm text-emerald-400">
                  💰 You have{" "}
                  <span className="font-bold">
                    {summary.pending.toLocaleString()} $LUNAR
                  </span>{" "}
                  ready to collect!
                </p>
              </motion.div>
            )}

            {/* CTA */}
            <button
              onClick={dismiss}
              className="glow-cyan w-full rounded-xl bg-cyan-600 py-3 text-sm font-bold text-white transition hover:bg-cyan-500 active:scale-[0.98] min-h-[48px] focus-visible:ring-2 focus-visible:ring-cyan-500"
            >
              {summary.pending > 0 ? "Collect & Continue" : "Enter Colony"}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------
// Sub-component
// ---------------------------------------------------------------------------

function StatusCard({
  icon,
  label,
  value,
  highlight,
}: {
  icon: string;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-2.5 ${
        highlight
          ? "border-emerald-500/20 bg-emerald-500/5"
          : "border-slate-800 bg-slate-800/30"
      }`}
    >
      <div className="text-xs text-slate-500">
        {icon} {label}
      </div>
      <div
        className={`mt-0.5 text-sm font-bold tabular-nums ${
          highlight ? "text-emerald-400" : "text-white"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
