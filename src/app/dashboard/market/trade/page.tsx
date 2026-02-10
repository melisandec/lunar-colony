"use client";

import { useState } from "react";
import { useMarketOverview, useExecuteTrade } from "@/hooks/use-market";
import { useUIStore } from "@/stores/ui-store";
import { GAME_CONSTANTS } from "@/lib/utils";

const TRADEABLE_RESOURCES = GAME_CONSTANTS.RESOURCE_TYPES.filter(
  (r) => r !== "LUNAR",
);

export default function TradePage() {
  const { data: market } = useMarketOverview();
  const trade = useExecuteTrade();
  const addToast = useUIStore((s) => s.addToast);

  const [buyResource, setBuyResource] = useState(
    TRADEABLE_RESOURCES[0] ?? "REGOLITH",
  );
  const [sellResource, setSellResource] = useState(
    TRADEABLE_RESOURCES[0] ?? "REGOLITH",
  );
  const [buyAmount, setBuyAmount] = useState("");
  const [sellAmount, setSellAmount] = useState("");

  const getPrice = (resource: string) => {
    return (
      market?.resources?.find((r: { type: string }) => r.type === resource)
        ?.currentPrice ?? 0
    );
  };

  const handleTrade = async (
    side: "buy" | "sell",
    resource: string,
    quantity: number,
  ) => {
    try {
      const result = await trade.mutateAsync({ side, resource, quantity });
      addToast({
        type: "success",
        title: `${side === "buy" ? "Bought" : "Sold"} ${quantity} ${resource.replace(/_/g, " ")}`,
        message: `Total: ${result.totalCost?.toLocaleString() ?? "—"} $LUNAR`,
        icon: side === "buy" ? "🛒" : "💰",
      });
      if (side === "buy") setBuyAmount("");
      else setSellAmount("");
    } catch (err) {
      addToast({
        type: "error",
        title: `${side === "buy" ? "Buy" : "Sell"} failed`,
        message: err instanceof Error ? err.message : "Unknown error",
        icon: "❌",
      });
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-bold text-white">💱 Buy / Sell</h2>
        <p className="text-sm text-slate-400">
          Execute trades on the Lunar Market.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Buy panel */}
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <h3 className="mb-3 text-sm font-semibold text-emerald-400">
            Buy Resources
          </h3>
          <div className="space-y-3">
            <select
              value={buyResource}
              onChange={(e) =>
                setBuyResource(e.target.value as typeof buyResource)
              }
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
            >
              {TRADEABLE_RESOURCES.map((r) => (
                <option key={r} value={r}>
                  {r.replace(/_/g, " ")} — {getPrice(r).toFixed(2)} $L/unit
                </option>
              ))}
            </select>
            <input
              type="number"
              placeholder="Amount"
              value={buyAmount}
              onChange={(e) => setBuyAmount(e.target.value)}
              min="1"
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500"
            />
            {buyAmount && (
              <p className="text-xs text-slate-400">
                Est. cost:{" "}
                {(Number(buyAmount) * getPrice(buyResource)).toFixed(2)} $LUNAR
              </p>
            )}
            <button
              onClick={() => handleTrade("buy", buyResource, Number(buyAmount))}
              disabled={trade.isPending || !buyAmount || Number(buyAmount) <= 0}
              className="w-full rounded-lg bg-emerald-500/20 py-2 text-sm font-medium text-emerald-400 transition hover:bg-emerald-500/30 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {trade.isPending ? "Processing…" : "Place Buy Order"}
            </button>
          </div>
        </div>

        {/* Sell panel */}
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4">
          <h3 className="mb-3 text-sm font-semibold text-rose-400">
            Sell Resources
          </h3>
          <div className="space-y-3">
            <select
              value={sellResource}
              onChange={(e) =>
                setSellResource(e.target.value as typeof sellResource)
              }
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
            >
              {TRADEABLE_RESOURCES.map((r) => (
                <option key={r} value={r}>
                  {r.replace(/_/g, " ")} — {getPrice(r).toFixed(2)} $L/unit
                </option>
              ))}
            </select>
            <input
              type="number"
              placeholder="Amount"
              value={sellAmount}
              onChange={(e) => setSellAmount(e.target.value)}
              min="1"
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500"
            />
            {sellAmount && (
              <p className="text-xs text-slate-400">
                Est. revenue:{" "}
                {(Number(sellAmount) * getPrice(sellResource)).toFixed(2)}{" "}
                $LUNAR
              </p>
            )}
            <button
              onClick={() =>
                handleTrade("sell", sellResource, Number(sellAmount))
              }
              disabled={
                trade.isPending || !sellAmount || Number(sellAmount) <= 0
              }
              className="w-full rounded-lg bg-rose-500/20 py-2 text-sm font-medium text-rose-400 transition hover:bg-rose-500/30 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {trade.isPending ? "Processing…" : "Place Sell Order"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
