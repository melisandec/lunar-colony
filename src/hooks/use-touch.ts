"use client";

import { useCallback, useRef, useEffect, useState } from "react";
import { useHasTouch } from "./use-device";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SwipeDirection = "left" | "right" | "up" | "down";

export interface SwipeEvent {
  direction: SwipeDirection;
  distance: number;
  velocity: number; // px/ms
}

interface TouchConfig {
  /** Minimum swipe distance in px (default: 50) */
  threshold?: number;
  /** Minimum velocity in px/ms (default: 0.3) */
  velocityThreshold?: number;
  /** Prevent default on touch move (default: false) */
  preventDefault?: boolean;
}

interface TouchState {
  startX: number;
  startY: number;
  startTime: number;
  tracking: boolean;
}

// ---------------------------------------------------------------------------
// useSwipe — detect swipe gestures on a ref
// ---------------------------------------------------------------------------

export function useSwipe(
  onSwipe: (e: SwipeEvent) => void,
  config: TouchConfig = {},
) {
  const hasTouch = useHasTouch();
  const ref = useRef<HTMLElement>(null);
  const stateRef = useRef<TouchState>({
    startX: 0,
    startY: 0,
    startTime: 0,
    tracking: false,
  });

  const {
    threshold = 50,
    velocityThreshold = 0.3,
    preventDefault = false,
  } = config;

  useEffect(() => {
    const el = ref.current;
    if (!el || !hasTouch) return;

    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      stateRef.current = {
        startX: t.clientX,
        startY: t.clientY,
        startTime: Date.now(),
        tracking: true,
      };
    };

    const onTouchMove = (e: TouchEvent) => {
      if (preventDefault && stateRef.current.tracking) {
        e.preventDefault();
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      const s = stateRef.current;
      if (!s.tracking) return;
      s.tracking = false;

      const t = e.changedTouches[0];
      if (!t) return;
      const dx = t.clientX - s.startX;
      const dy = t.clientY - s.startY;
      const dt = Date.now() - s.startTime;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      // Determine dominant axis
      const isHorizontal = absDx > absDy;
      const distance = isHorizontal ? absDx : absDy;
      const velocity = distance / Math.max(dt, 1);

      if (distance >= threshold && velocity >= velocityThreshold) {
        let direction: SwipeDirection;
        if (isHorizontal) {
          direction = dx > 0 ? "right" : "left";
        } else {
          direction = dy > 0 ? "down" : "up";
        }
        onSwipe({ direction, distance, velocity });
      }
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: !preventDefault });
    el.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [hasTouch, onSwipe, threshold, velocityThreshold, preventDefault]);

  return ref;
}

// ---------------------------------------------------------------------------
// useLongPress — detect long press on touch devices
// ---------------------------------------------------------------------------

interface LongPressConfig {
  /** Duration in ms before triggering (default: 500) */
  delay?: number;
  /** Callback on long press */
  onLongPress: () => void;
  /** Callback on normal (short) press */
  onPress?: () => void;
}

export function useLongPress({
  delay = 500,
  onLongPress,
  onPress,
}: LongPressConfig) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const isLongPress = useRef(false);

  const start = useCallback(() => {
    isLongPress.current = false;
    timerRef.current = setTimeout(() => {
      isLongPress.current = true;
      onLongPress();
    }, delay);
  }, [delay, onLongPress]);

  const stop = useCallback(() => {
    clearTimeout(timerRef.current);
    if (!isLongPress.current) {
      onPress?.();
    }
  }, [onPress]);

  const cancel = useCallback(() => {
    clearTimeout(timerRef.current);
  }, []);

  return {
    onTouchStart: start,
    onTouchEnd: stop,
    onTouchCancel: cancel,
    // Also support mouse for hybrid devices
    onMouseDown: start,
    onMouseUp: stop,
    onMouseLeave: cancel,
  };
}

// ---------------------------------------------------------------------------
// usePullToRefresh
// ---------------------------------------------------------------------------

interface PullToRefreshConfig {
  /** Minimum pull distance in px (default: 80) */
  threshold?: number;
  /** Callback when pull threshold is reached */
  onRefresh: () => Promise<void>;
}

export function usePullToRefresh(config: PullToRefreshConfig) {
  const { threshold = 80, onRefresh } = config;
  const ref = useRef<HTMLElement>(null);
  const [pulling, setPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const hasTouch = useHasTouch();

  useEffect(() => {
    const el = ref.current;
    if (!el || !hasTouch) return;

    const onTouchStart = (e: TouchEvent) => {
      if (el.scrollTop <= 0) {
        const touch = e.touches[0];
        if (!touch) return;
        startY.current = touch.clientY;
        setPulling(true);
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!pulling) return;
      const currentTouch = e.touches[0];
      if (!currentTouch) return;
      const dy = currentTouch.clientY - startY.current;
      if (dy > 0 && el.scrollTop <= 0) {
        e.preventDefault();
        // Apply resistance curve
        setPullDistance(Math.min(dy * 0.5, threshold * 1.5));
      }
    };

    const onTouchEnd = async () => {
      if (pullDistance >= threshold && !refreshing) {
        setRefreshing(true);
        try {
          await onRefresh();
        } finally {
          setRefreshing(false);
        }
      }
      setPulling(false);
      setPullDistance(0);
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [hasTouch, pulling, pullDistance, threshold, refreshing, onRefresh]);

  return { ref, pulling, pullDistance, refreshing };
}
