/**
 * Climate-driven palette + glyph helpers for the planet detail surface.
 *
 * SWAPI's `climate` field is a freeform comma-separated list of keywords
 * ("arid", "frozen", "temperate", "tropical", "rocky", "humid", "polluted"
 * …). We collapse them into a small set of "biomes" that each map to a
 * reusable OKLCH palette and a tiny inline-SVG glyph. Anything that doesn't
 * match falls back to a neutral steel biome — never an empty render.
 *
 * Pure module: no DOM, no React, safe to import from server components.
 */

export type ClimateBiome =
  | "desert"
  | "ice"
  | "forest"
  | "ocean"
  | "city"
  | "swamp"
  | "volcanic"
  | "gas"
  | "temperate"
  | "neutral";

/** OKLCH color triples for one biome. All values are CSS color strings. */
export interface ClimatePalette {
  /** Mid-saturation core hue, used for shader rim and accent glyph. */
  core: string;
  /** Brighter highlight, used for hot pixels in shader / hover state. */
  hot: string;
  /** Deeper shadow tone, used for hero gradient floor. */
  cool: string;
  /** Very faint tint for chrome backgrounds. */
  whisper: string;
  /** Drop-shadow color for the planet name typography. */
  shadow: string;
}

/**
 * Map a free-text climate or terrain string to one canonical biome. The
 * tokenizer is intentionally cheap — split on commas, lowercase, score
 * each keyword. First match wins; "neutral" is the floor.
 */
export function classifyBiome(climate?: string, terrain?: string): ClimateBiome {
  const tokens = `${climate ?? ""} ${terrain ?? ""}`.toLowerCase();
  // Order matters: more specific keywords first. "lava" beats "rock", etc.
  if (/lava|volcan|magma|molten/.test(tokens)) return "volcanic";
  if (/frozen|frigid|ice|tundra|glacier/.test(tokens)) return "ice";
  if (/arid|desert|barren|dune/.test(tokens)) return "desert";
  if (/jungle|forest|tropical|rainforest/.test(tokens)) return "forest";
  if (/ocean|aqua|water|reef/.test(tokens)) return "ocean";
  if (/swamp|murky|bog|marsh|fen/.test(tokens)) return "swamp";
  if (/gas|gaseous/.test(tokens)) return "gas";
  if (/cityscape|urban|industrial|polluted/.test(tokens)) return "city";
  if (/temperate|grassland|moor|meadow|mountain/.test(tokens)) return "temperate";
  return "neutral";
}

/**
 * Palette per biome. All hues in OKLCH per design constraints — no #fff/#000.
 * The `shadow` channel uses `/ 0.45` alpha so it can be safely used as a
 * filter drop-shadow color over varied backgrounds.
 */
export const BIOME_PALETTES: Record<ClimateBiome, ClimatePalette> = {
  desert: {
    core: "oklch(0.78 0.15 60)",
    hot: "oklch(0.86 0.16 65)",
    cool: "oklch(0.32 0.08 50)",
    whisper: "oklch(0.30 0.04 60 / 0.45)",
    shadow: "oklch(0.50 0.14 55 / 0.45)"
  },
  ice: {
    core: "oklch(0.84 0.07 220)",
    hot: "oklch(0.92 0.06 230)",
    cool: "oklch(0.36 0.05 230)",
    whisper: "oklch(0.30 0.04 230 / 0.45)",
    shadow: "oklch(0.55 0.10 225 / 0.40)"
  },
  forest: {
    core: "oklch(0.70 0.15 145)",
    hot: "oklch(0.80 0.17 145)",
    cool: "oklch(0.28 0.08 150)",
    whisper: "oklch(0.26 0.06 145 / 0.45)",
    shadow: "oklch(0.45 0.13 145 / 0.45)"
  },
  ocean: {
    core: "oklch(0.72 0.13 200)",
    hot: "oklch(0.84 0.14 195)",
    cool: "oklch(0.30 0.08 210)",
    whisper: "oklch(0.26 0.05 205 / 0.45)",
    shadow: "oklch(0.50 0.12 200 / 0.45)"
  },
  city: {
    core: "oklch(0.78 0.13 235)",
    hot: "oklch(0.86 0.14 235)",
    cool: "oklch(0.28 0.05 235)",
    whisper: "oklch(0.24 0.04 235 / 0.45)",
    shadow: "oklch(0.55 0.13 235 / 0.45)"
  },
  swamp: {
    core: "oklch(0.66 0.10 130)",
    hot: "oklch(0.76 0.12 130)",
    cool: "oklch(0.26 0.06 130)",
    whisper: "oklch(0.24 0.04 130 / 0.45)",
    shadow: "oklch(0.42 0.10 130 / 0.45)"
  },
  volcanic: {
    core: "oklch(0.66 0.18 30)",
    hot: "oklch(0.78 0.20 35)",
    cool: "oklch(0.28 0.10 25)",
    whisper: "oklch(0.26 0.08 30 / 0.45)",
    shadow: "oklch(0.50 0.18 30 / 0.50)"
  },
  gas: {
    core: "oklch(0.72 0.13 320)",
    hot: "oklch(0.82 0.14 325)",
    cool: "oklch(0.28 0.07 320)",
    whisper: "oklch(0.24 0.04 320 / 0.45)",
    shadow: "oklch(0.50 0.12 320 / 0.45)"
  },
  temperate: {
    core: "oklch(0.74 0.10 165)",
    hot: "oklch(0.84 0.11 165)",
    cool: "oklch(0.30 0.07 170)",
    whisper: "oklch(0.26 0.05 165 / 0.45)",
    shadow: "oklch(0.48 0.10 165 / 0.45)"
  },
  neutral: {
    core: "oklch(0.78 0.04 235)",
    hot: "oklch(0.88 0.05 235)",
    cool: "oklch(0.30 0.02 240)",
    whisper: "oklch(0.24 0.02 240 / 0.45)",
    shadow: "oklch(0.50 0.04 240 / 0.40)"
  }
};

/** Human-readable label for a biome — used in mono captions. */
export const BIOME_LABEL: Record<ClimateBiome, string> = {
  desert: "Arid biosphere",
  ice: "Cryogenic biosphere",
  forest: "Temperate forest biosphere",
  ocean: "Pelagic biosphere",
  city: "Ecumenopolis",
  swamp: "Wetland biosphere",
  volcanic: "Volcanic biosphere",
  gas: "Gaseous envelope",
  temperate: "Temperate biosphere",
  neutral: "Unclassified biosphere"
};

/**
 * Tokenize SWAPI's "arid, hot" / "desert, mountains" comma lists into trimmed
 * lowercase segments suitable for chip rendering. Returns at most `limit`
 * entries.
 */
export function tokenizeWords(raw: string | undefined, limit = 6): string[] {
  if (!raw) return [];
  return raw
    .split(/[,/]/)
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0 && s !== "unknown")
    .slice(0, limit);
}
