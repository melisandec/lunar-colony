"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  useAccessibilityStore,
  type ColorblindMode,
  type TextScale,
} from "@/stores/accessibility-store";
import { useState } from "react";
import { SoundSettings } from "@/components/microinteractions/sound-settings";

// ---------------------------------------------------------------------------
// Accessibility Settings Panel
//
// Floating panel toggled from the sidebar/settings. Provides controls for
// all accessibility preferences: contrast, colorblind mode, text size,
// reduced motion, large touch targets, and verbose help.
// ---------------------------------------------------------------------------

export function AccessibilitySettings({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[95] bg-black/50 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, x: 240 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 240 }}
            transition={{ type: "spring", damping: 26, stiffness: 300 }}
            role="dialog"
            aria-modal="true"
            aria-label="Accessibility settings"
            className="fixed right-0 top-0 z-[96] flex h-full w-full max-w-md flex-col border-l border-slate-800 bg-slate-950 shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
              <h2 className="text-lg font-bold text-white">
                <span aria-hidden="true" className="mr-2">
                  ♿
                </span>
                Accessibility
              </h2>
              <button
                onClick={onClose}
                aria-label="Close accessibility settings"
                className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-800 hover:text-white focus-visible:ring-2 focus-visible:ring-cyan-500"
              >
                ✕
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <VisualSection />
              <Divider />
              <MotorSection />
              <Divider />
              <AudioSection />
              <Divider />
              <CognitiveSection />
              <Divider />
              <ResetSection />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

function VisualSection() {
  const contrastMode = useAccessibilityStore((s) => s.contrastMode);
  const setContrastMode = useAccessibilityStore((s) => s.setContrastMode);
  const colorblindMode = useAccessibilityStore((s) => s.colorblindMode);
  const setColorblindMode = useAccessibilityStore((s) => s.setColorblindMode);
  const textScale = useAccessibilityStore((s) => s.textScale);
  const setTextScale = useAccessibilityStore((s) => s.setTextScale);

  return (
    <section aria-labelledby="a11y-visual">
      <h3
        id="a11y-visual"
        className="mb-3 text-sm font-semibold uppercase tracking-wider text-cyan-400"
      >
        <span aria-hidden="true" className="mr-1.5">
          👁️
        </span>
        Visual
      </h3>

      {/* High contrast */}
      <SettingRow
        label="High contrast mode"
        description="Increases border and text contrast for better readability."
      >
        <ToggleSwitch
          checked={contrastMode === "high"}
          onChange={(v) => setContrastMode(v ? "high" : "normal")}
          label="Enable high contrast"
        />
      </SettingRow>

      {/* Colorblind mode */}
      <SettingRow
        label="Colorblind palette"
        description="Replaces red/green indicators with blue/orange for universal visibility."
      >
        <select
          value={colorblindMode}
          onChange={(e) => setColorblindMode(e.target.value as ColorblindMode)}
          aria-label="Colorblind palette"
          className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus-visible:ring-2 focus-visible:ring-cyan-500"
        >
          <option value="none">Off</option>
          <option value="deuteranopia">Deuteranopia (red-green)</option>
          <option value="protanopia">Protanopia (red-green)</option>
          <option value="tritanopia">Tritanopia (blue-yellow)</option>
        </select>
      </SettingRow>

      {/* Text scale */}
      <SettingRow
        label="Text size"
        description="Scale text up for improved readability."
      >
        <div className="flex gap-1.5" role="radiogroup" aria-label="Text size">
          {([1, 1.15, 1.3, 1.5] as TextScale[]).map((s) => (
            <button
              key={s}
              role="radio"
              aria-checked={textScale === s}
              onClick={() => setTextScale(s)}
              className={`flex h-10 w-10 items-center justify-center rounded-lg border text-sm font-semibold transition
                ${textScale === s ? "border-cyan-500 bg-cyan-500/20 text-cyan-400" : "border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600"}`}
            >
              {s === 1 ? "A" : s === 1.15 ? "A⁺" : s === 1.3 ? "A⁺⁺" : "A⁺⁺⁺"}
            </button>
          ))}
        </div>
      </SettingRow>
    </section>
  );
}

function MotorSection() {
  const reducedMotion = useAccessibilityStore((s) => s.reducedMotion);
  const setReducedMotion = useAccessibilityStore((s) => s.setReducedMotion);
  const largeTouchTargets = useAccessibilityStore((s) => s.largeTouchTargets);
  const setLargeTouchTargets = useAccessibilityStore(
    (s) => s.setLargeTouchTargets,
  );

  return (
    <section aria-labelledby="a11y-motor">
      <h3
        id="a11y-motor"
        className="mb-3 text-sm font-semibold uppercase tracking-wider text-cyan-400"
      >
        <span aria-hidden="true" className="mr-1.5">
          🖐️
        </span>
        Motor
      </h3>

      <SettingRow
        label="Reduced motion"
        description="Disables animations and transitions throughout the interface."
      >
        <ToggleSwitch
          checked={reducedMotion}
          onChange={setReducedMotion}
          label="Enable reduced motion"
        />
      </SettingRow>

      <SettingRow
        label="Large touch targets"
        description="Enlarges buttons and interactive elements to minimum 48×48px."
      >
        <ToggleSwitch
          checked={largeTouchTargets}
          onChange={setLargeTouchTargets}
          label="Enable large touch targets"
        />
      </SettingRow>
    </section>
  );
}

function AudioSection() {
  return (
    <section aria-labelledby="a11y-audio">
      <h3
        id="a11y-audio"
        className="mb-3 text-sm font-semibold uppercase tracking-wider text-cyan-400"
      >
        <span aria-hidden="true" className="mr-1.5">
          🔊
        </span>
        Audio &amp; Haptics
      </h3>
      <SoundSettings />
    </section>
  );
}

function CognitiveSection() {
  const verboseHelp = useAccessibilityStore((s) => s.verboseHelp);
  const setVerboseHelp = useAccessibilityStore((s) => s.setVerboseHelp);

  return (
    <section aria-labelledby="a11y-cognitive">
      <h3
        id="a11y-cognitive"
        className="mb-3 text-sm font-semibold uppercase tracking-wider text-cyan-400"
      >
        <span aria-hidden="true" className="mr-1.5">
          🧠
        </span>
        Cognitive
      </h3>

      <SettingRow
        label="Verbose help text"
        description="Shows extended descriptions and action confirmations."
      >
        <ToggleSwitch
          checked={verboseHelp}
          onChange={setVerboseHelp}
          label="Enable verbose help"
        />
      </SettingRow>

      <div className="mt-3 rounded-lg border border-slate-800 bg-slate-900/50 p-3">
        <p className="text-xs leading-relaxed text-slate-400">
          <strong className="text-slate-300">Keyboard shortcuts:</strong> Press{" "}
          <kbd className="rounded border border-slate-700 bg-slate-800 px-1 py-0.5 font-mono text-[10px]">
            ?
          </kbd>{" "}
          anywhere to view all available shortcuts. Use{" "}
          <kbd className="rounded border border-slate-700 bg-slate-800 px-1 py-0.5 font-mono text-[10px]">
            Tab
          </kbd>{" "}
          to navigate between elements.
        </p>
      </div>
    </section>
  );
}

function ResetSection() {
  const reset = useAccessibilityStore((s) => s.resetA11y);
  const [confirmed, setConfirmed] = useState(false);

  const handleReset = () => {
    if (confirmed) {
      reset();
      setConfirmed(false);
    } else {
      setConfirmed(true);
      setTimeout(() => setConfirmed(false), 3000);
    }
  };

  return (
    <div className="pt-2">
      <button
        onClick={handleReset}
        className="w-full rounded-lg border border-slate-800 bg-slate-900 px-4 py-3 text-sm font-medium text-slate-400 transition hover:border-slate-700 hover:text-slate-300 focus-visible:ring-2 focus-visible:ring-cyan-500"
        aria-label={
          confirmed
            ? "Confirm reset accessibility settings"
            : "Reset accessibility settings to defaults"
        }
      >
        {confirmed ? "Click again to confirm reset" : "Reset to Defaults"}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared components
// ---------------------------------------------------------------------------

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <div className="flex-1">
        <div className="text-sm font-medium text-white">{label}</div>
        <div className="mt-0.5 text-xs leading-relaxed text-slate-500">
          {description}
        </div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function ToggleSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950
        ${checked ? "bg-cyan-600" : "bg-slate-700"}`}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform
          ${checked ? "translate-x-5" : "translate-x-0.5"}`}
      />
    </button>
  );
}

function Divider() {
  return <hr className="my-5 border-slate-800/60" />;
}
