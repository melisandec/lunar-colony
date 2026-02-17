"use client";

import { Providers } from "@/components/providers";
import { IsometricColonyCompact } from "@/components/illustrations";
import { DEMO_FID } from "@/lib/utils";
import { useFarcaster } from "@/components/farcaster-provider";
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
import { ContextualActionBar, CommandPalette } from "@/components/navigation";
import { useAccessibilityStore } from "@/stores/accessibility-store";
import { useGameStore } from "@/stores/game-store";
import { useNavHistory } from "@/stores/navigation-store";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
  Suspense,
} from "react";

function DashboardShell({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const fid = useGameStore((s) => s.fid);
  const setFid = useGameStore((s) => s.setFid);
  const pushNav = useNavHistory((s) => s.push);

  // Auto-detect FID from Farcaster SDK context
  const { fid: farcasterFid, loading: farcasterLoading } = useFarcaster();

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
        // Dispatch custom event that colony page listens for
        window.dispatchEvent(new CustomEvent("lunar:collect"));
        break;
      case "build":
        window.dispatchEvent(new CustomEvent("lunar:build"));
        break;
      case "settings":
        setA11yOpen(true);
        break;
      case "shortcuts":
        window.dispatchEvent(new CustomEvent("lunar:show-shortcuts"));
        break;
    }
  }, []);

  // Global keyboard shortcuts for section navigation
  const router = useRouter();
  const navShortcuts = useMemo(
    () => [
      {
        key: "c",
        handler: () => router.push("/dashboard/colony"),
        description: "Colony view",
      },
      {
        key: "p",
        handler: () => router.push("/dashboard/production"),
        description: "Production cycle",
      },
      {
        key: "m",
        handler: () => router.push("/dashboard/market"),
        description: "Market terminal",
      },
      {
        key: "r",
        handler: () => router.push("/dashboard/research"),
        description: "Research tree",
      },
      {
        key: "a",
        handler: () => router.push("/dashboard/alliance"),
        description: "Alliance",
      },
      {
        key: "e",
        handler: () => handleQuickAction("collect"),
        description: "Collect earnings",
      },
      {
        key: "b",
        handler: () => handleQuickAction("build"),
        description: "Build module",
      },
      {
        key: "?",
        shift: true,
        handler: () => handleQuickAction("shortcuts"),
        description: "Keyboard shortcuts",
      },
    ],
    [router, handleQuickAction],
  );
  useKeyboardShortcuts(navShortcuts);

  // Apply text scale as CSS custom property
  useEffect(() => {
    document.documentElement.style.setProperty(
      "--a11y-text-scale",
      String(textScale),
    );
  }, [textScale]);

  // Auto-set FID from Farcaster SDK context
  useEffect(() => {
    if (!fid && farcasterFid) {
      setFid(farcasterFid);
    }
  }, [fid, farcasterFid, setFid]);

  // Pick up ?fid= from URL and persist (guard to prevent loop: only set when value would change)
  useEffect(() => {
    const urlFid = searchParams.get("fid");
    if (!urlFid) return;
    const n = parseInt(urlFid, 10);
    if (isNaN(n) || n <= 0) return;
    if (n === fid) return;
    setFid(n);
  }, [searchParams, setFid, fid]);

  // While Farcaster SDK is still detecting, show a loading state
  // instead of flashing the FID entry form
  if (!fid && farcasterLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center gap-4">
          <IsometricColonyCompact variant="compact" animated className="h-24 w-32" />
          <p className="animate-pulse text-sm text-slate-400">
            Connecting to Farcaster…
          </p>
        </div>
      </div>
    );
  }

  // Show FID entry only as fallback (not in Mini App / no SDK context)
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

        {/* Navigation bar (history + contextual tabs) */}
        <div className="flex flex-col gap-0 border-b border-slate-800/30 px-2 py-1 sm:gap-1 sm:px-4 sm:py-2">
          <ContextualActionBar />
        </div>

        <main
          id="main-content"
          aria-label="Dashboard content"
          className="flex-1 overflow-y-auto overflow-x-hidden p-3 pb-20 sm:p-4 sm:pb-24 lg:pb-4"
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
        <div className="mb-6 flex flex-col items-center text-center">
          <IsometricColonyCompact variant="card" animated={false} className="mb-3 h-20 w-28" />
          <h1 className="text-2xl font-bold text-cyan-400">
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
          <div className="flex flex-col gap-2">
            <button
              type="submit"
              className="rounded-lg bg-cyan-600 px-6 py-3 font-semibold text-white transition hover:bg-cyan-500 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              Enter Colony →
            </button>
            <button
              type="button"
              onClick={() => setFid(DEMO_FID)}
              className="rounded-lg border border-slate-600 px-6 py-2.5 text-sm font-medium text-slate-400 transition hover:border-slate-500 hover:bg-slate-800/50 hover:text-slate-300"
            >
              Use Demo (FID {DEMO_FID}) for testing
            </button>
          </div>
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
