"use client";

import { useEffect, useRef, useCallback, useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PerformanceMetrics {
  /** Frames per second (rolling average) */
  fps: number;
  /** Long task count since monitoring started */
  longTasks: number;
  /** Layout shift score since monitoring started */
  cls: number;
  /** First input delay in ms (first interaction only) */
  fid: number | null;
  /** Time to interactive in ms */
  tti: number | null;
  /** Memory usage in MB (Chrome only) */
  memoryMB: number | null;
}

type PerfCallback = (metrics: PerformanceMetrics) => void;

// ---------------------------------------------------------------------------
// Performance monitor singleton
// ---------------------------------------------------------------------------

class MobilePerformanceMonitor {
  private fps = 60;
  private fpsFrames = 0;
  private fpsLastTime = 0;
  private rafId: number | null = null;
  private longTasks = 0;
  private cls = 0;
  private fid: number | null = null;
  private tti: number | null = null;
  private observers: PerformanceObserver[] = [];
  private listeners: Set<PerfCallback> = new Set();
  private reportInterval: ReturnType<typeof setInterval> | null = null;
  private started = false;

  start() {
    if (this.started || typeof window === "undefined") return;
    this.started = true;
    this.fpsLastTime = performance.now();

    // FPS counter via rAF
    const tick = (now: number) => {
      this.fpsFrames++;
      const delta = now - this.fpsLastTime;
      if (delta >= 1000) {
        this.fps = Math.round((this.fpsFrames * 1000) / delta);
        this.fpsFrames = 0;
        this.fpsLastTime = now;
      }
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);

    // Long Task Observer
    if ("PerformanceObserver" in window) {
      try {
        const lto = new PerformanceObserver((list) => {
          this.longTasks += list.getEntries().length;
        });
        lto.observe({ type: "longtask", buffered: true });
        this.observers.push(lto);
      } catch {
        // longtask not supported
      }

      // CLS Observer
      try {
        const clsObs = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            // @ts-expect-error — layout-shift entries have hadRecentInput
            if (!entry.hadRecentInput) {
              // @ts-expect-error — layout-shift entries have value
              this.cls += entry.value;
            }
          }
        });
        clsObs.observe({ type: "layout-shift", buffered: true });
        this.observers.push(clsObs);
      } catch {
        // layout-shift not supported
      }

      // FID Observer
      try {
        const fidObs = new PerformanceObserver((list) => {
          const entry = list.getEntries()[0];
          if (entry && this.fid === null) {
            // @ts-expect-error — first-input entries have processingStart
            this.fid = entry.processingStart - entry.startTime;
          }
        });
        fidObs.observe({ type: "first-input", buffered: true });
        this.observers.push(fidObs);
      } catch {
        // first-input not supported
      }
    }

    // Report every 5s
    this.reportInterval = setInterval(() => this.report(), 5_000);
  }

  stop() {
    if (!this.started) return;
    this.started = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    for (const obs of this.observers) obs.disconnect();
    this.observers = [];
    if (this.reportInterval) clearInterval(this.reportInterval);
  }

  subscribe(cb: PerfCallback) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  getMetrics(): PerformanceMetrics {
    let memoryMB: number | null = null;
    // @ts-expect-error — memory is Chrome-only non-standard API
    if (performance.memory) {
      // @ts-expect-error — usedJSHeapSize is Chrome-only
      memoryMB = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
    }

    return {
      fps: this.fps,
      longTasks: this.longTasks,
      cls: Math.round(this.cls * 1000) / 1000,
      fid: this.fid !== null ? Math.round(this.fid) : null,
      tti: this.tti,
      memoryMB,
    };
  }

  private report() {
    const metrics = this.getMetrics();
    for (const cb of this.listeners) {
      try {
        cb(metrics);
      } catch {
        // ignore listener errors
      }
    }
  }
}

let _monitor: MobilePerformanceMonitor | null = null;

function getMonitor(): MobilePerformanceMonitor {
  if (!_monitor) {
    _monitor = new MobilePerformanceMonitor();
  }
  return _monitor;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Mobile performance monitoring hook.
 * Tracks FPS, long tasks, CLS, FID, and memory usage.
 * Reports metrics via callback every 5 seconds.
 */
export function useMobilePerformance(
  onMetrics?: PerfCallback,
  options: { enabled?: boolean } = {},
) {
  const { enabled = true } = options;
  const callbackRef = useRef(onMetrics);

  useEffect(() => {
    callbackRef.current = onMetrics;
  });

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const monitor = getMonitor();
    monitor.start();

    let unsub: (() => void) | undefined;
    if (callbackRef.current) {
      unsub = monitor.subscribe((m) => callbackRef.current?.(m));
    }

    return () => {
      unsub?.();
      // Don't stop the monitor — other hooks may still be using it
    };
  }, [enabled]);

  const getMetrics = useCallback((): PerformanceMetrics | null => {
    if (typeof window === "undefined") return null;
    return getMonitor().getMetrics();
  }, []);

  return { getMetrics };
}

// ---------------------------------------------------------------------------
// Performance-aware rendering helper
// ---------------------------------------------------------------------------

/**
 * Returns whether heavy rendering should be enabled based on device perf.
 * Starts true, degrades if FPS drops below threshold.
 */
export function usePerformanceTier(): "high" | "medium" | "low" {
  const [tier, setTier] = useState<"high" | "medium" | "low">("high");

  useMobilePerformance(
    (metrics) => {
      if (metrics.fps < 20 || metrics.longTasks > 10) {
        setTier("low");
      } else if (metrics.fps < 40 || metrics.longTasks > 5) {
        setTier("medium");
      } else {
        setTier("high");
      }
    },
    { enabled: true },
  );

  return tier;
}
