/**
 * Era-aware faction classification for Force users.
 *
 * The BFS-from-Sith-origins classifier in LineageView / GalaxyCanvas assigns a
 * static side per person and never updates when the era scrubber moves. This
 * module provides a declarative table of *canon* faction transitions so that
 * e.g. Anakin shows Jedi-blue before -19 BBY and Sith-red after, and then
 * "civilian" (redeemed) at 4 ABY.
 *
 * Year convention: negative = BBY, positive = ABY. 0 is the Battle of Yavin.
 */

export type ForceSide = "jedi" | "sith" | "civilian";

export type ForceTransition = {
  /** Matches the `id` field in lineage.json / kb.json */
  personId: string;
  /** Human-readable name — documentation only, not used by sideAtEra(). */
  name: string;
  from: ForceSide;
  to: ForceSide;
  /**
   * The year the transition takes effect (BBY = negative, ABY = positive).
   * At exactly this year the NEW side applies.
   */
  year: number;
  /** Short description of the canonical event. */
  event: string;
  /** Wookieepedia citation URL. */
  source: string;
};

// ---------------------------------------------------------------------------
// Default sides — what a person IS before any transition fires (i.e. from the
// very beginning of their story, or when no transition has been reached yet).
// Anyone not listed here falls back to the BFS-derived classification.
// ---------------------------------------------------------------------------
export const DEFAULT_SIDE: Record<string, ForceSide> = {
  // Jedi from birth / training start; no earlier faction.
  "person/11": "jedi",      // Anakin Skywalker
  "person/4": "sith",       // Darth Vader — SWAPI splits him; default Sith for the Vader node
  "person/ahsoka-tano": "jedi",
  "person/67": "jedi",      // Dooku (person/67 = "Dooku" in lineage.json)
  "person/ben-solo": "jedi", // Ben Solo; starts as a Jedi student
  "person/1": "civilian",   // Luke Skywalker — Force-sensitive civilian before formal training
  "person/20": "jedi",      // Yoda — always Jedi, no transitions needed (included for explicitness)
  "person/10": "jedi",      // Obi-Wan Kenobi — always Jedi
  "person/51": "jedi",      // Mace Windu — always Jedi
};

// ---------------------------------------------------------------------------
// Ordered transition table — sorted chronologically (oldest first) within each
// person. sideAtEra() walks them in order and stops at the last one before era.
// ---------------------------------------------------------------------------
export const FORCE_TRANSITIONS: ForceTransition[] = [
  // ── Dooku / Darth Tyranus ─────────────────────────────────────────────────
  // Canon places his secret fall around 52 BBY when he became disillusioned
  // and began secretly communing with Sith teachings, before publicly leaving
  // the Order in ~32 BBY. We mark the secret fall as the transition point.
  // Source: "Dooku: Jedi Lost" novel (canon) and Wookieepedia.
  {
    personId: "person/67",
    name: "Count Dooku",
    from: "jedi",
    to: "sith",
    year: -52,
    event: "Dooku secretly embraces the dark side; later publicly leaves the Jedi Order",
    source: "https://starwars.fandom.com/wiki/Dooku#Fall_to_the_dark_side"
  },

  // ── Anakin Skywalker ──────────────────────────────────────────────────────
  // Anakin's fall on Mustafar at the close of the Clone Wars, 19 BBY.
  {
    personId: "person/11",
    name: "Anakin Skywalker",
    from: "jedi",
    to: "sith",
    year: -19,
    event: "Anakin falls to the dark side on Mustafar; becomes Darth Vader",
    source: "https://starwars.fandom.com/wiki/Anakin_Skywalker/Legends#Fall_to_the_dark_side"
  },
  // Redeemed at Endor, 4 ABY — treated as "civilian" rather than jedi/sith
  // because he dies moments later; the canon emphasises redemption, not
  // re-knighthood. The cream civilian tint signals "redeemed" in the UI.
  {
    personId: "person/11",
    name: "Anakin Skywalker",
    from: "sith",
    to: "civilian",
    year: 4,
    event: "Anakin redeems himself by saving Luke and throwing Palpatine into the reactor shaft; dies as Anakin Skywalker",
    source: "https://starwars.fandom.com/wiki/Anakin_Skywalker#Redemption_and_death"
  },

  // ── Darth Vader (SWAPI person/4 — same arc, separate node) ───────────────
  // SWAPI exposes Vader and Anakin as two separate entities. The Vader node
  // starts as Sith by DEFAULT_SIDE above; we only need the redemption.
  {
    personId: "person/4",
    name: "Darth Vader",
    from: "sith",
    to: "civilian",
    year: 4,
    event: "Darth Vader redeems himself at the Battle of Endor",
    source: "https://starwars.fandom.com/wiki/Darth_Vader#Redemption_and_death"
  },

  // ── Ahsoka Tano ───────────────────────────────────────────────────────────
  // Left the Jedi Order after being wrongly accused and then exonerated in
  // 19 BBY. She never joined the Sith; her departure makes her unaffiliated.
  {
    personId: "person/ahsoka-tano",
    name: "Ahsoka Tano",
    from: "jedi",
    to: "civilian",
    year: -19,
    event: "Ahsoka leaves the Jedi Order after her trial; remains a Force user but outside the Order",
    source: "https://starwars.fandom.com/wiki/Ahsoka_Tano#Departure_from_the_Jedi_Order"
  },

  // ── Luke Skywalker ────────────────────────────────────────────────────────
  // Luke was a Force-sensitive civilian until he completed formal training
  // under Yoda on Dagobah, canonically around 3–4 ABY. We use 4 ABY (the year
  // of ROTJ, when he self-identifies as "a Jedi, like my father before me").
  {
    personId: "person/1",
    name: "Luke Skywalker",
    from: "civilian",
    to: "jedi",
    year: 4,
    event: "Luke completes his training and declares himself a Jedi Knight before confronting Vader",
    source: "https://starwars.fandom.com/wiki/Luke_Skywalker#Jedi_Knight"
  },

  // ── Ben Solo / Kylo Ren ───────────────────────────────────────────────────
  // Ben was trained as a Jedi by Luke, turned to the dark side around 28 ABY
  // when the Knights of Ren attacked Luke's academy, then redeemed himself
  // at the Battle of Exegol in 35 ABY.
  {
    personId: "person/ben-solo",
    name: "Ben Solo",
    from: "jedi",
    to: "sith",
    year: 28,
    event: "Ben Solo turns to the dark side; becomes Kylo Ren after destroying Luke's Jedi temple",
    source: "https://starwars.fandom.com/wiki/Ben_Solo#Turn_to_the_dark_side"
  },
  {
    personId: "person/ben-solo",
    name: "Ben Solo",
    from: "sith",
    to: "civilian",
    year: 35,
    event: "Kylo Ren redeems himself as Ben Solo at the Battle of Exegol; sacrifices his life for Rey",
    source: "https://starwars.fandom.com/wiki/Ben_Solo#Redemption_and_death"
  },
];

// ---------------------------------------------------------------------------
// sideAtEra — main API
// ---------------------------------------------------------------------------

/**
 * Resolves the canonical Force affiliation of `personId` at the given `era`
 * year (BBY = negative, ABY = positive).
 *
 * Algorithm:
 *  1. Filter FORCE_TRANSITIONS to those for this person.
 *  2. Walk them in chronological order (oldest first).
 *  3. Apply any transition whose `year <= era` — the last matching one wins.
 *  4. If no transition has fired, return DEFAULT_SIDE[personId] if present,
 *     otherwise return `null` to signal "use BFS-derived classification".
 *
 * Returns `null` when the person has no era-aware data, allowing callers to
 * fall back to the existing BFS classifier unchanged.
 */
export function sideAtEra(personId: string, era: number): ForceSide | null {
  const transitions = FORCE_TRANSITIONS.filter((t) => t.personId === personId);

  // No entry at all — caller should use BFS.
  if (transitions.length === 0 && !(personId in DEFAULT_SIDE)) return null;

  const def: ForceSide = DEFAULT_SIDE[personId] ?? "civilian";
  let current: ForceSide = def;

  // Transitions are already ordered oldest-first in the table; iterate to find
  // the latest one that has fired.
  for (const t of transitions) {
    if (t.year <= era) {
      current = t.to;
    }
  }

  return current;
}
