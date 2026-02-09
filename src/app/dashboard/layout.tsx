"use client";

import { Providers } from "@/components/providers";
import { Sidebar } from "@/components/dashboard/sidebar";
import { MobileNav } from "@/components/dashboard/mobile-nav";
import { ResourceBar } from "@/components/dashboard/resource-bar";
import { ToastProvider } from "@/components/dashboard/toast-provider";
import { Modal, ContextMenu } from "@/components/dashboard/modal";
import { useGameStore } from "@/stores/game-store";
import { useSearchParams } from "next/navigation";
import { useEffect, type ReactNode, Suspense } from "react";

function DashboardShell({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();
  const fid = useGameStore((s) => s.fid);
  const setFid = useGameStore((s) => s.setFid);

  // Pick up ?fid= from URL and persist
  useEffect(() => {
    const urlFid = searchParams.get("fid");
    if (urlFid) {
      const n = parseInt(urlFid, 10);
      if (!isNaN(n) && n > 0) setFid(n);
    }
  }, [searchParams, setFid]);

  // Show FID entry if none set
  if (!fid) {
    return <FidEntry />;
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-slate-950 text-white">
      {/* Desktop sidebar */}
      <Sidebar />

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <ResourceBar />
        <main className="flex-1 overflow-y-auto overflow-x-hidden pb-20 lg:pb-0">
          {children}
        </main>
      </div>

      {/* Mobile / Tablet bottom nav */}
      <MobileNav />

      {/* Overlays */}
      <ToastProvider />
      <Modal />
      <ContextMenu />
    </div>
  );
}

function FidEntry() {
  const setFid = useGameStore((s) => s.setFid);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const val = parseInt(form.get("fid") as string, 10);
    if (!isNaN(val) && val > 0) setFid(val);
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-950 text-white">
      <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900/50 p-8">
        <div className="mb-6 text-center">
          <span className="text-5xl">🌙</span>
          <h1 className="mt-3 text-2xl font-bold text-cyan-400">
            Lunar Colony Dashboard
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Enter your Farcaster FID to access your colony.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            name="fid"
            type="number"
            min={1}
            placeholder="e.g. 12345"
            autoFocus
            required
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-center text-lg font-mono text-white placeholder:text-slate-600 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
          />
          <button
            type="submit"
            className="rounded-lg bg-cyan-600 px-6 py-3 font-semibold text-white transition hover:bg-cyan-500 active:scale-[0.98]"
          >
            Enter Colony →
          </button>
        </form>
        <p className="mt-4 text-center text-xs text-slate-600">
          Find your FID on your Warpcast profile
        </p>
      </div>
    </div>
  );
}

// Wrap in Suspense for useSearchParams
function DashboardLayoutInner({ children }: { children: ReactNode }) {
  return (
    <Suspense>
      <DashboardShell>{children}</DashboardShell>
    </Suspense>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <Providers>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </Providers>
  );
}
