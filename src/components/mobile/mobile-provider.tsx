"use client";

/**
 * MobileProvider — top-level context that manages:
 *  - Service worker registration
 *  - Device data-attributes on <html> for CSS targeting
 *  - Battery/network adaptive flags
 *  - Viewport meta tag management
 */

import { useEffect, createContext, useContext, type ReactNode } from "react";
import { useDevice, type DeviceInfo } from "@/hooks/use-device";
import { useAdaptive, type AdaptiveFlags } from "@/hooks/use-adaptive";
import { useMobilePerformance } from "@/hooks/use-performance";

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface MobileContextValue {
  device: DeviceInfo;
  adaptive: AdaptiveFlags;
}

const MobileCtx = createContext<MobileContextValue>({
  device: {
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    hasTouch: false,
    viewportWidth: 1920,
    viewportHeight: 1080,
    pixelRatio: 1,
    isInAppBrowser: false,
    isIOS: false,
    isAndroid: false,
    orientation: "landscape",
    safeArea: { top: 0, bottom: 0, left: 0, right: 0 },
  },
  adaptive: {
    reduceAnimations: false,
    reducedImageQuality: false,
    pauseAutoRefresh: false,
    deferHeavyWork: false,
    imageQuality: 85,
    disablePrefetch: false,
  },
});

export const useMobileContext = () => useContext(MobileCtx);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function MobileProvider({ children }: { children: ReactNode }) {
  const device = useDevice();
  const adaptive = useAdaptive();

  // Register service worker
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.warn("[MobileProvider] SW registration failed:", err);
      });
    }
  }, []);

  // Set data attributes on <html> for CSS-based mobile optimizations
  useEffect(() => {
    const html = document.documentElement;
    html.dataset.mobile = String(device.isMobile);
    html.dataset.touch = String(device.hasTouch);
    html.dataset.inApp = String(device.isInAppBrowser);
    html.dataset.orientation = device.orientation;

    if (adaptive.reduceAnimations) {
      html.dataset.batterySaver = "true";
    } else {
      delete html.dataset.batterySaver;
    }

    // Set CSS custom property with safe area insets
    html.style.setProperty("--safe-top", `${device.safeArea.top}px`);
    html.style.setProperty("--safe-bottom", `${device.safeArea.bottom}px`);
    html.style.setProperty("--safe-left", `${device.safeArea.left}px`);
    html.style.setProperty("--safe-right", `${device.safeArea.right}px`);

    return () => {
      delete html.dataset.mobile;
      delete html.dataset.touch;
      delete html.dataset.inApp;
      delete html.dataset.orientation;
      delete html.dataset.batterySaver;
    };
  }, [device, adaptive]);

  // Performance monitoring (only on mobile)
  useMobilePerformance(
    (metrics) => {
      if (metrics.fps < 20) {
        console.warn(
          "[perf] Low FPS:",
          metrics.fps,
          "Long tasks:",
          metrics.longTasks,
        );
      }
    },
    { enabled: device.isMobile },
  );

  return (
    <MobileCtx.Provider value={{ device, adaptive }}>
      {children}
    </MobileCtx.Provider>
  );
}
