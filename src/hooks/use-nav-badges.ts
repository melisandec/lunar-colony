"use client";

import { useQuery } from "@tanstack/react-query";
import { useGameStore } from "@/stores/game-store";

/**
 * Hook for badge counts on nav tabs (Market, Alliance).
 * Returns { market, alliance } — unread alerts, new messages, etc.
 * Extend with real data when APIs are available.
 */
export function useNavBadges(): { market: number; alliance: number } {
  const fid = useGameStore((s) => s.fid);

  const { data: alerts } = useQuery({
    queryKey: ["alerts", fid],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/${fid}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "get-alerts" }),
      });
      if (!res.ok) return [];
      const data = await res.json();
      return (data.alerts ?? []) as Array<{ isRead: boolean }>;
    },
    enabled: !!fid,
    staleTime: 60_000,
  });

  const unreadAlerts = alerts?.filter((a) => !a.isRead).length ?? 0;

  return {
    market: unreadAlerts,
    alliance: 0,
  };
}
