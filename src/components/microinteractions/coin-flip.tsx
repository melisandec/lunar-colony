"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useCallback } from "react";
import { useReducedMotion } from "@/stores/accessibility-store";

/* ---------- types ---------- */

interface CoinFlipProps {
  /** Trigger the animation. Increments each time you want to play it. */
  trigger: number;
  /** Amount displayed on the coin */
  amount?: number;
  /** Where to render relative to parent */
  className?: string;
}

interface Coin {
  id: number;
  x: number;
  delay: number;
}

/* ---------- component ---------- */

let coinCounter = 0;

/**
 * CoinFlip — Animated coin(s) that fly up and fade out when $LUNAR is earned.
 * Place inside a `position: relative` container.
 */
export function CoinFlip({ trigger, amount, className = "" }: CoinFlipProps) {
  const reduced = useReducedMotion();
  const [coins, setCoins] = useState<Coin[]>([]);

  const spawn = useCallback(() => {
    // Spawn 3–6 coins depending on amount
    const count = Math.min(6, Math.max(3, Math.ceil((amount ?? 10) / 50)));
    const batch: Coin[] = Array.from({ length: count }, (_, i) => ({
      id: ++coinCounter,
      x: (Math.random() - 0.5) * 60,
      delay: i * 0.07,
    }));
    setCoins(batch);
    // Clear after animation completes
    setTimeout(() => setCoins([]), 1200);
  }, [amount]);

  useEffect(() => {
    if (trigger > 0) spawn();
  }, [trigger, spawn]);

  if (reduced) {
    // Reduced motion: show a simple "+$LUNAR" text fade
    return (
      <AnimatePresence>
        {coins.length > 0 && (
          <motion.div
            className={`pointer-events-none absolute inset-0 flex items-center justify-center ${className}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            aria-hidden="true"
          >
            <span className="text-sm font-bold text-amber-400">
              +{amount ?? ""} $LUNAR
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      aria-hidden="true"
    >
      <AnimatePresence>
        {coins.map((coin) => (
          <motion.div
            key={coin.id}
            className="absolute bottom-1/2 left-1/2"
            initial={{ opacity: 0, y: 0, x: coin.x, scale: 0.5, rotateY: 0 }}
            animate={{
              opacity: [0, 1, 1, 0],
              y: [0, -40, -70, -100],
              scale: [0.5, 1, 1, 0.8],
              rotateY: [0, 180, 360, 540],
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.9,
              delay: coin.delay,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            {/* Coin */}
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-500 shadow-lg shadow-amber-500/30">
              <span className="text-[10px] font-black text-amber-900">$</span>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Amount label */}
      <AnimatePresence>
        {coins.length > 0 && amount != null && (
          <motion.div
            className="absolute bottom-1/2 left-1/2 -translate-x-1/2"
            initial={{ opacity: 0, y: 0 }}
            animate={{ opacity: 1, y: -110 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <span className="whitespace-nowrap text-sm font-bold text-amber-400 drop-shadow-lg">
              +{amount} $LUNAR
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
