"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useGameStore } from "@/stores/game-store";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MarketResource {
  type: string;
  currentPrice: number;
  priceChange24h: number;
  changePercent: number;
  supply: number;
  demand: number;
}

export interface MarketOverview {
  resources: MarketResource[];
  alerts: number;
  lastUpdated: string;
}

export interface PriceHistoryEntry {
  price: number;
  volume: number;
  snapshotAt: string;
}

export interface DepthOrder {
  price: number;
  quantity: number;
  total: number;
}

export interface MarketDepth {
  resource: string;
  currentPrice: number;
  bids: DepthOrder[];
  asks: DepthOrder[];
  spread: number;
  spreadPercent: number;
}

export interface ResourceDetail {
  resource: MarketResource;
  history: PriceHistoryEntry[];
  depth: MarketDepth;
  lastUpdated: string;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function useMarketOverview() {
  const fid = useGameStore((s) => s.fid);
  return useQuery<MarketOverview>({
    queryKey: ["market"],
    queryFn: async () => {
      const url = fid ? `/api/market?playerId=${fid}` : "/api/market";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Market fetch failed");
      return res.json();
    },
    refetchInterval: 15_000,
  });
}

export function useResourceDetail(resource: string | null) {
  return useQuery<ResourceDetail>({
    queryKey: ["market", "resource", resource],
    queryFn: async () => {
      const res = await fetch(`/api/market?resource=${resource}`);
      if (!res.ok) throw new Error("Resource fetch failed");
      return res.json();
    },
    enabled: !!resource,
    refetchInterval: 15_000,
  });
}

// ---------------------------------------------------------------------------
// Trade mutation
// ---------------------------------------------------------------------------

export interface TradeRequest {
  side: "buy" | "sell";
  resource: string;
  quantity: number;
}

export interface TradeResult {
  success: boolean;
  resource: string;
  side: string;
  filledQuantity: number;
  avgPrice: number;
  totalCost: number;
  slippage: number;
  error?: string;
}

export function useExecuteTrade() {
  const fid = useGameStore((s) => s.fid);
  const qc = useQueryClient();

  return useMutation<TradeResult, Error, TradeRequest>({
    mutationFn: async (trade) => {
      const res = await fetch(`/api/dashboard/${fid}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "trade", ...trade }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Trade failed");
      }
      return res.json();
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["colony", fid] });
      void qc.invalidateQueries({ queryKey: ["market"] });
    },
  });
}
