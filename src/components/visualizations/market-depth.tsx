"use client";

/**
 * MarketDepthViz — SVG visualization of market order book depth.
 *
 * Shows bids (buy orders) and asks (sell orders) as stacked area
 * mirrored around the current price line.
 */

import { useMemo, useId } from "react";
import { motion, useReducedMotion } from "framer-motion";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DepthOrder {
  price: number;
  quantity: number;
  total: number;
}

export interface MarketDepthVizProps {
  bids: DepthOrder[];
  asks: DepthOrder[];
  currentPrice: number;
  spread?: number;
  width?: number;
  height?: number;
  bidColor?: string;
  askColor?: string;
  animate?: boolean;
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MarketDepthViz({
  bids,
  asks,
  currentPrice,
  spread,
  width = 280,
  height = 120,
  bidColor = "#10b981",
  askColor = "#ef4444",
  animate = true,
  className = "",
}: MarketDepthVizProps) {
  const reducedMotion = useReducedMotion();
  const shouldAnimate = animate && !reducedMotion;

  const padding = { top: 8, right: 8, bottom: 20, left: 8 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  const { bidPath, askPath, bidArea, askArea, priceX } = useMemo(() => {
    if (!bids.length && !asks.length) {
      return {
        bidPath: "",
        askPath: "",
        bidArea: "",
        askArea: "",
        priceX: plotW / 2,
        maxTotal: 0,
        minPrice: 0,
        maxPrice: 0,
      };
    }

    const allPrices = [
      ...bids.map((b) => b.price),
      ...asks.map((a) => a.price),
    ];
    const minP = Math.min(...allPrices);
    const maxP = Math.max(...allPrices);
    const priceRange = maxP - minP || 1;

    const maxTot = Math.max(
      ...bids.map((b) => b.total),
      ...asks.map((a) => a.total),
      1,
    );

    const toX = (price: number) =>
      padding.left + ((price - minP) / priceRange) * plotW;
    const toY = (total: number) =>
      padding.top + plotH - (total / maxTot) * plotH;

    // Bids (left side, descending price)
    const bidsSorted = [...bids].sort((a, b) => b.price - a.price);
    const bidPoints = bidsSorted.map((b) => ({
      x: toX(b.price),
      y: toY(b.total),
    }));

    const asksSorted = [...asks].sort((a, b) => a.price - b.price);
    const askPoints = asksSorted.map((a) => ({
      x: toX(a.price),
      y: toY(a.total),
    }));

    const bidLine = bidPoints
      .map(
        (p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`,
      )
      .join(" ");
    const askLine = askPoints
      .map(
        (p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`,
      )
      .join(" ");

    // Area paths (close to baseline)
    const baseY = padding.top + plotH;
    const bidAreaPath = bidPoints.length
      ? `${bidLine} L${bidPoints[bidPoints.length - 1]!.x.toFixed(1)},${baseY} L${bidPoints[0]!.x.toFixed(1)},${baseY} Z`
      : "";
    const askAreaPath = askPoints.length
      ? `${askLine} L${askPoints[askPoints.length - 1]!.x.toFixed(1)},${baseY} L${askPoints[0]!.x.toFixed(1)},${baseY} Z`
      : "";

    return {
      bidPath: bidLine,
      askPath: askLine,
      bidArea: bidAreaPath,
      askArea: askAreaPath,
      priceX: toX(currentPrice),
      maxTotal: maxTot,
      minPrice: minP,
      maxPrice: maxP,
    };
  }, [bids, asks, currentPrice, plotW, plotH, padding.left, padding.top]);

  const stableId = useId();
  const bidGradId = `bid-grad-${stableId}`;
  const askGradId = `ask-grad-${stableId}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      role="img"
      aria-label={`Market depth: ${bids.length} bids, ${asks.length} asks, price ${currentPrice.toFixed(2)}`}
    >
      <defs>
        <linearGradient id={bidGradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={bidColor} stopOpacity={0.4} />
          <stop offset="100%" stopColor={bidColor} stopOpacity={0.05} />
        </linearGradient>
        <linearGradient id={askGradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={askColor} stopOpacity={0.4} />
          <stop offset="100%" stopColor={askColor} stopOpacity={0.05} />
        </linearGradient>
      </defs>

      {/* Bid area */}
      {bidArea && (
        <motion.path
          d={bidArea}
          fill={`url(#${bidGradId})`}
          initial={shouldAnimate ? { opacity: 0 } : undefined}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        />
      )}
      {bidPath && (
        <motion.path
          d={bidPath}
          fill="none"
          stroke={bidColor}
          strokeWidth={1.5}
          initial={shouldAnimate ? { pathLength: 0 } : undefined}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.8 }}
        />
      )}

      {/* Ask area */}
      {askArea && (
        <motion.path
          d={askArea}
          fill={`url(#${askGradId})`}
          initial={shouldAnimate ? { opacity: 0 } : undefined}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        />
      )}
      {askPath && (
        <motion.path
          d={askPath}
          fill="none"
          stroke={askColor}
          strokeWidth={1.5}
          initial={shouldAnimate ? { pathLength: 0 } : undefined}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.8, delay: 0.1 }}
        />
      )}

      {/* Current price line */}
      <line
        x1={priceX}
        y1={padding.top}
        x2={priceX}
        y2={padding.top + plotH}
        stroke="#facc15"
        strokeWidth={1}
        strokeDasharray="3 3"
        strokeOpacity={0.6}
      />

      {/* Price label */}
      <text
        x={priceX}
        y={height - 4}
        textAnchor="middle"
        className="fill-amber-400"
        style={{ fontSize: 9, fontFamily: "ui-monospace, monospace" }}
      >
        {currentPrice.toFixed(2)}
      </text>

      {/* Bid/Ask labels */}
      <text
        x={padding.left + 4}
        y={padding.top + 10}
        className="fill-emerald-400"
        style={{ fontSize: 8 }}
      >
        BIDS
      </text>
      <text
        x={width - padding.right - 4}
        y={padding.top + 10}
        textAnchor="end"
        className="fill-red-400"
        style={{ fontSize: 8 }}
      >
        ASKS
      </text>

      {/* Spread indicator */}
      {spread !== undefined && (
        <text
          x={priceX}
          y={padding.top + 10}
          textAnchor="middle"
          className="fill-slate-500"
          style={{ fontSize: 7, fontFamily: "ui-monospace, monospace" }}
        >
          spread {spread.toFixed(2)}
        </text>
      )}
    </svg>
  );
}
