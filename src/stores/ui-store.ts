"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

// ---------------------------------------------------------------------------
// Toast system
// ---------------------------------------------------------------------------

export interface Toast {
  id: string;
  type: "success" | "error" | "warning" | "info";
  title: string;
  message?: string;
  icon?: string;
  duration?: number; // ms, 0 = sticky
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

interface UIState {
  /** Sidebar collapsed (desktop) */
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;

  /** Modal */
  modalOpen: boolean;
  modalContent: React.ReactNode | null;
  openModal: (content: React.ReactNode) => void;
  closeModal: () => void;

  /** Context menu */
  contextMenu: { x: number; y: number; items: ContextMenuItem[] } | null;
  openContextMenu: (x: number, y: number, items: ContextMenuItem[]) => void;
  closeContextMenu: () => void;

  /** Toasts */
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
}

export interface ContextMenuItem {
  label: string;
  icon?: string;
  action: () => void;
  danger?: boolean;
}

let toastCounter = 0;

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      toggleSidebar: () =>
        set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

      modalOpen: false,
      modalContent: null,
      openModal: (content) => set({ modalOpen: true, modalContent: content }),
      closeModal: () => set({ modalOpen: false, modalContent: null }),

      contextMenu: null,
      openContextMenu: (x, y, items) => set({ contextMenu: { x, y, items } }),
      closeContextMenu: () => set({ contextMenu: null }),

      toasts: [],
      addToast: (toast) => {
        const id = `toast_${++toastCounter}_${Date.now()}`;
        set((s) => ({
          toasts: [...s.toasts, { ...toast, id }],
        }));
        // Auto-remove after duration (default 4s)
        const dur = toast.duration ?? 4000;
        if (dur > 0) {
          setTimeout(() => {
            set((s) => ({
              toasts: s.toasts.filter((t) => t.id !== id),
            }));
          }, dur);
        }
      },
      removeToast: (id) =>
        set((s) => ({
          toasts: s.toasts.filter((t) => t.id !== id),
        })),
    }),
    {
      name: "lunar-colony-ui",
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    },
  ),
);
