"use client";

import { useState, useEffect, useCallback } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DeviceInfo {
  /** Is a mobile device (phone/small tablet) */
  isMobile: boolean;
  /** Is a tablet */
  isTablet: boolean;
  /** Is a desktop browser */
  isDesktop: boolean;
  /** Supports touch input */
  hasTouch: boolean;
  /** Viewport width */
  viewportWidth: number;
  /** Viewport height */
  viewportHeight: number;
  /** Device pixel ratio */
  pixelRatio: number;
  /** Likely running inside Warpcast or similar */
  isInAppBrowser: boolean;
  /** iOS device */
  isIOS: boolean;
  /** Android device */
  isAndroid: boolean;
  /** Orientation */
  orientation: "portrait" | "landscape";
  /** Safe area insets (for notched phones) */
  safeArea: { top: number; bottom: number; left: number; right: number };
}

// ---------------------------------------------------------------------------
// UA sniffing helpers (supplement to media queries)
// ---------------------------------------------------------------------------

function detectUA() {
  if (typeof navigator === "undefined") {
    return { isIOS: false, isAndroid: false, isInAppBrowser: false };
  }
  const ua = navigator.userAgent || "";
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isAndroid = /Android/i.test(ua);
  // Warpcast, Farcaster, or generic WebView
  const isInAppBrowser =
    /Warpcast|Farcaster/i.test(ua) ||
    // Generic in-app WebView indicators
    /FBAN|FBAV|Instagram|Twitter|Line\//i.test(ua) ||
    // iOS WebView
    (/Safari/i.test(ua) === false && isIOS);
  return { isIOS, isAndroid, isInAppBrowser };
}

function getSafeArea(): DeviceInfo["safeArea"] {
  if (
    typeof getComputedStyle === "undefined" ||
    typeof document === "undefined"
  ) {
    return { top: 0, bottom: 0, left: 0, right: 0 };
  }
  const style = getComputedStyle(document.documentElement);
  const parse = (prop: string) =>
    parseInt(style.getPropertyValue(prop) || "0", 10) || 0;
  return {
    top: parse("env(safe-area-inset-top)"),
    bottom: parse("env(safe-area-inset-bottom)"),
    left: parse("env(safe-area-inset-left)"),
    right: parse("env(safe-area-inset-right)"),
  };
}

// ---------------------------------------------------------------------------
// Size breakpoints (matching Tailwind defaults)
// ---------------------------------------------------------------------------

const MOBILE_MAX = 640; // sm breakpoint
const TABLET_MAX = 1024; // lg breakpoint

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Device detection hook that provides comprehensive device information
 * for adaptive rendering. Updates on resize and orientation change.
 */
export function useDevice(): DeviceInfo {
  const getDeviceInfo = useCallback((): DeviceInfo => {
    if (typeof window === "undefined") {
      // SSR fallback — assume mobile for Frame viewing
      return {
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        hasTouch: true,
        viewportWidth: 390,
        viewportHeight: 844,
        pixelRatio: 3,
        isInAppBrowser: true,
        isIOS: false,
        isAndroid: false,
        orientation: "portrait",
        safeArea: { top: 0, bottom: 0, left: 0, right: 0 },
      };
    }

    const w = window.innerWidth;
    const h = window.innerHeight;
    const hasTouch =
      "ontouchstart" in window ||
      navigator.maxTouchPoints > 0 ||
      // @ts-expect-error — msMaxTouchPoints is IE/Edge legacy
      navigator.msMaxTouchPoints > 0;

    const { isIOS, isAndroid, isInAppBrowser } = detectUA();

    const isMobile = w <= MOBILE_MAX || (hasTouch && w <= MOBILE_MAX + 30);
    const isTablet = !isMobile && w <= TABLET_MAX && hasTouch;
    const isDesktop = !isMobile && !isTablet;

    return {
      isMobile,
      isTablet,
      isDesktop,
      hasTouch,
      viewportWidth: w,
      viewportHeight: h,
      pixelRatio: window.devicePixelRatio || 1,
      isInAppBrowser,
      isIOS,
      isAndroid,
      orientation: w > h ? "landscape" : "portrait",
      safeArea: getSafeArea(),
    };
  }, []);

  const [device, setDevice] = useState<DeviceInfo>(getDeviceInfo);

  useEffect(() => {
    let rafId: number;
    const handler = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => setDevice(getDeviceInfo()));
    };

    window.addEventListener("resize", handler, { passive: true });
    window.addEventListener("orientationchange", handler, { passive: true });

    // Also listen for viewport changes from virtual keyboard on mobile
    if ("visualViewport" in window && window.visualViewport) {
      window.visualViewport.addEventListener("resize", handler, {
        passive: true,
      });
    }

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", handler);
      window.removeEventListener("orientationchange", handler);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", handler);
      }
    };
  }, [getDeviceInfo]);

  return device;
}

// ---------------------------------------------------------------------------
// Convenience selectors (avoid re-renders when only one field matters)
// ---------------------------------------------------------------------------

export function useIsMobile(): boolean {
  const { isMobile } = useDevice();
  return isMobile;
}

export function useHasTouch(): boolean {
  const { hasTouch } = useDevice();
  return hasTouch;
}

// ---------------------------------------------------------------------------
// CSS class helper
// ---------------------------------------------------------------------------

/** Generate a class string with mobile-specific overrides */
export function mobileClass(base: string, mobile: string, isMobile: boolean) {
  return isMobile ? `${base} ${mobile}` : base;
}
