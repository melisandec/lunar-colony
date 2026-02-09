"use client";

import { useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import {
  useOnboardingStore,
  STEP_META,
  TOTAL_TUTORIAL_STEPS,
  type TutorialStep,
} from "@/stores/onboarding-store";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard";

// ---------------------------------------------------------------------------
// Tutorial Overlay — floating coach-mark panel
// ---------------------------------------------------------------------------

/** Steps that display the coach-mark overlay (not the full-screen welcome) */
const COACH_STEPS: TutorialStep[] = [
  "MODULE_PLACEMENT",
  "FIRST_PRODUCTION",
  "CREW_ASSIGNMENT",
  "MARKET_INTRO",
];

export function TutorialOverlay() {
  const step = useOnboardingStore((s) => s.step);
  const nextStep = useOnboardingStore((s) => s.nextStep);
  const skipTutorial = useOnboardingStore((s) => s.skipTutorial);
  const pathname = usePathname();
  const router = useRouter();

  const isActive = COACH_STEPS.includes(step);
  const meta = isActive ? STEP_META[step as keyof typeof STEP_META] : null;

  // Auto-navigate to the correct page for the current step
  useEffect(() => {
    if (meta && pathname !== meta.route) {
      router.push(meta.route);
    }
  }, [meta, pathname, router]);

  // Keyboard: Enter advances, Escape skips
  useKeyboardShortcuts([
    {
      key: "Enter",
      handler: () => {
        if (isActive) nextStep();
      },
      description: "Advance tutorial",
    },
    {
      key: "Escape",
      handler: () => {
        if (isActive) skipTutorial();
      },
      description: "Skip tutorial",
    },
  ]);

  if (!isActive || !meta) return null;

  const progress = ((meta.index + 1) / TOTAL_TUTORIAL_STEPS) * 100;

  return (
    <>
      {/* Spotlight on target element */}
      <SpotlightMask selector={meta.spotlightSelector} />

      {/* Coach card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.97 }}
          transition={{ type: "spring", damping: 24, stiffness: 300 }}
          className="fixed bottom-24 left-4 right-4 z-[90] mx-auto max-w-md lg:bottom-8 lg:left-auto lg:right-8"
        >
          <div className="rounded-2xl border border-cyan-500/20 bg-slate-900/95 shadow-2xl shadow-cyan-500/5 backdrop-blur-lg">
            {/* Progress bar */}
            <div className="h-1 overflow-hidden rounded-t-2xl bg-slate-800">
              <motion.div
                className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500"
                initial={{
                  width: `${(meta.index / TOTAL_TUTORIAL_STEPS) * 100}%`,
                }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>

            <div className="p-5">
              {/* Header */}
              <div className="mb-3 flex items-center gap-3">
                <motion.span
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="text-3xl"
                >
                  {meta.icon}
                </motion.span>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {meta.title}
                  </h3>
                  <span className="text-[10px] uppercase tracking-wider text-slate-500">
                    Step {meta.index + 1} of {TOTAL_TUTORIAL_STEPS}
                  </span>
                </div>
              </div>

              {/* Body */}
              <p className="mb-4 text-sm leading-relaxed text-slate-300">
                {meta.description}
              </p>

              {/* Actions */}
              <div className="flex items-center justify-between">
                <button
                  onClick={skipTutorial}
                  aria-label="Skip tutorial"
                  className="text-xs text-slate-600 transition hover:text-slate-400 min-h-[44px] min-w-[44px] flex items-center focus-visible:ring-2 focus-visible:ring-cyan-500 rounded-lg px-2"
                >
                  Skip tutorial
                </button>
                <button
                  onClick={nextStep}
                  className="rounded-lg bg-cyan-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-cyan-500 active:scale-[0.97] min-h-[44px] focus-visible:ring-2 focus-visible:ring-cyan-500"
                >
                  {meta.cta}
                </button>
              </div>

              {/* Keyboard hint */}
              <div className="mt-3 flex items-center justify-center gap-3 text-[10px] text-slate-600">
                <span>
                  <kbd className="rounded border border-slate-700 bg-slate-800 px-1 py-0.5 font-mono text-[9px]">
                    Enter
                  </kbd>{" "}
                  Next
                </span>
                <span>
                  <kbd className="rounded border border-slate-700 bg-slate-800 px-1 py-0.5 font-mono text-[9px]">
                    Esc
                  </kbd>{" "}
                  Skip
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </>
  );
}

// ---------------------------------------------------------------------------
// Spotlight mask — darkens everything except the target element
// ---------------------------------------------------------------------------

function SpotlightMask({ selector }: { selector?: string }) {
  const rect = useElementRect(selector);

  if (!selector || !rect) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="pointer-events-none fixed inset-0 z-[80]"
    >
      {/* Semi-transparent overlay with a cutout */}
      <svg className="h-full w-full">
        <defs>
          <mask id="spotlight-mask">
            <rect width="100%" height="100%" fill="white" />
            <motion.rect
              x={rect.x - 8}
              y={rect.y - 8}
              width={rect.width + 16}
              height={rect.height + 16}
              rx={12}
              fill="black"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            />
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(2, 6, 23, 0.6)"
          mask="url(#spotlight-mask)"
        />
        {/* Glow ring around target */}
        <motion.rect
          x={rect.x - 8}
          y={rect.y - 8}
          width={rect.width + 16}
          height={rect.height + 16}
          rx={12}
          fill="none"
          stroke="rgba(6,182,212,0.3)"
          strokeWidth={2}
          animate={{
            strokeOpacity: [0.3, 0.6, 0.3],
          }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </svg>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Hook: track an element's bounding rect
// ---------------------------------------------------------------------------

function useElementRect(selector?: string) {
  const rect = useMemo(() => {
    if (!selector || typeof document === "undefined") return null;
    const el = document.querySelector(selector);
    if (!el) return null;
    return el.getBoundingClientRect();
  }, [selector]);

  return rect;
}
