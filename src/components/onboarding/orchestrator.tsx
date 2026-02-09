"use client";

import { useEffect, useRef } from "react";
import { useOnboardingStore } from "@/stores/onboarding-store";
import { useGameStore } from "@/stores/game-store";
import { WelcomeScreen } from "./welcome-screen";
import { TutorialOverlay } from "./tutorial-overlay";
import { ProTipProvider } from "./pro-tips";
import { WelcomeBackModal } from "./welcome-back";

// ---------------------------------------------------------------------------
// Onboarding Orchestrator
//
// Single component that wires up all onboarding subsystems:
// 1. Records each visit (triggers welcome-back detection & auto-start)
// 2. Syncs maxLevelSeen from colony data
// 3. Renders all onboarding overlay layers in correct stacking order
// ---------------------------------------------------------------------------

export function OnboardingOrchestrator() {
  const fid = useGameStore((s) => s.fid);
  const colony = useGameStore((s) => s.colony);
  const recordVisit = useOnboardingStore((s) => s.recordVisit);
  const updateMaxLevel = useOnboardingStore((s) => s.updateMaxLevel);
  const hasRecorded = useRef(false);

  // Record a session visit once per mount (when fid is available)
  useEffect(() => {
    if (fid && !hasRecorded.current) {
      hasRecorded.current = true;
      recordVisit();
    }
  }, [fid, recordVisit]);

  // Sync max player level whenever colony data changes
  useEffect(() => {
    if (colony?.level) {
      updateMaxLevel(colony.level);
    }
  }, [colony?.level, updateMaxLevel]);

  // Don't render overlays until a player is loaded
  if (!fid) return null;

  return (
    <>
      {/* Phase 1: Full-screen welcome / claim */}
      <WelcomeScreen />

      {/* Phase 2: Coach-mark tutorial overlay */}
      <TutorialOverlay />

      {/* Welcome-back modal for returning players */}
      <WelcomeBackModal />

      {/* Phase 3: Progressive pro-tip popups */}
      <ProTipProvider />
    </>
  );
}
