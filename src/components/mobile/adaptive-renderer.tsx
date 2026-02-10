"use client";

/**
 * Adaptive rendering components that respond to device capabilities,
 * network quality, and battery state.
 */

import React, { useEffect, useState, useRef, type ReactNode } from "react";
import { useDevice } from "@/hooks/use-device";
import { useAdaptive, useNetwork, useBattery } from "@/hooks/use-adaptive";
import { usePerformanceTier } from "@/hooks/use-performance";

// ---------------------------------------------------------------------------
// MobileOptimized — wrapper that applies mobile-specific props
// ---------------------------------------------------------------------------

interface MobileOptimizedProps {
  children: ReactNode;
  /** Content to render on mobile (replaces children) */
  mobileContent?: ReactNode;
  /** Extra CSS class for mobile */
  mobileClassName?: string;
  /** Extra CSS class for desktop */
  desktopClassName?: string;
  className?: string;
}

export function MobileOptimized({
  children,
  mobileContent,
  mobileClassName,
  desktopClassName,
  className = "",
}: MobileOptimizedProps) {
  const { isMobile } = useDevice();

  if (isMobile && mobileContent) {
    return (
      <div className={`${className} ${mobileClassName ?? ""}`}>
        {mobileContent}
      </div>
    );
  }

  return (
    <div
      className={`${className} ${isMobile ? (mobileClassName ?? "") : (desktopClassName ?? "")}`}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// AdaptiveImage — serves different quality images based on conditions
// ---------------------------------------------------------------------------

interface AdaptiveImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  /** Low resolution src for poor network/low battery */
  lowResSrc?: string;
  /** Placeholder (blur-up data URI or color) */
  placeholder?: string;
  className?: string;
  loading?: "lazy" | "eager";
  priority?: boolean;
}

export function AdaptiveImage({
  src,
  alt,
  width,
  height,
  lowResSrc,
  placeholder,
  className = "",
  loading,
  priority = false,
}: AdaptiveImageProps) {
  const { reducedImageQuality } = useAdaptive();
  const { isMobile, pixelRatio } = useDevice();
  const [loaded, setLoaded] = useState(false);

  const resolvedSrc = reducedImageQuality && lowResSrc ? lowResSrc : src;
  const resolvedLoading = priority
    ? "eager"
    : (loading ?? (isMobile ? "lazy" : "eager"));

  // On mobile, use lower resolution (1x or 2x max instead of 3x)
  const effectiveWidth = isMobile
    ? Math.round(width / Math.max(pixelRatio / 2, 1))
    : width;
  const effectiveHeight = isMobile
    ? Math.round(height / Math.max(pixelRatio / 2, 1))
    : height;

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ width, height }}
    >
      {/* Placeholder */}
      {placeholder && !loaded && (
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: placeholder.startsWith("#")
              ? placeholder
              : undefined,
            backgroundImage: placeholder.startsWith("data:")
              ? `url(${placeholder})`
              : undefined,
            backgroundSize: "cover",
            filter: "blur(20px)",
            transform: "scale(1.1)",
          }}
        />
      )}
      {/* Actual image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={resolvedSrc}
        alt={alt}
        width={effectiveWidth}
        height={effectiveHeight}
        loading={resolvedLoading}
        decoding={priority ? "sync" : "async"}
        onLoad={() => setLoaded(true)}
        className={`transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// TouchButton — 60x60px minimum touch target + haptic feedback
// ---------------------------------------------------------------------------

interface TouchButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Min touch target size in px (default: 60) */
  minSize?: number;
  children: ReactNode;
}

export function TouchButton({
  minSize = 60,
  children,
  className = "",
  style,
  ...props
}: TouchButtonProps) {
  return (
    <button
      {...props}
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{
        minWidth: minSize,
        minHeight: minSize,
        // Expand hit area without changing visual size
        ...style,
      }}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// BatterySaver — conditionally renders based on battery state
// ---------------------------------------------------------------------------

interface BatterySaverProps {
  /** Content when battery is OK */
  children: ReactNode;
  /** Simplified content when battery is low */
  fallback?: ReactNode;
  /** Battery threshold (0–1) below which fallback is shown (default: 0.2) */
  threshold?: number;
}

export function BatterySaver({
  children,
  fallback,
  threshold = 0.2,
}: BatterySaverProps) {
  const battery = useBattery();

  if (battery.supported && battery.level < threshold && !battery.charging) {
    return <>{fallback ?? null}</>;
  }
  return <>{children}</>;
}

// ---------------------------------------------------------------------------
// NetworkAware — conditionally renders based on connection quality
// ---------------------------------------------------------------------------

interface NetworkAwareProps {
  children: ReactNode;
  /** Content for poor connections */
  lowQualityContent?: ReactNode;
  /** Content for offline */
  offlineContent?: ReactNode;
}

export function NetworkAware({
  children,
  lowQualityContent,
  offlineContent,
}: NetworkAwareProps) {
  const { quality, online } = useNetwork();

  if (!online && offlineContent) return <>{offlineContent}</>;
  if ((quality === "low" || quality === "offline") && lowQualityContent) {
    return <>{lowQualityContent}</>;
  }
  return <>{children}</>;
}

// ---------------------------------------------------------------------------
// AdaptiveAnimations — reduces framer-motion impact based on conditions
// ---------------------------------------------------------------------------

export function useAdaptiveAnimation() {
  const adaptive = useAdaptive();
  const tier = usePerformanceTier();

  // Reduce animations if battery saver, poor network, or low perf tier
  const shouldAnimate = !adaptive.reduceAnimations && tier !== "low";
  const shouldReduceMotion = adaptive.reduceAnimations || tier === "low";

  return {
    shouldAnimate,
    shouldReduceMotion,
    /** Spring config that adapts to performance tier */
    spring: shouldReduceMotion
      ? { duration: 0.01 }
      : tier === "medium"
        ? {
            type: "spring" as const,
            stiffness: 300,
            damping: 30,
            duration: 0.2,
          }
        : { type: "spring" as const, stiffness: 400, damping: 25 },
    /** Fade transition that adapts */
    fade: shouldReduceMotion ? { duration: 0.01 } : { duration: 0.15 },
  };
}

// ---------------------------------------------------------------------------
// OfflineBanner — shows when device goes offline
// ---------------------------------------------------------------------------

export function OfflineBanner() {
  const { online } = useNetwork();
  const wasOnlineRef = useRef(true);
  const [show, setShow] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const wasOnline = wasOnlineRef.current;

    if (!online && wasOnline) {
      // Went offline — schedule state update
      timerRef.current = setTimeout(() => setShow(true), 0);
    } else if (online && !wasOnline) {
      // Back online — show briefly then hide
      timerRef.current = setTimeout(() => {
        setShow(true);
        timerRef.current = setTimeout(() => setShow(false), 3000);
      }, 0);
    }
    wasOnlineRef.current = online;

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [online]);

  if (!show) return null;

  return (
    <div
      role="alert"
      className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-center py-2 text-sm font-medium text-white transition-all ${
        online ? "bg-emerald-600" : "bg-amber-600"
      }`}
    >
      {online
        ? "✓ Back online"
        : "⚠ You're offline — some features may be limited"}
    </div>
  );
}

// ---------------------------------------------------------------------------
// LowBatteryBanner
// ---------------------------------------------------------------------------

export function LowBatteryBanner() {
  const battery = useBattery();

  if (!battery.supported || !battery.isLow || battery.charging) return null;

  return (
    <div
      role="status"
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-center gap-2 bg-amber-900/90 py-1.5 text-xs text-amber-200 backdrop-blur-sm"
    >
      🔋 Battery saver active — animations reduced
    </div>
  );
}

// ---------------------------------------------------------------------------
// DeviceGate — render different content for mobile / desktop
// ---------------------------------------------------------------------------

interface DeviceGateProps {
  mobile: ReactNode;
  desktop: ReactNode;
  tablet?: ReactNode;
}

export function DeviceGate({ mobile, desktop, tablet }: DeviceGateProps) {
  const { isMobile, isTablet } = useDevice();

  if (isMobile) return <>{mobile}</>;
  if (isTablet) return <>{tablet ?? mobile}</>;
  return <>{desktop}</>;
}
