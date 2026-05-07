/**
 * Holocron procedural audio engine — Web Audio API only, no sample assets.
 *
 * Autoplay policy: AudioContext is constructed lazily on the first user gesture
 * that triggers setEnabled(true) or play(). If the user had audio enabled in a
 * previous session (localStorage key present), we mark intent but do NOT create
 * the context until a gesture actually occurs.
 */

export type AudioCue =
  | "tick"    // light click for hover-into-action
  | "select"  // confirming chord — entity selected
  | "pivot"   // bigger swell — view changed / cross-pivot
  | "open"    // command palette / search opened
  | "close"   // dismiss
  | "route"   // hyperspace route plotted
  | "error";  // gentle deny

// ─── Constants ───────────────────────────────────────────────────────────────

const STORAGE_KEY = "holocron:audio_enabled";
const MASTER_GAIN = 0.35;

// ─── Module-level state ───────────────────────────────────────────────────────

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let ambientStarted = false;

// Ambient nodes (kept alive so we can ramp gain rather than recreate)
let ambientGain: GainNode | null = null;
let ambientOsc1: OscillatorNode | null = null;
let ambientOsc2: OscillatorNode | null = null;
let ambientLPF: BiquadFilterNode | null = null;
let ambientPanner: StereoPannerNode | null = null;
let ambientLFOFilter: OscillatorNode | null = null;
let ambientLFOFilterGain: GainNode | null = null;
let ambientLFOPan: OscillatorNode | null = null;
let ambientLFOPanGain: GainNode | null = null;

// Whether the user has opted in (persisted intent)
let _enabled = false;
// Whether we've actually constructed the AudioContext yet
let _contextReady = false;

// ─── localStorage init ────────────────────────────────────────────────────────

// Run once at module load in browser; marks intent without touching AudioContext.
if (typeof window !== "undefined") {
  _enabled = window.localStorage.getItem(STORAGE_KEY) === "1";
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function ensureContext(): AudioContext {
  if (ctx && _contextReady) return ctx;

  ctx = new AudioContext();
  masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(MASTER_GAIN, ctx.currentTime);
  masterGain.connect(ctx.destination);
  _contextReady = true;

  // If ambient was "requested" before the context existed, start it now.
  if (_enabled && !ambientStarted) {
    _startAmbientInternal();
  }

  return ctx;
}

function _startAmbientInternal(): void {
  if (!ctx || !masterGain || ambientStarted) return;

  const now = ctx.currentTime;

  // Ambient gain node (separate from master so we can fade independently)
  ambientGain = ctx.createGain();
  ambientGain.gain.setValueAtTime(0.0001, now);
  ambientGain.gain.exponentialRampToValueAtTime(0.28, now + 2.0); // slow fade-in

  // Low-pass filter — breathing modulated by LFO
  ambientLPF = ctx.createBiquadFilter();
  ambientLPF.type = "lowpass";
  ambientLPF.frequency.setValueAtTime(750, now);
  ambientLPF.Q.setValueAtTime(1.2, now);

  // Stereo panner
  ambientPanner = ctx.createStereoPanner();
  ambientPanner.pan.setValueAtTime(0, now);

  // Osc 1: 55 Hz fundamental sine
  ambientOsc1 = ctx.createOscillator();
  ambientOsc1.type = "sine";
  ambientOsc1.frequency.setValueAtTime(55, now);
  ambientOsc1.detune.setValueAtTime(0, now);

  // Osc 2: 110 Hz octave, slightly detuned for beating
  ambientOsc2 = ctx.createOscillator();
  ambientOsc2.type = "sine";
  ambientOsc2.frequency.setValueAtTime(110, now);
  ambientOsc2.detune.setValueAtTime(7, now); // +7 cents — creates slow beating

  // Filter cutoff LFO: 0.1 Hz sine, modulating between 600–900 Hz
  // Centre = 750, depth = ±150 → use a gain node with value 150
  ambientLFOFilter = ctx.createOscillator();
  ambientLFOFilter.type = "sine";
  ambientLFOFilter.frequency.setValueAtTime(0.1, now);

  ambientLFOFilterGain = ctx.createGain();
  ambientLFOFilterGain.gain.setValueAtTime(150, now);

  // Panner LFO: 0.05 Hz sine, ±0.3
  ambientLFOPan = ctx.createOscillator();
  ambientLFOPan.type = "sine";
  ambientLFOPan.frequency.setValueAtTime(0.05, now);

  ambientLFOPanGain = ctx.createGain();
  ambientLFOPanGain.gain.setValueAtTime(0.3, now);

  // Routing: oscs → LPF → ambientGain → panner → master
  ambientOsc1.connect(ambientLPF);
  ambientOsc2.connect(ambientLPF);
  ambientLPF.connect(ambientGain);
  ambientGain.connect(ambientPanner);
  ambientPanner.connect(masterGain);

  // LFO routing
  ambientLFOFilter.connect(ambientLFOFilterGain);
  ambientLFOFilterGain.connect(ambientLPF.frequency);

  ambientLFOPan.connect(ambientLFOPanGain);
  ambientLFOPanGain.connect(ambientPanner.pan);

  // Start all oscillators
  ambientOsc1.start(now);
  ambientOsc2.start(now);
  ambientLFOFilter.start(now);
  ambientLFOPan.start(now);

  ambientStarted = true;
}

function _stopAmbientInternal(): void {
  if (!ctx || !ambientGain || !ambientStarted) return;

  const now = ctx.currentTime;
  const fadeOut = now + 1.2;

  // Fade out gracefully
  ambientGain.gain.setValueAtTime(ambientGain.gain.value, now);
  ambientGain.gain.exponentialRampToValueAtTime(0.0001, fadeOut);

  // Stop oscillators after fade
  const stopTime = fadeOut + 0.05;
  ambientOsc1?.stop(stopTime);
  ambientOsc2?.stop(stopTime);
  ambientLFOFilter?.stop(stopTime);
  ambientLFOPan?.stop(stopTime);

  ambientStarted = false;
  ambientGain = null;
  ambientOsc1 = null;
  ambientOsc2 = null;
  ambientLPF = null;
  ambientPanner = null;
  ambientLFOFilter = null;
  ambientLFOFilterGain = null;
  ambientLFOPan = null;
  ambientLFOPanGain = null;
}

// ─── Cue synthesis ───────────────────────────────────────────────────────────

function synthTick(ac: AudioContext, dest: AudioNode): void {
  // 1200 Hz square, 25 ms attack-decay, gain 0.08
  const now = ac.currentTime;
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(0.08, now + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.025);

  const osc = ac.createOscillator();
  osc.type = "square";
  osc.frequency.setValueAtTime(1200, now);
  osc.connect(g);
  g.connect(dest);
  osc.start(now);
  osc.stop(now + 0.03);
}

function synthSelect(ac: AudioContext, dest: AudioNode): void {
  // 440 Hz + 660 Hz sine, 150 ms exponential decay, gain 0.16 — gentle major third
  const now = ac.currentTime;
  const dur = 0.15;

  [440, 660].forEach((freq) => {
    const g = ac.createGain();
    g.gain.setValueAtTime(0.16, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    const osc = ac.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now);
    osc.connect(g);
    g.connect(dest);
    osc.start(now);
    osc.stop(now + dur + 0.01);
  });
}

function synthPivot(ac: AudioContext, dest: AudioNode): void {
  // 220 + 330 + 440 Hz, 280 ms decay, upward pitch sweep — "hyperspace"
  const now = ac.currentTime;
  const dur = 0.28;

  [220, 330, 440].forEach((baseFreq) => {
    const g = ac.createGain();
    g.gain.setValueAtTime(0.14, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    const osc = ac.createOscillator();
    osc.type = "sine";
    // Upward sweep: start 30% below, land at freq over 60 ms
    osc.frequency.setValueAtTime(baseFreq * 0.7, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq, now + 0.06);
    osc.connect(g);
    g.connect(dest);
    osc.start(now);
    osc.stop(now + dur + 0.01);
  });
}

function synthOpen(ac: AudioContext, dest: AudioNode): void {
  // 880 Hz triangle, 80 ms attack → 0.18, 200 ms decay
  const now = ac.currentTime;
  const attackEnd = now + 0.08;
  const decayEnd = attackEnd + 0.2;

  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(0.18, attackEnd);
  g.gain.exponentialRampToValueAtTime(0.0001, decayEnd);

  const osc = ac.createOscillator();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(880, now);
  osc.connect(g);
  g.connect(dest);
  osc.start(now);
  osc.stop(decayEnd + 0.01);
}

function synthClose(ac: AudioContext, dest: AudioNode): void {
  // Same as open but pitch sweeps downward (880 → 440 Hz)
  const now = ac.currentTime;
  const attackEnd = now + 0.08;
  const decayEnd = attackEnd + 0.2;

  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(0.14, attackEnd);
  g.gain.exponentialRampToValueAtTime(0.0001, decayEnd);

  const osc = ac.createOscillator();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(880, now);
  osc.frequency.exponentialRampToValueAtTime(440, decayEnd);
  osc.connect(g);
  g.connect(dest);
  osc.start(now);
  osc.stop(decayEnd + 0.01);
}

function synthRoute(ac: AudioContext, dest: AudioNode): void {
  // C4 E4 G4 B4 arpeggio staggered 30 ms — confirming arpeggio, ~400 ms total
  const now = ac.currentTime;
  const freqs = [261.63, 329.63, 392.0, 493.88]; // C4 E4 G4 B4

  freqs.forEach((freq, i) => {
    const offset = i * 0.03;
    const start = now + offset;
    const dur = 0.35;

    const g = ac.createGain();
    g.gain.setValueAtTime(0.14, start);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);

    const osc = ac.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, start);
    osc.connect(g);
    g.connect(dest);
    osc.start(start);
    osc.stop(start + dur + 0.01);
  });
}

function synthError(ac: AudioContext, dest: AudioNode): void {
  // 220 Hz square, two 80 ms pulses — gentle deny
  const now = ac.currentTime;

  [0, 0.1].forEach((offset) => {
    const start = now + offset;
    const dur = 0.08;

    const g = ac.createGain();
    g.gain.setValueAtTime(0.12, start);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);

    const osc = ac.createOscillator();
    osc.type = "square";
    osc.frequency.setValueAtTime(220, start);
    osc.connect(g);
    g.connect(dest);
    osc.start(start);
    osc.stop(start + dur + 0.005);
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Enable or disable audio. Must be called from a user gesture to satisfy
 * browser autoplay policy (the AudioContext is constructed here on first call
 * with enabled=true).
 */
export function setEnabled(enabled: boolean): void {
  _enabled = enabled;

  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
  }

  if (enabled) {
    // Construct context on this gesture if not yet done.
    const ac = ensureContext();

    // Resume if suspended (Chrome suspends after no gesture for a while).
    if (ac.state === "suspended") {
      void ac.resume();
    }

    if (!ambientStarted) {
      _startAmbientInternal();
    } else if (ambientGain) {
      // Bring ambient back up if it was muted
      const now = ac.currentTime;
      ambientGain.gain.setValueAtTime(ambientGain.gain.value, now);
      ambientGain.gain.exponentialRampToValueAtTime(0.28, now + 0.5);
    }
  } else {
    // Soft-mute: fade out but don't destroy context
    if (ambientGain && ctx) {
      const now = ctx.currentTime;
      ambientGain.gain.setValueAtTime(ambientGain.gain.value, now);
      ambientGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
    }
  }
}

/** Returns the current enabled state. */
export function isEnabled(): boolean {
  return _enabled;
}

/**
 * Fire a UI cue. Safe to call even when audio is disabled — the check is
 * instantaneous so there is no queue pile-up. Lightweight: each cue creates
 * short-lived oscillator nodes that are GC'd after their stop time.
 */
export function play(cue: AudioCue): void {
  if (!_enabled) return;

  const ac = ensureContext();
  if (ac.state === "suspended") {
    void ac.resume();
  }

  // Safety: if masterGain somehow doesn't exist yet, bail.
  if (!masterGain) return;

  switch (cue) {
    case "tick":
      synthTick(ac, masterGain);
      break;
    case "select":
      synthSelect(ac, masterGain);
      break;
    case "pivot":
      synthPivot(ac, masterGain);
      break;
    case "open":
      synthOpen(ac, masterGain);
      break;
    case "close":
      synthClose(ac, masterGain);
      break;
    case "route":
      synthRoute(ac, masterGain);
      break;
    case "error":
      synthError(ac, masterGain);
      break;
  }
}

/**
 * Start the ambient hum. No-op if already running or audio is disabled.
 * Call from the explorer view's mount effect.
 */
export function startAmbient(): void {
  if (!_enabled) return;

  if (!_contextReady) {
    // Can't start without a gesture; will auto-start when setEnabled(true) is
    // eventually called.
    return;
  }

  const ac = ensureContext();
  if (ac.state === "suspended") {
    void ac.resume();
  }

  if (!ambientStarted) {
    _startAmbientInternal();
  }
}

/**
 * Stop the ambient hum (fade out). Call when leaving the explorer view.
 */
export function stopAmbient(): void {
  _stopAmbientInternal();
}
