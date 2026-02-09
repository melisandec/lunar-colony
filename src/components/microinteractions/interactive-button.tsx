"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { forwardRef, useCallback, useState, type ReactNode } from "react";
import { useFeedback } from "@/hooks/use-feedback";
import { useReducedMotion } from "@/stores/accessibility-store";

/* ---------- types ---------- */

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
type ButtonSize = "sm" | "md" | "lg";
type ButtonState = "idle" | "loading" | "success" | "error";

interface InteractiveButtonProps extends Omit<
  HTMLMotionProps<"button">,
  "children"
> {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Override the visual state. Resets to idle after 1.5 s. */
  state?: ButtonState;
  /** 0–100 progress while loading */
  progress?: number;
  /** Play sound + haptic on click */
  sound?: boolean;
  /** Full width */
  block?: boolean;
}

/* ---------- style maps ---------- */

const BASE =
  "relative inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:outline-none select-none overflow-hidden";

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-cyan-600 text-white hover:bg-cyan-500 active:bg-cyan-700 disabled:bg-slate-700 disabled:text-slate-500",
  secondary:
    "bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 disabled:bg-slate-800/50 disabled:text-slate-600",
  danger:
    "bg-red-600/80 text-white hover:bg-red-500 disabled:bg-slate-700 disabled:text-slate-500",
  ghost:
    "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 disabled:text-slate-600",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-xs min-w-[44px]",
  md: "h-11 px-5 text-sm min-w-[44px]",
  lg: "h-13 px-7 text-base min-w-[44px]",
};

const STATE_COLORS: Record<ButtonState, string | null> = {
  idle: null,
  loading: null,
  success: "bg-emerald-600 text-white",
  error: "bg-red-600 text-white",
};

/* ---------- sub-components ---------- */

function Spinner({ size }: { size: ButtonSize }) {
  const dim =
    size === "sm" ? "h-3.5 w-3.5" : size === "lg" ? "h-5 w-5" : "h-4 w-4";
  return (
    <svg
      className={`${dim} animate-spin`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z"
      />
    </svg>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="absolute bottom-0 left-0 h-0.5 w-full bg-white/10">
      <motion.div
        className="h-full bg-white/50"
        initial={{ width: "0%" }}
        animate={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      />
    </div>
  );
}

function StateIcon({ state }: { state: "success" | "error" }) {
  if (state === "success") {
    return (
      <motion.svg
        className="h-4 w-4"
        viewBox="0 0 20 20"
        fill="currentColor"
        initial={{ scale: 0, rotate: -90 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 500, damping: 20 }}
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
          clipRule="evenodd"
        />
      </motion.svg>
    );
  }
  return (
    <motion.svg
      className="h-4 w-4"
      viewBox="0 0 20 20"
      fill="currentColor"
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 500, damping: 20 }}
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
        clipRule="evenodd"
      />
    </motion.svg>
  );
}

/* ---------- component ---------- */

export const InteractiveButton = forwardRef<
  HTMLButtonElement,
  InteractiveButtonProps
>(function InteractiveButton(
  {
    children,
    variant = "primary",
    size = "md",
    state: controlledState,
    progress,
    sound = true,
    block = false,
    className = "",
    onClick,
    onPointerEnter,
    disabled,
    ...rest
  },
  ref,
) {
  const fb = useFeedback();
  const reduced = useReducedMotion();
  const [internalState, setInternalState] = useState<ButtonState>("idle");
  const state = controlledState ?? internalState;

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      if (state === "loading") return;
      if (sound) fb.click();
      onClick?.(e as never);
    },
    [state, sound, fb, onClick],
  );

  const handleHover = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      if (sound) fb.hover();
      onPointerEnter?.(e as never);
    },
    [sound, fb, onPointerEnter],
  );

  /** Imperative API — call from parent via ref + setButtonState */
  // Expose a way for parents to trigger states
  const triggerState = useCallback(
    (s: ButtonState, duration = 1500) => {
      setInternalState(s);
      if (s === "success" || s === "error") {
        if (s === "success") fb.success();
        else fb.error();
        setTimeout(() => setInternalState("idle"), duration);
      }
    },
    [fb],
  );

  // Attach to DOM element for external access
  const setRef = useCallback(
    (el: HTMLButtonElement | null) => {
      if (el)
        (el as unknown as { triggerState: typeof triggerState }).triggerState =
          triggerState;
      if (typeof ref === "function") ref(el);
      else if (ref)
        (ref as React.MutableRefObject<HTMLButtonElement | null>).current = el;
    },
    [ref, triggerState],
  );

  const isDisabled = disabled || state === "loading";
  const stateOverride = STATE_COLORS[state];

  return (
    <motion.button
      ref={setRef}
      className={[
        BASE,
        VARIANTS[variant],
        SIZES[size],
        stateOverride,
        block && "w-full",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      disabled={isDisabled}
      onClick={handleClick}
      onPointerEnter={handleHover}
      whileHover={reduced ? undefined : { scale: 1.02 }}
      whileTap={reduced ? undefined : { scale: 0.96 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      aria-busy={state === "loading"}
      {...rest}
    >
      {/* Loading spinner */}
      {state === "loading" && <Spinner size={size} />}

      {/* Success/error icon */}
      {(state === "success" || state === "error") && (
        <StateIcon state={state} />
      )}

      {/* Label — fade out during success/error to show icon */}
      <motion.span
        animate={{
          opacity: state === "success" || state === "error" ? 0.6 : 1,
        }}
        transition={{ duration: 0.15 }}
      >
        {children}
      </motion.span>

      {/* Progress bar */}
      {state === "loading" && progress !== undefined && (
        <ProgressBar value={progress} />
      )}
    </motion.button>
  );
});
