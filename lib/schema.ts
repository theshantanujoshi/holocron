import { z } from "zod";

export const Canonicity = z.enum(["canon", "legends", "both"]);
export type Canonicity = z.infer<typeof Canonicity>;

export const EntityType = z.enum([
  "person",
  "planet",
  "ship",
  "vehicle",
  "species",
  "film",
  "show",
  "book",
  "comic",
  "event",
  "faction",
  "game",
  "sector",
  "region"
]);
export type EntityType = z.infer<typeof EntityType>;

export const RelationKind = z.enum([
  "master_of",
  "apprentice_of",
  "parent_of",
  "child_of",
  "sibling_of",
  "spouse_of",
  "ally_of",
  "enemy_of",
  "member_of",
  "leader_of",
  "homeworld_of",
  "located_in",
  "appears_in",
  "captained_by",
  "designed_by",
  "fought_in",
  "occurred_at"
]);
export type RelationKind = z.infer<typeof RelationKind>;

export const FactionId = z.enum([
  "jedi_order",
  "sith_order",
  "galactic_republic",
  "galactic_empire",
  "rebel_alliance",
  "new_republic",
  "first_order",
  "resistance",
  "cis",
  "mandalorian",
  "old_republic",
  "high_republic",
  "hutt_cartel",
  "trade_federation",
  "unknown"
]);
export type FactionId = z.infer<typeof FactionId>;

export const Coords3D = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number()
});
export type Coords3D = z.infer<typeof Coords3D>;

export const Affiliation = z.object({
  faction: FactionId,
  role: z.string().optional(),
  startYear: z.number().nullable().optional(),
  endYear: z.number().nullable().optional()
});
export type Affiliation = z.infer<typeof Affiliation>;

export const Relation = z.object({
  kind: RelationKind,
  target: z.string(),
  startYear: z.number().nullable().optional(),
  endYear: z.number().nullable().optional(),
  notes: z.string().optional()
});
export type Relation = z.infer<typeof Relation>;

export const Era = z.object({
  firstAppearance: z.number().nullable().optional(),
  lastAppearance: z.number().nullable().optional(),
  birthYear: z.number().nullable().optional(),
  deathYear: z.number().nullable().optional()
});

export const Spatial = z.object({
  coords: Coords3D.optional(),
  region: z.string().optional(),
  sector: z.string().optional(),
  grid: z.string().optional()
});

export const Media = z.object({
  hero: z.string().optional(),
  gallery: z.array(z.string()).default([]),
  officialClipUrl: z.string().optional()
});

/**
 * Planet-only physical attributes from SWAPI. Optional everywhere — legacy KB
 * builds (or planets where SWAPI marks the field "unknown") simply omit these,
 * and the UI gracefully degrades. Numeric fields hold parsed numbers; non-
 * numeric SWAPI strings (e.g. `"unknown"`, `"n/a"`) are dropped during ingest.
 */
export const Physical = z.object({
  /** Comma-separated SWAPI climate keywords ("arid", "frozen", "temperate"…). */
  climate: z.string().optional(),
  /** Comma-separated SWAPI terrain keywords ("desert", "jungle"…). */
  terrain: z.string().optional(),
  /** Standard gravities; 1 ≈ Earth/Coruscant. */
  gravity: z.number().optional(),
  /** Surface water as a 0–100 percentage. */
  surfaceWater: z.number().optional(),
  /** Population, integer. */
  population: z.number().optional(),
  /** Planet diameter in km. */
  diameter: z.number().optional(),
  /** Day length in standard hours. */
  rotationHours: z.number().optional(),
  /** Year length in standard days. */
  orbitalDays: z.number().optional()
});
export type Physical = z.infer<typeof Physical>;

export const Entity = z.object({
  id: z.string(),
  type: EntityType,
  name: z.string(),
  aliases: z.array(z.string()).default([]),
  canonicity: Canonicity,
  era: Era.optional(),
  spatial: Spatial.optional(),
  /** Planet-only — populated from SWAPI by build-kb.ts. */
  physical: Physical.optional(),
  affiliations: z.array(Affiliation).default([]),
  relations: z.array(Relation).default([]),
  short: z.string().default(""),
  long: z.string().default(""),
  media: Media.default({ gallery: [] }),
  sources: z.array(z.string()).default([])
});
export type Entity = z.infer<typeof Entity>;

export const KnowledgeBase = z.object({
  builtAt: z.string(),
  schemaVersion: z.literal(1),
  entityCount: z.number(),
  entities: z.array(Entity)
});
export type KnowledgeBase = z.infer<typeof KnowledgeBase>;

export const TimelineEvent = z.object({
  id: z.string(),
  year: z.number(),
  yearEnd: z.number().optional(),
  title: z.string(),
  short: z.string().default(""),
  long: z.string().optional(),
  involves: z.array(z.string()).default([]),
  locationId: z.string().optional(),
  category: z.enum([
    "battle",
    "political",
    "discovery",
    "personal",
    "founding",
    "destruction",
    "treaty",
    "other"
  ]),
  canonicity: Canonicity,
  sources: z.array(z.string()).default([])
});
export type TimelineEvent = z.infer<typeof TimelineEvent>;

export const Hyperlane = z.object({
  id: z.string(),
  name: z.string(),
  path: z.array(Coords3D),
  era: z.object({ start: z.number().nullable(), end: z.number().nullable() }).optional()
});
export type Hyperlane = z.infer<typeof Hyperlane>;

// ---------------------------------------------------------------------------
// Wars & Battles
// ---------------------------------------------------------------------------

const Belligerent = z.object({
  factions: z.array(FactionId),
  label: z.string()
});

export const War = z.object({
  id: z.string(),
  name: z.string(),
  startYear: z.number(),
  endYear: z.number(),
  belligerents: z.array(Belligerent),
  theatrePlanetIds: z.array(z.string()),
  keyBattleIds: z.array(z.string()),
  summary: z.string(),
  canonicity: Canonicity,
  sources: z.array(z.string())
});
export type War = z.infer<typeof War>;

export const Battle = z.object({
  id: z.string(),
  name: z.string(),
  year: z.number(),
  warId: z.string().nullable(),
  planetId: z.string().nullable(),
  belligerents: z.array(Belligerent),
  outcome: z.enum(["victory", "defeat", "stalemate", "tactical-victory", "pyrrhic"]).optional(),
  winningSide: z.string().optional(),
  shipsInvolved: z.array(z.string()),
  summary: z.string(),
  canonicity: Canonicity,
  sources: z.array(z.string())
});
export type Battle = z.infer<typeof Battle>;

export const WarsFile = z.object({
  builtAt: z.string(),
  wars: z.array(War),
  battles: z.array(Battle)
});
export type WarsFile = z.infer<typeof WarsFile>;
