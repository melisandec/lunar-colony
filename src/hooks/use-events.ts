"use client";

import { useQuery } from "@tanstack/react-query";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GameEvent {
  id: string;
  type: string;
  name: string;
  description: string;
  icon: string;
  status: string;
  startTime: string;
  endTime: string;
  modifiers: Record<string, number>;
  participantCount: number;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function useActiveEvents() {
  return useQuery<{ active: GameEvent[]; count: number }>({
    queryKey: ["events"],
    queryFn: async () => {
      const res = await fetch("/api/events/active?include=recent");
      if (!res.ok) throw new Error("Events fetch failed");
      return res.json();
    },
    refetchInterval: 60_000,
  });
}

export function useLeaderboard(
  period: "DAILY" | "WEEKLY" | "ALLTIME" = "ALLTIME",
) {
  return useQuery({
    queryKey: ["leaderboard", period],
    queryFn: async () => {
      const res = await fetch(`/api/leaderboard?period=${period}&limit=50`);
      if (!res.ok) throw new Error("Leaderboard fetch failed");
      return res.json();
    },
    staleTime: 120_000,
  });
}
