"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useGameStore } from "@/stores/game-store";
import { useUIStore } from "@/stores/ui-store";
import { GAME_CONSTANTS } from "@/lib/utils";

const TRADEABLE_RESOURCES = GAME_CONSTANTS.RESOURCE_TYPES.filter(
  (r) => r !== "LUNAR",
);

interface PriceAlert {
  id: string;
  resource: string;
  priceAtAlert: number;
  changePercent: number;
  direction: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

function usePlayerAlerts() {
  const fid = useGameStore((s) => s.fid);

  return useQuery<PriceAlert[]>({
    queryKey: ["alerts", fid],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/${fid}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "get-alerts" }),
      });
      if (!res.ok) throw new Error("Failed to fetch alerts");
      const data = await res.json();
      return data.alerts ?? [];
    },
    enabled: !!fid,
    staleTime: 30_000,
  });
}

function useCreateAlert() {
  const fid = useGameStore((s) => s.fid);
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      resource,
      targetPrice,
      direction,
    }: {
      resource: string;
      targetPrice: number;
      direction: "above" | "below";
    }) => {
      const res = await fetch(`/api/dashboard/${fid}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create-alert",
          resource,
          targetPrice,
          direction,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Create alert failed");
      }
      return res.json();
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["alerts", fid] });
    },
  });
}

export default function AlertsPage() {
  const { data: alerts, isLoading } = usePlayerAlerts();
  const createAlert = useCreateAlert();
  const addToast = useUIStore((s) => s.addToast);

  const [resource, setResource] = useState(
    TRADEABLE_RESOURCES[0] ?? "REGOLITH",
  );
  const [targetPrice, setTargetPrice] = useState("");
  const [direction, setDirection] = useState<"above" | "below">("above");

  const handleCreate = async () => {
    try {
      await createAlert.mutateAsync({
        resource,
        targetPrice: Number(targetPrice),
        direction,
      });
      addToast({
        type: "success",
        title: `Alert set for ${resource.replace(/_/g, " ")}`,
        icon: "🔔",
      });
      setTargetPrice("");
    } catch (err) {
      addToast({
        type: "error",
        title: "Alert creation failed",
        message: err instanceof Error ? err.message : "Unknown error",
        icon: "❌",
      });
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-bold text-white">🔔 Price Alerts</h2>
        <p className="text-sm text-slate-400">
          Get notified when resource prices hit your targets.
        </p>
      </div>

      {/* Create alert form */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-300">New Alert</h3>
        <div className="flex flex-wrap gap-2">
          <select
            value={resource}
            onChange={(e) => setResource(e.target.value as typeof resource)}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
          >
            {TRADEABLE_RESOURCES.map((r) => (
              <option key={r} value={r}>
                {r.replace(/_/g, " ")}
              </option>
            ))}
          </select>
          <select
            value={direction}
            onChange={(e) => setDirection(e.target.value as "above" | "below")}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
          >
            <option value="above">Goes above</option>
            <option value="below">Drops below</option>
          </select>
          <input
            type="number"
            placeholder="Target price"
            value={targetPrice}
            onChange={(e) => setTargetPrice(e.target.value)}
            step="0.01"
            min="0"
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-600"
          />
          <button
            onClick={handleCreate}
            disabled={
              createAlert.isPending || !targetPrice || Number(targetPrice) <= 0
            }
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {createAlert.isPending ? "Creating…" : "Create Alert"}
          </button>
        </div>
      </div>

      {/* Alert list */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-300">
          Your Alerts
        </h3>
        {isLoading ? (
          <div className="animate-pulse text-sm text-slate-500">
            Loading alerts…
          </div>
        ) : !alerts || alerts.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">
            No alerts set. Create one above to get notified of price movements.
          </p>
        ) : (
          <div className="space-y-2">
            {alerts.map((a) => (
              <div
                key={a.id}
                className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
                  a.isRead
                    ? "border-slate-800 bg-slate-800/20"
                    : "border-amber-500/20 bg-amber-500/5"
                }`}
              >
                <div>
                  <div className="text-sm font-medium text-white">
                    {a.direction === "above" ? "📈" : "📉"}{" "}
                    {a.resource.replace(/_/g, " ")} {a.direction}{" "}
                    {Number(a.priceAtAlert).toFixed(2)} $L
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {new Date(a.createdAt).toLocaleDateString()} · {a.message}
                  </div>
                </div>
                {!a.isRead && (
                  <span className="text-[10px] font-bold text-amber-400">
                    NEW
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
