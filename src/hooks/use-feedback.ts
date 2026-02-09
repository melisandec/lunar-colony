/**
 * useFeedback — Unified hook that bundles audio + haptics + respects a11y prefs.
 *
 * Usage:
 *   const fb = useFeedback();
 *   fb.click();          // plays click sound + tap haptic
 *   fb.collect();        // coin sound + collect haptic
 *   fb.play("levelUp");  // any named sound
 */

"use client";

import { useCallback, useMemo } from "react";
import { playSound, type SoundName } from "@/lib/audio-engine";
import { haptic, type HapticPattern } from "@/lib/haptics-engine";
import { useReducedMotion } from "@/stores/accessibility-store";

export function useFeedback() {
  const reduced = useReducedMotion();

  const play = useCallback(
    (sound: SoundName, pattern?: HapticPattern) => {
      if (reduced) return;
      playSound(sound);
      if (pattern) haptic(pattern);
    },
    [reduced],
  );

  return useMemo(
    () => ({
      /** Raw play — any sound + optional haptic */
      play,
      /** UI click */
      click: () => play("click", "tap"),
      /** Hover (sound only, no haptic) */
      hover: () => {
        if (!reduced) playSound("hover");
      },
      /** Success action */
      success: () => play("success", "success"),
      /** Error action */
      error: () => play("error", "error"),
      /** $LUNAR collection */
      collect: () => play("collect", "collect"),
      /** Level up */
      levelUp: () => play("levelUp", "levelUp"),
      /** Build module */
      build: () => play("build", "build"),
      /** Upgrade module */
      upgrade: () => play("upgrade", "build"),
      /** Market trade */
      trade: () => play("trade", "success"),
      /** Achievement unlocked */
      achievement: () => play("achievement", "achievement"),
      /** Game event */
      event: () => play("event", "event"),
    }),
    [play, reduced],
  );
}
