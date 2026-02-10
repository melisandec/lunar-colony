"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

// ---------------------------------------------------------------------------
// Types mirroring the game engine / API responses
// ---------------------------------------------------------------------------

export interface DashboardModule {
  id: string;
  type: string;
  tier: string;
  level: number;
  coordinates: { x: number; y: number };
  baseOutput: number;
  bonusOutput: number;
  efficiency: number;
  isActive: boolean;
}

export interface DashboardCrew {
  id: string;
  name: string;
  role: string;
  level: number;
  specialty: string | null;
  efficiencyBonus: number;
  outputBonus: number;
  assignedModuleId: string | null;
  isActive: boolean;
}

export interface PlayerResource {
  type: string;
  amount: number;
  totalMined: number;
}

export interface ColonyData {
  playerId: string;
  playerName: string;
  level: number;
  xp: number;
  xpForNextLevel: number;
  lunarBalance: number;
  modules: DashboardModule[];
  crew: DashboardCrew[];
  resources: PlayerResource[];
  productionRate: number;
  pendingEarnings: number;
  lastCollectedAt: string;
  dailyStreak: number;
  efficiency: number;
  rank: number | null;
}

export interface ProductionLogEntry {
  date: string;
  resource: string;
  totalProduced: number;
  totalCollected: number;
  activeModules: number;
  avgEfficiency: number;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

interface GameState {
  /** Farcaster ID of the logged-in player */
  fid: number | null;
  setFid: (fid: number) => void;
  clearFid: () => void;

  /** Colony data fetched from the API */
  colony: ColonyData | null;
  setColony: (data: ColonyData) => void;

  /** Currently selected module (for detail panel) */
  selectedModuleId: string | null;
  selectModule: (id: string | null) => void;

  /** Selected resource in market view */
  selectedResource: string;
  setSelectedResource: (r: string) => void;

  /** Optimistic pending earnings counter */
  localPending: number;
  setLocalPending: (n: number) => void;
}

export const useGameStore = create<GameState>()(
  persist(
    (set) => ({
      fid: null,
      setFid: (fid) => set({ fid }),
      clearFid: () => set({ fid: null, colony: null }),

      colony: null,
      setColony: (data) => set({ colony: data }),

      selectedModuleId: null,
      selectModule: (id) => set({ selectedModuleId: id }),

      selectedResource: "REGOLITH",
      setSelectedResource: (r) => set({ selectedResource: r }),

      localPending: 0,
      setLocalPending: (n) => set({ localPending: n }),
    }),
    {
      name: "lunar-colony-game",
      partialize: (state) => ({
        fid: state.fid,
        selectedResource: state.selectedResource,
      }),
    },
  ),
);
