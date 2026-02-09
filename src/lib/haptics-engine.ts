/**
 * Haptics Engine — Vibration API patterns for Lunar Colony Tycoon.
 *
 * Uses navigator.vibrate() where supported (most Android Chrome).
 * No-ops silently on unsupported platforms (iOS Safari, desktop).
 */

export type HapticPattern =
  | "tap" // short press
  | "success" // medium buzz
  | "error" // double buzz
  | "collect" // rising pattern
  | "levelUp" // long celebration
  | "build" // construction thud
  | "achievement" // special fanfare pattern
  | "event"; // alert pulse

let _enabled = true;

export function setHapticsEnabled(enabled: boolean) {
  _enabled = enabled;
}
export function isHapticsEnabled() {
  return _enabled;
}

function canVibrate(): boolean {
  return (
    _enabled &&
    typeof navigator !== "undefined" &&
    typeof navigator.vibrate === "function"
  );
}

/**
 * Trigger a haptic pattern. No-ops when disabled or unsupported.
 * Pattern arrays use [vibrate, pause, vibrate, pause, ...] in ms.
 */
export function haptic(pattern: HapticPattern) {
  if (!canVibrate()) return;

  switch (pattern) {
    case "tap":
      // Short subtle tap — 15ms
      navigator.vibrate(15);
      break;

    case "success":
      // Medium confirming buzz — 40ms
      navigator.vibrate(40);
      break;

    case "error":
      // Double buzz — buzz, pause, buzz
      navigator.vibrate([50, 40, 80]);
      break;

    case "collect":
      // Rising coin pattern — short, short, medium
      navigator.vibrate([15, 30, 20, 30, 40]);
      break;

    case "levelUp":
      // Celebration — sustained build
      navigator.vibrate([30, 50, 40, 50, 60, 50, 100]);
      break;

    case "build":
      // Construction thud — single strong pulse
      navigator.vibrate(60);
      break;

    case "achievement":
      // Fanfare — rhythmic pattern
      navigator.vibrate([20, 40, 20, 40, 20, 40, 80, 60, 120]);
      break;

    case "event":
      // Alert double-pulse
      navigator.vibrate([40, 80, 40]);
      break;
  }
}
