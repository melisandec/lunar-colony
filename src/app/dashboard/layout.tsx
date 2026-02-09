"use client";

import { Providers } from "@/components/providers";
import { Sidebar } from "@/components/dashboard/sidebar";
import { MobileNav } from "@/components/dashboard/mobile-nav";
import { ResourceBar } from "@/components/dashboard/resource-bar";
import { ToastProvider } from "@/components/dashboard/toast-provider";
import { Modal, ContextMenu } from "@/components/dashboard/modal";
import { OnboardingOrchestrator } from "@/components/onboarding";
import {
  LiveAnnouncer,
  AccessibilitySettings,
  KeyboardShortcutsDialog,
} from "@/components/accessibility";
import {
  Breadcrumbs,
  NavHistoryButtons,
} from "@/components/navigation/breadcrumbs";
import { ContextualActionBar } from "@/components/navigation/contextual-action-bar";
import { CommandPalette } from "@/components/navigation/command-palette";
import { useAccessibilityStore } from "@/stores/accessibility-store";
import { useGameStore } from "@/stores/game-store";
import { useNavHistory } from "@/stores/navigation-store";
import { usePathname, useSearchParams } from "next/navigation";
import {
  useEffect,
  useState,
  useCallback,
  type ReactNode,
  Suspense,
} from "react";

function DashboardShell({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const fid = useGameStore((s) => s.fid);
  const setFid = useGameStore((s) => s.setFid);
  const pushNav = useNavHistory((s) => s.push);

  // Accessibility preferences → data attributes on root element
  const contrastMode = useAccessibilityStore((s) => s.contrastMode);
  const colorblindMode = useAccessibilityStore((s) => s.colorblindMode);
  const textScale = useAccessibilityStore((s) => s.textScale);
  const reducedMotion = useAccessibilityStore((s) => s.reducedMotion);
  const largeTouchTargets = useAccessibilityStore((s) => s.largeTouchTargets);

  // Settings panel toggle
  const [a11yOpen, setA11yOpen] = useState(false);

  // Track navigation history
  useEffect(() => {
    pushNav(pathname);
  }, [pathname, pushNav]);

  // Handle quick actions from command palette
  const handleQuickAction = useCallback((actionId: string) => {
    switch (actionId) {
      case "collect":
        // Trigger collect resources
        break;
      case "build":
        // Open build menu
        break;
      case "settings":
        setA11yOpen(true);
        break;
      case "shortcuts":
        // KeyboardShortcutsDialog listens to its own trigger
        break;
    }
  }, []);

  // Apply text scale as CSS custom property
  useEffect(() => {
    document.documentElement.style.setProperty(
      "--a11y-text-scale",
      String(textScale),
    );
  }, [textScale]);

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
    <div
      className="flex h-dvh overflow-hidden bg-slate-950 text-white"
      data-contrast={contrastMode}
      data-colorblind={colorblindMode}
      data-reduced-motion={reducedMotion ? "true" : "false"}
      data-large-targets={largeTouchTargets ? "true" : "false"}
    >
      {/* Skip to main content — visible on focus */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      {/* Desktop sidebar */}
      <Sidebar onOpenA11y={() => setA11yOpen(true)} />

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <ResourceBar />

        {/* Navigation bar (breadcrumbs + history + contextual tabs) */}
        <div className="flex flex-col gap-1 border-b border-slate-800/40 px-4 py-2">
          <div className="flex items-center gap-2">
            <NavHistoryButtons />
            <Breadcrumbs />
          </div>
          <ContextualActionBar />
        </div>

        <main
          id="main-content"
          aria-label="Dashboard content"
          className="flex-1 overflow-y-auto overflow-x-hidden p-4 pb-20 lg:pb-4"
        >
          {children}
        </main>
      </div>

      {/* Mobile / Tablet bottom nav */}
      <MobileNav />

      {/* Overlays */}
      <ToastProvider />
      <Modal />
      <ContextMenu />
      <CommandPalette onAction={handleQuickAction} />

      {/* Onboarding layers (welcome, tutorial, tips, welcome-back) */}
      <OnboardingOrchestrator />

      {/* Accessibility layers */}
      <LiveAnnouncer />
      <AccessibilitySettings
        open={a11yOpen}
        onClose={() => setA11yOpen(false)}
      />
      <KeyboardShortcutsDialog />
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
          <span className="text-5xl" aria-hidden="true">
            🌙
          </span>
          <h1 className="mt-3 text-2xl font-bold text-cyan-400">
            Lunar Colony Dashboard
          </h1>
          <p id="fid-help" className="mt-2 text-sm text-slate-400">
            Enter your Farcaster FID to access your colony.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label htmlFor="fid-input" className="sr-only">
            Farcaster FID
          </label>
          <input
            id="fid-input"
            name="fid"
            type="number"
            min={1}
            placeholder="e.g. 12345"
            autoFocus
            required
            aria-describedby="fid-help fid-hint"
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-center text-lg font-mono text-white placeholder:text-slate-600 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
          />
          <button
            type="submit"
            className="rounded-lg bg-cyan-600 px-6 py-3 font-semibold text-white transition hover:bg-cyan-500 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          >
            Enter Colony →
          </button>
        </form>
        <p id="fid-hint" className="mt-4 text-center text-xs text-slate-600">
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
