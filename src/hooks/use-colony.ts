"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useGameStore, type ColonyData } from "@/stores/game-store";

// ---------------------------------------------------------------------------
// Colony data query
// ---------------------------------------------------------------------------

async function fetchColony(fid: number): Promise<ColonyData> {
  const res = await fetch(`/api/dashboard/${fid}`);
  if (!res.ok) throw new Error(`Colony fetch failed: ${res.status}`);
  return res.json();
}

export function useColony() {
  const fid = useGameStore((s) => s.fid);
  const setColony = useGameStore((s) => s.setColony);

  return useQuery({
    queryKey: ["colony", fid],
    queryFn: async () => {
      const data = await fetchColony(fid!);
      setColony(data);
      return data;
    },
    enabled: !!fid,
    refetchInterval: 30_000,
  });
}

// ---------------------------------------------------------------------------
// Production history query
// ---------------------------------------------------------------------------

export interface ProductionEntry {
  date: string;
  resource: string;
  totalProduced: number;
  totalCollected: number;
  activeModules: number;
  avgEfficiency: number;
}

async function fetchProduction(fid: number): Promise<ProductionEntry[]> {
  const res = await fetch(`/api/dashboard/${fid}?include=production`);
  if (!res.ok) throw new Error(`Production fetch failed: ${res.status}`);
  const data = await res.json();
  return data.productionHistory ?? [];
}

export function useProductionHistory() {
  const fid = useGameStore((s) => s.fid);
  return useQuery({
    queryKey: ["production", fid],
    queryFn: () => fetchProduction(fid!),
    enabled: !!fid,
    staleTime: 60_000,
  });
}

// ---------------------------------------------------------------------------
// Collect earnings mutation
// ---------------------------------------------------------------------------

export function useCollectEarnings() {
  const fid = useGameStore((s) => s.fid);
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/dashboard/${fid}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "collect" }),
      });
      if (!res.ok) throw new Error("Collect failed");
      return res.json();
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["colony", fid] });
    },
  });
}

// ---------------------------------------------------------------------------
// Build module mutation
// ---------------------------------------------------------------------------

export function useBuildModule() {
  const fid = useGameStore((s) => s.fid);
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (moduleType: string) => {
      const res = await fetch(`/api/dashboard/${fid}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "build", moduleType }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Build failed");
      }
      return res.json();
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["colony", fid] });
    },
  });
}

// ---------------------------------------------------------------------------
// Reposition module mutation
// ---------------------------------------------------------------------------

export function useRepositionModule() {
  const fid = useGameStore((s) => s.fid);
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (args: { moduleId: string; x: number; y: number }) => {
      const res = await fetch(`/api/dashboard/${fid}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reposition", ...args }),
      });
      if (!res.ok) throw new Error("Reposition failed");
      return res.json();
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["colony", fid] });
    },
  });
}
