"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useGameStore } from "@/stores/game-store";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AllianceMemberData {
  id: string;
  playerId: string;
  role: "LEADER" | "OFFICER" | "MEMBER";
  joinedAt: string;
  player: {
    username: string | null;
    level: number;
    totalEarnings: number;
  };
}

export interface AllianceData {
  id: string;
  name: string;
  description: string | null;
  level: number;
  totalLunar: number;
  memberCount: number;
  maxMembers: number;
  members: AllianceMemberData[];
}

export interface AllianceListItem {
  id: string;
  name: string;
  description: string | null;
  level: number;
  memberCount: number;
  maxMembers: number;
}

// ---------------------------------------------------------------------------
// Player alliance query
// ---------------------------------------------------------------------------

export function usePlayerAlliance() {
  const fid = useGameStore((s) => s.fid);

  return useQuery<AllianceData | null>({
    queryKey: ["alliance", fid],
    queryFn: async () => {
      const res = await fetch(`/api/alliance?fid=${fid}`);
      if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error("Failed to fetch alliance");
      }
      return res.json();
    },
    enabled: !!fid,
    staleTime: 30_000,
  });
}

// ---------------------------------------------------------------------------
// Browse alliances
// ---------------------------------------------------------------------------

export function useAllianceList() {
  return useQuery<AllianceListItem[]>({
    queryKey: ["alliances"],
    queryFn: async () => {
      const res = await fetch("/api/alliance/list");
      if (!res.ok) throw new Error("Failed to fetch alliances");
      const data = await res.json();
      return data.alliances ?? [];
    },
    staleTime: 60_000,
  });
}

// ---------------------------------------------------------------------------
// Create alliance mutation
// ---------------------------------------------------------------------------

export function useCreateAlliance() {
  const fid = useGameStore((s) => s.fid);
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      name,
      description,
    }: {
      name: string;
      description?: string;
    }) => {
      const res = await fetch(`/api/dashboard/${fid}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create-alliance", name, description }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Create failed");
      }
      return res.json();
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["alliance", fid] });
      void qc.invalidateQueries({ queryKey: ["alliances"] });
      void qc.invalidateQueries({ queryKey: ["colony", fid] });
    },
  });
}

// ---------------------------------------------------------------------------
// Join alliance mutation
// ---------------------------------------------------------------------------

export function useJoinAlliance() {
  const fid = useGameStore((s) => s.fid);
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (allianceId: string) => {
      const res = await fetch(`/api/dashboard/${fid}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "join-alliance", allianceId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Join failed");
      }
      return res.json();
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["alliance", fid] });
      void qc.invalidateQueries({ queryKey: ["alliances"] });
    },
  });
}

// ---------------------------------------------------------------------------
// Leave alliance mutation
// ---------------------------------------------------------------------------

export function useLeaveAlliance() {
  const fid = useGameStore((s) => s.fid);
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/dashboard/${fid}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "leave-alliance" }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Leave failed");
      }
      return res.json();
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["alliance", fid] });
      void qc.invalidateQueries({ queryKey: ["alliances"] });
      void qc.invalidateQueries({ queryKey: ["colony", fid] });
    },
  });
}
