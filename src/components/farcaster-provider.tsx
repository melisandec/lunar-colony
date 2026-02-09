"use client";

import { useEffect, useCallback } from "react";

/**
 * Initializes the Farcaster Mini App SDK.
 * Calls `sdk.actions.ready()` to hide the splash screen once the app is loaded.
 * This component should be rendered in the root layout.
 */
export function FarcasterProvider({ children }: { children: React.ReactNode }) {
  const initMiniApp = useCallback(async () => {
    try {
      const { sdk } = await import("@farcaster/miniapp-sdk");
      await sdk.actions.ready();
    } catch {
      // Not running inside a Farcaster client — no-op
    }
  }, []);

  useEffect(() => {
    initMiniApp();
  }, [initMiniApp]);

  return <>{children}</>;
}
