"use client";

import { useState, useEffect } from "react";
import {
  isMuted,
  setMuted,
  getVolume,
  setVolume,
  playSound,
} from "@/lib/audio-engine";
import {
  isHapticsEnabled,
  setHapticsEnabled,
  haptic,
} from "@/lib/haptics-engine";

/* ---------- component ---------- */

/**
 * SoundSettings — Compact inline controls for audio volume, mute, and haptics.
 * Designed to embed inside an existing settings panel.
 */
export function SoundSettings() {
  const [muted, setMutedState] = useState(false);
  const [volume, setVolumeState] = useState(0.35);
  const [hapticsOn, setHapticsOnState] = useState(true);

  // Sync from engine state on mount
  useEffect(() => {
    setMutedState(isMuted());
    setVolumeState(getVolume());
    setHapticsOnState(isHapticsEnabled());
  }, []);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    setMutedState(next);
    if (!next) playSound("click"); // audible confirmation of unmute
  };

  const changeVolume = (v: number) => {
    setVolume(v);
    setVolumeState(v);
    playSound("click");
  };

  const toggleHaptics = () => {
    const next = !hapticsOn;
    setHapticsEnabled(next);
    setHapticsOnState(next);
    if (next) haptic("tap");
  };

  return (
    <div className="space-y-4">
      {/* Mute toggle */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-200">Sound effects</p>
          <p className="text-xs text-slate-500">
            UI clicks, chimes, and alerts
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={!muted}
          onClick={toggleMute}
          className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:outline-none min-h-[44px] min-w-[44px] items-center ${
            !muted ? "bg-cyan-600" : "bg-slate-700"
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${
              !muted ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>

      {/* Volume slider */}
      {!muted && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="volume-slider" className="text-xs text-slate-400">
              Volume
            </label>
            <span className="text-xs tabular-nums text-slate-500">
              {Math.round(volume * 100)}%
            </span>
          </div>
          <input
            id="volume-slider"
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={(e) => changeVolume(parseFloat(e.target.value))}
            className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-700 accent-cyan-500"
            aria-label="Sound volume"
          />
        </div>
      )}

      {/* Haptics toggle */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-200">Haptic feedback</p>
          <p className="text-xs text-slate-500">Vibration on mobile devices</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={hapticsOn}
          onClick={toggleHaptics}
          className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:outline-none min-h-[44px] min-w-[44px] items-center ${
            hapticsOn ? "bg-cyan-600" : "bg-slate-700"
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${
              hapticsOn ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>

      {/* Test button */}
      <button
        type="button"
        onClick={() => {
          playSound("success");
          haptic("success");
        }}
        className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2 text-xs text-slate-400 transition hover:bg-slate-700 hover:text-slate-200 focus-visible:ring-2 focus-visible:ring-cyan-500 min-h-[44px]"
      >
        🔊 Test sounds &amp; haptic
      </button>
    </div>
  );
}
