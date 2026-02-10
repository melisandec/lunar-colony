"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { GAME_CONSTANTS } from "@/lib/utils";
import { useFarcaster } from "@/components/farcaster-provider";
import { OfflineBanner, LowBatteryBanner } from "@/components/mobile";

/**
 * Landing page for Lunar Colony Tycoon.
 * When opened inside Farcaster as a Mini App, auto-redirects to the game dashboard.
 * Otherwise shows the marketing landing page.
 */
export default function Home() {
  const { isInMiniApp, loading } = useFarcaster();
  const router = useRouter();

  useEffect(() => {
    if (!loading && isInMiniApp) {
      router.replace("/dashboard");
    }
  }, [isInMiniApp, loading, router]);

  // While detecting env inside Farcaster, show a branded loading state
  // instead of a flash of the landing page
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-950">
        <div className="text-center">
          <div className="mb-4 text-6xl">🌙</div>
          <div className="animate-pulse text-lg text-indigo-300">
            Loading colony…
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-950 text-white">
      <OfflineBanner />
      <LowBatteryBanner />
      {/* Hero Section */}
      <div
        className="flex min-h-screen flex-col items-center justify-center px-4 text-center"
        style={{
          paddingTop: "var(--safe-top, 0px)",
          paddingBottom: "var(--safe-bottom, 0px)",
        }}
      >
        <div className="mb-6 text-8xl">🌙</div>
        <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl md:text-7xl">
          Lunar Colony
          <span className="block bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            Tycoon
          </span>
        </h1>
        <p className="mb-8 max-w-lg text-base sm:text-lg text-indigo-200/80">
          Build your lunar industrial empire directly in Farcaster. Construct
          modules, mine resources, and earn{" "}
          <span className="font-semibold text-yellow-400">$LUNAR</span> tokens.
        </p>

        {/* CTA */}
        <div className="flex flex-col gap-4 sm:flex-row">
          <a
            href="https://warpcast.com"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-indigo-600 px-8 py-4 text-lg font-semibold transition active:scale-95 hover:bg-indigo-500"
            style={{ minWidth: 60, minHeight: 60 }}
          >
            🚀 Play on Farcaster
          </a>
          <Link
            href="/1"
            className="rounded-full border border-indigo-600 px-8 py-4 text-lg font-semibold transition active:scale-95 hover:bg-indigo-900/50"
            style={{ minWidth: 60, minHeight: 60 }}
          >
            👀 View Demo Colony
          </Link>
        </div>

        {/* Stats Preview */}
        <div className="mt-16 grid grid-cols-2 gap-6 md:grid-cols-4">
          {[
            {
              label: "Module Types",
              value: GAME_CONSTANTS.MODULE_TYPES.length,
              icon: "🏗️",
            },
            {
              label: "Max Modules",
              value: GAME_CONSTANTS.MAX_MODULES,
              icon: "📦",
            },
            {
              label: "Starting $LUNAR",
              value: GAME_CONSTANTS.STARTING_LUNAR,
              icon: "💰",
            },
            { label: "Tick Interval", value: "5 min", icon: "⏱️" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-indigo-800/50 bg-slate-900/50 p-4 text-center"
            >
              <div className="text-2xl">{stat.icon}</div>
              <div className="mt-1 text-2xl font-bold">{stat.value}</div>
              <div className="text-xs text-indigo-300/70">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* How It Works */}
      <section className="mx-auto max-w-4xl px-4 py-20">
        <h2 className="mb-12 text-center text-3xl font-bold">How It Works</h2>
        <div className="grid gap-8 md:grid-cols-3">
          {[
            {
              step: "1",
              title: "Start Your Colony",
              desc: "Open the Frame on Farcaster to create your lunar base with a free Solar Panel.",
              icon: "🌙",
            },
            {
              step: "2",
              title: "Build & Expand",
              desc: "Construct modules like Mining Rigs, Habitats, and Research Labs to boost production.",
              icon: "🔨",
            },
            {
              step: "3",
              title: "Earn $LUNAR",
              desc: "Your colony produces $LUNAR every 5 minutes. Collect and reinvest to grow faster!",
              icon: "💰",
            },
          ].map((item) => (
            <div
              key={item.step}
              className="rounded-xl border border-indigo-800/30 bg-slate-900/30 p-6 text-center"
            >
              <div className="mb-3 text-4xl">{item.icon}</div>
              <h3 className="mb-2 text-xl font-semibold">{item.title}</h3>
              <p className="text-sm text-indigo-200/60">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-indigo-900/30 py-8 text-center text-sm text-indigo-300/40">
        <p>Lunar Colony Tycoon — A Farcaster Frame Game</p>
        <p className="mt-1">
          $LUNAR is an in-game token only. Not a real cryptocurrency.
        </p>
      </footer>
    </div>
  );
}
