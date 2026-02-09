"use client";

import { useAccessibilityStore } from "@/stores/accessibility-store";

// ---------------------------------------------------------------------------
// Live Region — Announces messages to screen readers
// ---------------------------------------------------------------------------

export function LiveAnnouncer() {
  const announcement = useAccessibilityStore((s) => s.announcement);

  return (
    <>
      {/* Polite: non-urgent updates */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>
      {/* Assertive: empty by default, components can use announce() directly */}
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
        id="a11y-assertive"
      />
    </>
  );
}
