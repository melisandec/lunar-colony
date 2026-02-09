"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

// ---------------------------------------------------------------------------
// Tutorial Step Definitions
// ---------------------------------------------------------------------------

/**
 * The tutorial is a linear state machine:
 *
 *  IDLE → WELCOME → CLAIM → MODULE_PLACEMENT → FIRST_PRODUCTION
 *       → CREW_ASSIGNMENT → MARKET_INTRO → COMPLETED
 *
 * Each step has metadata consumed by the overlay UI.
 * Players can skip at any point, which jumps to COMPLETED.
 */

export const TUTORIAL_STEPS = [
  "IDLE",
  "WELCOME",
  "CLAIM",
  "MODULE_PLACEMENT",
  "FIRST_PRODUCTION",
  "CREW_ASSIGNMENT",
  "MARKET_INTRO",
  "COMPLETED",
] as const;

export type TutorialStep = (typeof TUTORIAL_STEPS)[number];

export interface StepMeta {
  title: string;
  description: string;
  icon: string;
  /** Which dashboard route this step is best shown on */
  route: string;
  /** Optional element selector to spotlight */
  spotlightSelector?: string;
  /** CTA button label */
  cta: string;
  /** Index into TUTORIAL_STEPS (for progress bar) */
  index: number;
}

export const STEP_META: Record<
  Exclude<TutorialStep, "IDLE" | "COMPLETED">,
  StepMeta
> = {
  WELCOME: {
    title: "Welcome to Luna Incorporated!",
    description:
      "You've been appointed as the new Commander of a Lunar colony. Your mission: build, produce, trade, and grow your outpost into a thriving settlement.",
    icon: "🌔",
    route: "/dashboard/colony",
    cta: "Let's Get Started →",
    index: 0,
  },
  CLAIM: {
    title: "Your Starter Colony",
    description:
      "Every new Commander receives a starter package: 4 modules, 500 $LUNAR, and a team of specialists. Claim them now!",
    icon: "🎁",
    route: "/dashboard/colony",
    cta: "Claim & Begin",
    index: 1,
  },
  MODULE_PLACEMENT: {
    title: "Place Your Modules",
    description:
      "Drag modules to rearrange them on the 5×4 grid. Click an empty slot to build something new. Adjacent modules of the same type get an efficiency bonus!",
    icon: "🗺️",
    route: "/dashboard/colony",
    spotlightSelector: "[data-tutorial='grid']",
    cta: "Got It →",
    index: 2,
  },
  FIRST_PRODUCTION: {
    title: "Your First Production Cycle",
    description:
      "Modules constantly produce $LUNAR. See your earnings accumulate in the resource bar, then hit Collect (or press Space) to bank them.",
    icon: "⚡",
    route: "/dashboard/colony",
    spotlightSelector: "[data-tutorial='resource-bar']",
    cta: "Continue →",
    index: 3,
  },
  CREW_ASSIGNMENT: {
    title: "Meet Your Crew",
    description:
      "Each specialist has unique skills. Assign them to matching modules for bonus output. Click a module and use the Assign button.",
    icon: "👨‍🚀",
    route: "/dashboard/colony",
    spotlightSelector: "[data-tutorial='detail-panel']",
    cta: "Next →",
    index: 4,
  },
  MARKET_INTRO: {
    title: "The Lunar Market",
    description:
      "Trade resources with other Commanders. Prices fluctuate based on supply & demand — buy low, sell high! Check the Market Terminal for live prices.",
    icon: "📈",
    route: "/dashboard/market",
    cta: "Finish Tutorial",
    index: 5,
  },
};

/** Total interactive tutorial steps (excluding IDLE/COMPLETED) */
export const TOTAL_TUTORIAL_STEPS = Object.keys(STEP_META).length; // 6

// ---------------------------------------------------------------------------
// Pro-tips shown progressively after tutorial
// ---------------------------------------------------------------------------

export interface ProTip {
  id: string;
  title: string;
  body: string;
  icon: string;
  /** Minimum player level to unlock this tip */
  minLevel: number;
  /** Which page context shows the tip */
  page: string;
}

export const PRO_TIPS: ProTip[] = [
  {
    id: "adjacency",
    title: "Adjacency Bonus",
    body: "Place two modules of the same type next to each other for a +10% efficiency boost.",
    icon: "🧩",
    minLevel: 1,
    page: "colony",
  },
  {
    id: "collect-often",
    title: "Collect Frequently",
    body: "Production caps at 24 hours of uncollected earnings. Visit regularly!",
    icon: "⏰",
    minLevel: 1,
    page: "colony",
  },
  {
    id: "market-timing",
    title: "Market Timing",
    body: "Resource prices update every 15 minutes. Watch for patterns before making big trades.",
    icon: "📊",
    minLevel: 2,
    page: "market",
  },
  {
    id: "crew-specialty",
    title: "Specialty Match",
    body: "Crew members assigned to matching module types get a 2× efficiency bonus.",
    icon: "🎯",
    minLevel: 2,
    page: "colony",
  },
  {
    id: "tier-upgrade",
    title: "Tier Upgrades",
    body: "Higher tier modules produce more but cost exponentially more. Check the Research tree for unlock requirements.",
    icon: "⬆️",
    minLevel: 3,
    page: "research",
  },
  {
    id: "alliance-bonus",
    title: "Alliance Power",
    body: "Alliance members share a +5% production bonus per active member. Strength in numbers!",
    icon: "🤝",
    minLevel: 4,
    page: "alliance",
  },
  {
    id: "keyboard-shortcuts",
    title: "Keyboard Shortcuts",
    body: "Press Space to collect, B to build, M for market, R for research. Escape closes any panel.",
    icon: "⌨️",
    minLevel: 1,
    page: "colony",
  },
  {
    id: "daily-streak",
    title: "Daily Streak",
    body: "Visiting every day increases your streak bonus. Don't break the chain!",
    icon: "🔥",
    minLevel: 2,
    page: "colony",
  },
];

// ---------------------------------------------------------------------------
// Onboarding Store
// ---------------------------------------------------------------------------

interface OnboardingState {
  /** Current tutorial step */
  step: TutorialStep;
  /** Whether the tutorial has been completed at least once */
  hasCompletedTutorial: boolean;
  /** Set of dismissed pro-tip IDs */
  dismissedTips: string[];
  /** Last visit timestamp (for welcome-back detection) */
  lastVisitAt: number | null;
  /** Number of total sessions (visits) */
  sessionCount: number;
  /** Whether to show the welcome-back modal this session */
  showWelcomeBack: boolean;
  /** Highest player level seen (for progressive tip unlock) */
  maxLevelSeen: number;

  // Actions
  /** Start the tutorial from the beginning */
  startTutorial: () => void;
  /** Advance to the next tutorial step */
  nextStep: () => void;
  /** Jump to a specific step */
  goToStep: (step: TutorialStep) => void;
  /** Skip the entire tutorial */
  skipTutorial: () => void;
  /** Dismiss a pro-tip */
  dismissTip: (tipId: string) => void;
  /** Record a new session visit */
  recordVisit: () => void;
  /** Dismiss the welcome-back modal */
  dismissWelcomeBack: () => void;
  /** Update max level seen */
  updateMaxLevel: (level: number) => void;
  /** Reset onboarding (dev/debug) */
  resetOnboarding: () => void;
}

const WELCOME_BACK_THRESHOLD_MS = 4 * 60 * 60 * 1000; // 4 hours

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      step: "IDLE",
      hasCompletedTutorial: false,
      dismissedTips: [],
      lastVisitAt: null,
      sessionCount: 0,
      showWelcomeBack: false,
      maxLevelSeen: 1,

      startTutorial: () => set({ step: "WELCOME" }),

      nextStep: () => {
        const current = get().step;
        const idx = TUTORIAL_STEPS.indexOf(current);
        if (idx < 0 || idx >= TUTORIAL_STEPS.length - 1) {
          // Already completed or invalid
          set({ step: "COMPLETED", hasCompletedTutorial: true });
          return;
        }
        const next = TUTORIAL_STEPS[idx + 1]!;
        if (next === "COMPLETED") {
          set({ step: "COMPLETED", hasCompletedTutorial: true });
        } else {
          set({ step: next });
        }
      },

      goToStep: (step) => {
        set({ step });
        if (step === "COMPLETED") {
          set({ hasCompletedTutorial: true });
        }
      },

      skipTutorial: () =>
        set({ step: "COMPLETED", hasCompletedTutorial: true }),

      dismissTip: (tipId) =>
        set((s) => ({
          dismissedTips: [...new Set([...s.dismissedTips, tipId])],
        })),

      recordVisit: () => {
        const { lastVisitAt, sessionCount, hasCompletedTutorial } = get();
        const now = Date.now();
        const isReturning =
          lastVisitAt !== null &&
          now - lastVisitAt > WELCOME_BACK_THRESHOLD_MS &&
          hasCompletedTutorial;

        set({
          lastVisitAt: now,
          sessionCount: sessionCount + 1,
          showWelcomeBack: isReturning,
          // Auto-start tutorial for brand-new users
          step:
            !hasCompletedTutorial && sessionCount === 0
              ? "WELCOME"
              : get().step,
        });
      },

      dismissWelcomeBack: () => set({ showWelcomeBack: false }),

      updateMaxLevel: (level) => {
        if (level > get().maxLevelSeen) {
          set({ maxLevelSeen: level });
        }
      },

      resetOnboarding: () =>
        set({
          step: "IDLE",
          hasCompletedTutorial: false,
          dismissedTips: [],
          lastVisitAt: null,
          sessionCount: 0,
          showWelcomeBack: false,
          maxLevelSeen: 1,
        }),
    }),
    {
      name: "lunar-colony-onboarding",
      partialize: (state) => ({
        step: state.step,
        hasCompletedTutorial: state.hasCompletedTutorial,
        dismissedTips: state.dismissedTips,
        lastVisitAt: state.lastVisitAt,
        sessionCount: state.sessionCount,
        maxLevelSeen: state.maxLevelSeen,
      }),
    },
  ),
);
