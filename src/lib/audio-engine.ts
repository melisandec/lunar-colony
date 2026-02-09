/**
 * Audio Engine — Web Audio API based sound system for Lunar Colony Tycoon.
 *
 * All sounds are synthesized procedurally (no external files needed).
 * Respects user preferences: muted state + reduced-motion disables audio.
 */

/* ---------- types ---------- */

export type SoundName =
  | "click"
  | "hover"
  | "success"
  | "error"
  | "collect"
  | "levelUp"
  | "build"
  | "upgrade"
  | "trade"
  | "achievement"
  | "event";

/* ---------- context management ---------- */

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let _muted = false;
let _volume = 0.35; // 0-1

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    try {
      ctx = new (
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext
      )();
      masterGain = ctx.createGain();
      masterGain.gain.value = _volume;
      masterGain.connect(ctx.destination);
    } catch {
      return null;
    }
  }
  // Resume if suspended (autoplay policy)
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

function out(): GainNode | null {
  getContext();
  return masterGain;
}

/* ---------- public API ---------- */

export function setMuted(muted: boolean) {
  _muted = muted;
}
export function isMuted(): boolean {
  return _muted;
}

export function setVolume(v: number) {
  _volume = Math.max(0, Math.min(1, v));
  if (masterGain) masterGain.gain.value = _volume;
}
export function getVolume() {
  return _volume;
}

/**
 * Play a named sound effect. Returns immediately; audio plays asynchronously.
 * No-ops when muted or if Web Audio is unavailable.
 */
export function playSound(name: SoundName) {
  if (_muted) return;
  const c = getContext();
  const o = out();
  if (!c || !o) return;

  switch (name) {
    case "click":
      return synthClick(c, o);
    case "hover":
      return synthHover(c, o);
    case "success":
      return synthSuccess(c, o);
    case "error":
      return synthError(c, o);
    case "collect":
      return synthCollect(c, o);
    case "levelUp":
      return synthLevelUp(c, o);
    case "build":
      return synthBuild(c, o);
    case "upgrade":
      return synthUpgrade(c, o);
    case "trade":
      return synthTrade(c, o);
    case "achievement":
      return synthAchievement(c, o);
    case "event":
      return synthEvent(c, o);
  }
}

/* ---------- synthesizers ---------- */

/** Utility: schedule a short oscillator burst */
function beep(
  c: AudioContext,
  dest: AudioNode,
  freq: number,
  start: number,
  duration: number,
  type: OscillatorType = "sine",
  volume = 0.3,
) {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  osc.connect(gain);
  gain.connect(dest);
  osc.start(start);
  osc.stop(start + duration);
}

/** Utility: noise burst (white noise) */
function noiseBurst(
  c: AudioContext,
  dest: AudioNode,
  start: number,
  duration: number,
  volume = 0.08,
) {
  const bufferSize = c.sampleRate * duration;
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  const gain = c.createGain();
  src.buffer = buffer;
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  src.connect(gain);
  gain.connect(dest);
  src.start(start);
  src.stop(start + duration);
}

/* ---- individual sounds ---- */

/** Soft UI click — short high-freq ping */
function synthClick(c: AudioContext, dest: AudioNode) {
  const t = c.currentTime;
  beep(c, dest, 1200, t, 0.06, "sine", 0.2);
}

/** Hover — very subtle tick */
function synthHover(c: AudioContext, dest: AudioNode) {
  const t = c.currentTime;
  beep(c, dest, 2400, t, 0.03, "sine", 0.08);
}

/** Success — two ascending tones */
function synthSuccess(c: AudioContext, dest: AudioNode) {
  const t = c.currentTime;
  beep(c, dest, 523, t, 0.12, "triangle", 0.25);
  beep(c, dest, 784, t + 0.1, 0.15, "triangle", 0.25);
}

/** Error — low buzzy tone */
function synthError(c: AudioContext, dest: AudioNode) {
  const t = c.currentTime;
  beep(c, dest, 180, t, 0.2, "sawtooth", 0.15);
  beep(c, dest, 160, t + 0.05, 0.18, "sawtooth", 0.12);
}

/** Collect $LUNAR — coin-like rising cascade */
function synthCollect(c: AudioContext, dest: AudioNode) {
  const t = c.currentTime;
  const notes = [880, 1108, 1318, 1568];
  notes.forEach((f, i) => {
    beep(c, dest, f, t + i * 0.06, 0.12, "sine", 0.2);
  });
  // sparkle noise
  noiseBurst(c, dest, t, 0.08, 0.04);
}

/** Level up — triumphant arpeggio */
function synthLevelUp(c: AudioContext, dest: AudioNode) {
  const t = c.currentTime;
  const notes = [523, 659, 784, 1047];
  notes.forEach((f, i) => {
    beep(c, dest, f, t + i * 0.09, 0.2, "triangle", 0.3);
  });
  // shimmer
  beep(c, dest, 2093, t + 0.35, 0.3, "sine", 0.15);
  noiseBurst(c, dest, t + 0.3, 0.15, 0.05);
}

/** Build module — mechanical thunk + hum */
function synthBuild(c: AudioContext, dest: AudioNode) {
  const t = c.currentTime;
  noiseBurst(c, dest, t, 0.06, 0.15);
  beep(c, dest, 220, t + 0.04, 0.2, "square", 0.12);
  beep(c, dest, 330, t + 0.15, 0.15, "sine", 0.15);
}

/** Upgrade — ascending power-up sweep */
function synthUpgrade(c: AudioContext, dest: AudioNode) {
  const t = c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(200, t);
  osc.frequency.exponentialRampToValueAtTime(800, t + 0.25);
  gain.gain.setValueAtTime(0.12, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
  osc.connect(gain);
  gain.connect(dest);
  osc.start(t);
  osc.stop(t + 0.3);
  beep(c, dest, 800, t + 0.22, 0.15, "triangle", 0.2);
}

/** Trade — quick blip sequence (stock-ticker feel) */
function synthTrade(c: AudioContext, dest: AudioNode) {
  const t = c.currentTime;
  beep(c, dest, 660, t, 0.05, "sine", 0.2);
  beep(c, dest, 880, t + 0.08, 0.05, "sine", 0.15);
  beep(c, dest, 660, t + 0.16, 0.05, "sine", 0.2);
}

/** Achievement — fanfare */
function synthAchievement(c: AudioContext, dest: AudioNode) {
  const t = c.currentTime;
  const melody = [523, 659, 784, 1047, 1318];
  melody.forEach((f, i) => {
    beep(c, dest, f, t + i * 0.1, 0.25, "triangle", 0.25);
  });
  beep(c, dest, 1568, t + 0.5, 0.4, "sine", 0.2);
  noiseBurst(c, dest, t + 0.45, 0.2, 0.06);
}

/** Event alert — mysterious two-note chime */
function synthEvent(c: AudioContext, dest: AudioNode) {
  const t = c.currentTime;
  beep(c, dest, 440, t, 0.3, "sine", 0.2);
  beep(c, dest, 554, t + 0.2, 0.4, "sine", 0.2);
  // reverb-like tail
  beep(c, dest, 554, t + 0.35, 0.5, "sine", 0.08);
}
