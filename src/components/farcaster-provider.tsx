"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";

type FarcasterContext = {
  /** True once we know the app is running inside a Farcaster client. */
  isInMiniApp: boolean;
  /** The user's FID if available from the SDK context. */
  fid: number | null;
  /** True while we're still detecting the environment. */
  loading: boolean;
};

const FarcasterCtx = createContext<FarcasterContext>({
  isInMiniApp: false,
  fid: null,
  loading: true,
});

export const useFarcaster = () => useContext(FarcasterCtx);

/**
 * Initializes the Farcaster Mini App SDK.
 * Detects the Mini App environment, extracts user context,
 * and calls `sdk.actions.ready()` to hide the splash screen.
 */
export function FarcasterProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<FarcasterContext>({
    isInMiniApp: false,
    fid: null,
    loading: true,
  });

  const initMiniApp = useCallback(async () => {
    try {
      const { sdk } = await import("@farcaster/miniapp-sdk");

      // Quick env check — resolves fast if not inside a Mini App
      const isMiniApp = await sdk.isInMiniApp();

      if (isMiniApp) {
        const ctx = await sdk.context;
        setState({
          isInMiniApp: true,
          fid: ctx?.user?.fid ?? null,
          loading: false,
        });
        await sdk.actions.ready();
      } else {
        setState({ isInMiniApp: false, fid: null, loading: false });
      }
    } catch {
      // Not in a Farcaster client
      setState({ isInMiniApp: false, fid: null, loading: false });
    }
  }, []);

  useEffect(() => {
    initMiniApp();
  }, [initMiniApp]);

  return (
    <FarcasterCtx.Provider value={state}>{children}</FarcasterCtx.Provider>
  );
}
