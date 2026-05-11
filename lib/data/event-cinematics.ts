/**
 * Cinematic event registry.
 *
 * Each entry registers a brief (~700ms) viewport-claiming moment that fires
 * when the global era scrubber crosses its `triggerYear`. The interrupt
 * shows a title card + scanline-flicker treatment, plus a constellation of
 * staggered radial pulses representing the moment's spatial scope (e.g.
 * Order 66 sends 12 pulses across the viewport for the simultaneous Jedi
 * deaths; Battle of Yavin sends one focused pulse).
 *
 * Interrupts compose with Story Mode: when a story step's `era` crosses a
 * registered triggerYear, the interrupt fires automatically as part of the
 * cinematic. They also fire when a user manually scrubs through the year,
 * making the temporal galaxy feel viscerally connected to canon.
 *
 * Sources cited inline. Years use the canonical BBY/ABY system.
 */

export type CinematicVisual = "multi-pulse" | "single-pulse" | "double-pulse" | "binary-suns";
export type CinematicTone = "alarm" | "victory" | "loss" | "fate";

export type EventCinematic = {
  id: string;
  triggerYear: number;
  /** Tolerance in years — interrupt fires once when era enters this window. */
  windowYears: number;
  /** Title card top line, brief and uppercase. */
  title: string;
  /** Title card subtitle, sentence case. */
  subtitle: string;
  /** Total visible duration including fade-out. */
  durationMs: number;
  visual: CinematicVisual;
  /** Number of radial pulses (only used for multi-pulse). */
  pulseCount?: number;
  tone: CinematicTone;
  /** Optional audio cue id from `lib/audio/index.ts`. */
  audioCue?: "tick" | "select" | "pivot" | "open" | "close" | "route" | "error";
  source: string;
};

export const EVENT_CINEMATICS: EventCinematic[] = [
  {
    id: "order-66",
    triggerYear: -19,
    windowYears: 0.6,
    title: "ORDER 66",
    subtitle: "Execute. The Jedi must die.",
    durationMs: 1100,
    visual: "multi-pulse",
    pulseCount: 14,
    tone: "alarm",
    audioCue: "error",
    source: "https://starwars.fandom.com/wiki/Order_66"
  },
  {
    id: "battle-of-yavin",
    triggerYear: 0,
    windowYears: 0.4,
    title: "BATTLE OF YAVIN",
    subtitle: "The Death Star is destroyed.",
    durationMs: 900,
    visual: "single-pulse",
    tone: "victory",
    audioCue: "route",
    source: "https://starwars.fandom.com/wiki/Battle_of_Yavin"
  },
  {
    id: "battle-of-endor",
    triggerYear: 4,
    windowYears: 0.4,
    title: "BATTLE OF ENDOR",
    subtitle: "The Empire shatters.",
    durationMs: 1000,
    visual: "double-pulse",
    tone: "victory",
    audioCue: "route",
    source: "https://starwars.fandom.com/wiki/Battle_of_Endor"
  },
  {
    id: "hosnian-cataclysm",
    triggerYear: 34,
    windowYears: 0.4,
    title: "HOSNIAN CATACLYSM",
    subtitle: "Five worlds, gone.",
    durationMs: 1000,
    visual: "multi-pulse",
    pulseCount: 5,
    tone: "loss",
    audioCue: "error",
    source: "https://starwars.fandom.com/wiki/Hosnian_Cataclysm"
  },
  {
    id: "duel-on-mustafar",
    triggerYear: -19,
    /** Slightly later in the same year than Order 66 so they fire as a pair. */
    windowYears: 0.05,
    title: "DUEL ON MUSTAFAR",
    subtitle: "Anakin Skywalker becomes Vader.",
    durationMs: 950,
    visual: "binary-suns",
    tone: "fate",
    audioCue: "pivot",
    source: "https://starwars.fandom.com/wiki/Duel_on_Mustafar"
  }
];

/**
 * Resolve which cinematic, if any, should fire when the era transitions
 * from `prev` to `curr`. The interrupt only fires when the scrubber
 * CROSSES a triggerYear (going from one side to the other), not while
 * resting near it — this prevents repeat-firing during dwell.
 */
export function resolveCinematic(
  prev: number,
  curr: number,
  fired: ReadonlySet<string>
): EventCinematic | null {
  if (prev === curr) return null;
  for (const ev of EVENT_CINEMATICS) {
    if (fired.has(ev.id)) continue;
    const lo = Math.min(prev, curr);
    const hi = Math.max(prev, curr);
    if (ev.triggerYear >= lo && ev.triggerYear <= hi) {
      return ev;
    }
  }
  return null;
}

/** Tone → CSS variable color, resolved via the existing OKLCH theme. */
export function toneColor(tone: CinematicTone): string {
  switch (tone) {
    case "alarm":
      return "var(--color-alarm)";
    case "victory":
      return "var(--color-accent)";
    case "loss":
      return "var(--color-alarm)";
    case "fate":
      return "var(--color-legends)";
  }
}
