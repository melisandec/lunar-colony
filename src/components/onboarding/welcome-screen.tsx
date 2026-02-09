"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useOnboardingStore } from "@/stores/onboarding-store";
import { useGameStore } from "@/stores/game-store";

// ---------------------------------------------------------------------------
// Phase 1: Welcome / Claim Screen (full-screen overlay)
// ---------------------------------------------------------------------------

const STARTER_MODULES = [
  { name: "Solar Array", icon: "⚡", status: "Online" },
  { name: "Regolith Processor", icon: "⛏️", status: "Online" },
  { name: "Habitat Module", icon: "🏠", status: "Online" },
  { name: "Transport Rover", icon: "🚀", status: "Ready" },
];

const STARTER_CREW = [
  { role: "Engineer", icon: "🔧" },
  { role: "Geologist", icon: "🪨" },
  { role: "Pilot", icon: "✈️" },
  { role: "Botanist", icon: "🌿" },
  { role: "Medic", icon: "🩺" },
];

export function WelcomeScreen() {
  const step = useOnboardingStore((s) => s.step);
  const nextStep = useOnboardingStore((s) => s.nextStep);
  const skipTutorial = useOnboardingStore((s) => s.skipTutorial);
  const colony = useGameStore((s) => s.colony);

  const isVisible = step === "WELCOME" || step === "CLAIM";

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.3 } }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/95 backdrop-blur-md"
        >
          {/* Stars background effect */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {Array.from({ length: 40 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute h-0.5 w-0.5 rounded-full bg-white"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                }}
                animate={{
                  opacity: [0.2, 0.8, 0.2],
                  scale: [1, 1.5, 1],
                }}
                transition={{
                  duration: 2 + Math.random() * 3,
                  repeat: Infinity,
                  delay: Math.random() * 2,
                }}
              />
            ))}
          </div>

          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: -10 }}
            transition={{ type: "spring", damping: 20 }}
            className="relative mx-4 w-full max-w-lg"
          >
            {step === "WELCOME" && (
              <WelcomeCard onNext={nextStep} onSkip={skipTutorial} />
            )}
            {step === "CLAIM" && (
              <ClaimCard
                onClaim={nextStep}
                onSkip={skipTutorial}
                modulesReady={!!colony && colony.modules.length > 0}
              />
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------
// Welcome Card (Phase 1a)
// ---------------------------------------------------------------------------

function WelcomeCard({
  onNext,
  onSkip,
}: {
  onNext: () => void;
  onSkip: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="rounded-3xl border border-cyan-500/20 bg-gradient-to-b from-slate-900 to-slate-950 p-8 shadow-2xl shadow-cyan-500/5"
    >
      {/* Moon glow */}
      <div className="mb-6 flex justify-center">
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 4, repeat: Infinity }}
          className="relative"
        >
          <div className="absolute inset-0 rounded-full bg-amber-500/20 blur-xl" />
          <span className="relative text-7xl">🌔</span>
        </motion.div>
      </div>

      <h1 className="mb-2 text-center text-2xl font-bold text-white">
        WELCOME TO LUNA INCORPORATED!
      </h1>
      <p className="mb-6 text-center text-sm text-slate-400">
        The Moon awaits its newest Commander. Build your colony, manage
        resources, and establish the most prosperous lunar outpost.
      </p>

      {/* Quick facts */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        <Stat icon="🏗️" label="4 Modules" sub="ready to deploy" />
        <Stat icon="💰" label="500 $LUNAR" sub="starting balance" />
        <Stat icon="👨‍🚀" label="5 Crew" sub="specialists" />
      </div>

      <button
        onClick={onNext}
        className="glow-cyan w-full rounded-xl bg-cyan-600 py-3.5 text-base font-bold text-white transition hover:bg-cyan-500 active:scale-[0.98]"
      >
        Let&apos;s Get Started →
      </button>

      <button
        onClick={onSkip}
        className="mt-3 w-full py-2 text-center text-xs text-slate-600 transition hover:text-slate-400"
      >
        Skip tutorial — I know what I&apos;m doing
      </button>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Claim Card (Phase 1b) — starter package reveal
// ---------------------------------------------------------------------------

function ClaimCard({
  onClaim,
  onSkip,
  modulesReady,
}: {
  onClaim: () => void;
  onSkip: () => void;
  modulesReady: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="rounded-3xl border border-amber-500/20 bg-gradient-to-b from-slate-900 to-slate-950 p-8 shadow-2xl shadow-amber-500/5"
    >
      <div className="mb-4 text-center">
        <span className="text-4xl">🎁</span>
        <h2 className="mt-2 text-xl font-bold text-white">
          YOUR STARTER COLONY
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Everything you need to begin your lunar journey
        </p>
      </div>

      {/* Module list with stagger */}
      <div className="mb-4 space-y-2">
        {STARTER_MODULES.map((mod, i) => (
          <motion.div
            key={mod.name}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 + i * 0.12 }}
            className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-800/30 px-4 py-2.5"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">{mod.icon}</span>
              <span className="text-sm font-medium text-white">{mod.name}</span>
            </div>
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 + i * 0.12 }}
              className="text-xs font-medium text-emerald-400"
            >
              ✓ {mod.status}
            </motion.span>
          </motion.div>
        ))}
      </div>

      {/* Crew preview */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="mb-4 rounded-lg border border-slate-800 bg-slate-800/20 p-3"
      >
        <div className="mb-2 text-xs font-medium text-slate-500">
          👨‍🚀 YOUR CREW
        </div>
        <div className="flex gap-3 justify-center">
          {STARTER_CREW.map((crew, i) => (
            <motion.div
              key={crew.role}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 + i * 0.08 }}
              className="flex flex-col items-center"
              title={crew.role}
            >
              <span className="text-xl">{crew.icon}</span>
              <span className="mt-0.5 text-[9px] text-slate-500">
                {crew.role}
              </span>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Balance */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.0 }}
        className="mb-6 flex items-center justify-between rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3"
      >
        <span className="text-sm text-slate-300">Starting Balance</span>
        <span className="text-lg font-bold tabular-nums text-amber-400">
          💰 500 $LUNAR
        </span>
      </motion.div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2 }}
      >
        <button
          onClick={onClaim}
          className="glow-amber w-full rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 py-3.5 text-base font-bold text-white transition hover:from-amber-500 hover:to-orange-500 active:scale-[0.98]"
        >
          {modulesReady ? "CLAIM & BEGIN" : "Preparing Colony…"}
        </button>
      </motion.div>

      <button
        onClick={onSkip}
        className="mt-3 w-full py-2 text-center text-xs text-slate-600 transition hover:text-slate-400"
      >
        Skip tutorial
      </button>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Stat({
  icon,
  label,
  sub,
}: {
  icon: string;
  label: string;
  sub: string;
}) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-800/30 p-2.5 text-center">
      <span className="text-lg">{icon}</span>
      <div className="mt-1 text-sm font-bold text-white">{label}</div>
      <div className="text-[10px] text-slate-500">{sub}</div>
    </div>
  );
}
