"use client";

/**
 * Real-time data hooks for live game state updates.
 *
 * - useSSE           — Server-Sent Events connection with auto-reconnect
 * - useAnimatedValue — Smoothly interpolated number for live counters
 * - useLiveQuery     — React Query wrapper with SSE invalidation
 * - useCountdown     — Countdown timer to a target time
 */

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";

// ---------------------------------------------------------------------------
// useSSE — Server-Sent Events hook
// ---------------------------------------------------------------------------

export interface SSEOptions {
  /** SSE endpoint URL */
  url: string;
  /** Whether to connect */
  enabled?: boolean;
  /** Event types to listen for (default: ["message"]) */
  events?: string[];
  /** Auto-reconnect delay in ms */
  reconnectDelay?: number;
  /** Max reconnect attempts */
  maxReconnects?: number;
  /** Callback for each event */
  onEvent?: (event: MessageEvent) => void;
  /** Callback for errors */
  onError?: (error: Event) => void;
}

export interface SSEState {
  /** Whether the connection is open */
  connected: boolean;
  /** Number of reconnect attempts */
  reconnectCount: number;
  /** Last received data */
  lastData: unknown;
  /** Last error */
  error: Event | null;
}

export function useSSE({
  url,
  enabled = true,
  events = ["message"],
  reconnectDelay = 3000,
  maxReconnects = 10,
  onEvent,
  onError,
}: SSEOptions): SSEState {
  const [state, setState] = useState<SSEState>({
    connected: false,
    reconnectCount: 0,
    lastData: null,
    error: null,
  });

  const sourceRef = useRef<EventSource | null>(null);
  const reconnectsRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled || typeof EventSource === "undefined") return;

    function connect() {
      const source = new EventSource(url);
      sourceRef.current = source;

      source.onopen = () => {
        reconnectsRef.current = 0;
        setState((prev) => ({
          ...prev,
          connected: true,
          reconnectCount: 0,
          error: null,
        }));
      };

      for (const eventType of events) {
        source.addEventListener(eventType, (event: MessageEvent) => {
          let parsed: unknown;
          try {
            parsed = JSON.parse(event.data);
          } catch {
            parsed = event.data;
          }
          setState((prev) => ({ ...prev, lastData: parsed }));
          onEvent?.(event);
        });
      }

      source.onerror = (err) => {
        setState((prev) => ({ ...prev, connected: false, error: err }));
        onError?.(err);
        source.close();

        // Auto-reconnect
        if (reconnectsRef.current < maxReconnects) {
          reconnectsRef.current += 1;
          setState((prev) => ({
            ...prev,
            reconnectCount: reconnectsRef.current,
          }));
          reconnectTimerRef.current = setTimeout(connect, reconnectDelay);
        }
      };
    }

    connect();

    return () => {
      sourceRef.current?.close();
      sourceRef.current = null;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, enabled]);

  return state;
}

// ---------------------------------------------------------------------------
// useAnimatedValue — smoothly interpolated number
// ---------------------------------------------------------------------------

export interface AnimatedValueOptions {
  /** Current target value */
  value: number;
  /** Animation duration in ms */
  duration?: number;
  /** Decimal places */
  decimals?: number;
  /** Easing function */
  easing?: (t: number) => number;
}

export function useAnimatedValue({
  value,
  duration = 600,
  decimals = 0,
  easing = (t) => 1 - Math.pow(1 - t, 3), // easeOutCubic
}: AnimatedValueOptions): number {
  const [display, setDisplay] = useState(value);
  const animRef = useRef<number>(0);
  const startRef = useRef({ value: display, time: 0, target: value });

  useEffect(() => {
    if (value === startRef.current.target) return;

    const from = display;
    const to = value;
    startRef.current = { value: from, time: performance.now(), target: to };

    function tick(now: number) {
      const elapsed = now - startRef.current.time;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easing(progress);
      const current = from + (to - from) * eased;
      const rounded =
        decimals > 0
          ? Math.round(current * Math.pow(10, decimals)) /
            Math.pow(10, decimals)
          : Math.round(current);

      setDisplay(rounded);

      if (progress < 1) {
        animRef.current = requestAnimationFrame(tick);
      }
    }

    animRef.current = requestAnimationFrame(tick);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  return display;
}

// ---------------------------------------------------------------------------
// useLiveQuery — React Query + SSE invalidation
// ---------------------------------------------------------------------------

export function useLiveQuery({
  queryKeys,
  sseUrl,
  enabled = true,
}: {
  /** Query keys to invalidate on SSE events */
  queryKeys: string[][];
  /** SSE endpoint */
  sseUrl: string;
  /** Whether to connect */
  enabled?: boolean;
}) {
  const qc = useQueryClient();

  const handleEvent = useCallback(
    () => {
      for (const key of queryKeys) {
        qc.invalidateQueries({ queryKey: key });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [qc],
  );

  return useSSE({
    url: sseUrl,
    enabled,
    onEvent: handleEvent,
  });
}

// ---------------------------------------------------------------------------
// useCountdown — countdown to a target time
// ---------------------------------------------------------------------------

export interface CountdownState {
  /** Total seconds remaining */
  totalSeconds: number;
  /** Hours component */
  hours: number;
  /** Minutes component */
  minutes: number;
  /** Seconds component */
  seconds: number;
  /** Is the countdown expired */
  expired: boolean;
  /** Formatted string "HH:MM:SS" or "MM:SS" */
  formatted: string;
  /** Progress 0–1 (0 = just started, 1 = expired) */
  progress: number;
}

export function useCountdown(
  targetTime: Date | string | number | null,
  /** Optional start time to compute progress */
  startTime?: Date | string | number | null,
): CountdownState {
  const target = useMemo(
    () => (targetTime ? new Date(targetTime).getTime() : 0),
    [targetTime],
  );
  const start = useMemo(
    () => (startTime ? new Date(startTime).getTime() : 0),
    [startTime],
  );

  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!target) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [target]);

  return useMemo(() => {
    if (!target) {
      return {
        totalSeconds: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        expired: true,
        formatted: "00:00",
        progress: 1,
      };
    }

    const remaining = Math.max(0, Math.floor((target - now) / 1000));
    const h = Math.floor(remaining / 3600);
    const m = Math.floor((remaining % 3600) / 60);
    const s = remaining % 60;

    const total = start ? Math.max(1, (target - start) / 1000) : remaining || 1;
    const progress = start ? Math.min(1, 1 - remaining / total) : 0;

    const formatted =
      h > 0
        ? `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
        : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;

    return {
      totalSeconds: remaining,
      hours: h,
      minutes: m,
      seconds: s,
      expired: remaining <= 0,
      formatted,
      progress,
    };
  }, [target, start, now]);
}

// ---------------------------------------------------------------------------
// useTickCountdown — countdown to next game tick
// ---------------------------------------------------------------------------

export function useTickCountdown(): CountdownState {
  const TICK_INTERVAL = 5 * 60 * 1000; // 5 minutes

  const computeTarget = useCallback(() => {
    const n = Date.now();
    return n + TICK_INTERVAL - (n % TICK_INTERVAL);
  }, [TICK_INTERVAL]);

  const [targetTime, setTargetTime] = useState(computeTarget);

  const countdown = useCountdown(targetTime);

  useEffect(() => {
    if (countdown.expired) {
      // Use setTimeout to avoid synchronous setState in effect
      setTimeout(() => setTargetTime(computeTarget()), 0);
    }
  }, [countdown.expired, computeTarget]);

  return countdown;
}
