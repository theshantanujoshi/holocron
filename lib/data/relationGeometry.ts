/**
 * Pure utilities for the connection-web overlay.
 *
 * `resolveAnchor`  — map any entity to a 3D [x,y,z] galaxy position.
 * `findConnections` — gather all outgoing + incoming relations for a selection.
 */

import type { Entity, Relation } from "@/lib/schema";
import type { PlacedPlanet } from "@/lib/data/positions";

// ---------------------------------------------------------------------------
// Anchor resolution
// ---------------------------------------------------------------------------

/** Center-of-galaxy fallback used when no planet position can be found. */
const GALAXY_CENTER: [number, number, number] = [0, 0, 0];

/**
 * Walk the planet list and return the position of the planet whose id matches
 * `planetId`, or null if not found.
 */
function planetPos(
  planetId: string,
  planets: PlacedPlanet[]
): [number, number, number] | null {
  const hit = planets.find((p) => p.id === planetId);
  return hit ? [...hit.position] : null;
}

/**
 * For a Person (or Species): look for a `homeworld_of` or `located_in` relation
 * whose target is a known planet.  Returns the planet's 3D position or null.
 */
function homeworldPos(
  entity: Entity,
  planets: PlacedPlanet[]
): [number, number, number] | null {
  const homeworldKinds = new Set<string>(["homeworld_of", "located_in"]);
  for (const rel of entity.relations) {
    if (homeworldKinds.has(rel.kind)) {
      const pos = planetPos(rel.target, planets);
      if (pos) return pos;
    }
  }
  return null;
}

/**
 * For a Ship / Vehicle: try to find its captain(s) via inverse `captained_by`
 * relations — i.e. persons who have `captained_by` pointing AT this ship.
 * Then use the captain's homeworld.
 */
function shipAnchorPos(
  shipId: string,
  entities: Entity[],
  planets: PlacedPlanet[]
): [number, number, number] | null {
  for (const e of entities) {
    if (e.type !== "person") continue;
    const captainsThis = e.relations.some(
      (r) => r.kind === "captained_by" && r.target === shipId
    );
    if (captainsThis) {
      const pos = homeworldPos(e, planets);
      if (pos) return pos;
    }
  }
  return null;
}

/**
 * Resolve any entity to a 3D position in the galaxy scene, following the
 * type-specific rules:
 *
 *  - planet  → its own position from the planets array.
 *  - person  → homeworld planet position (`homeworld_of` / `located_in` rel).
 *  - species → homeworld planet position (same lookup).
 *  - ship / vehicle → captain's homeworld, or null.
 *  - film / show / event / faction / sector / region →
 *      no spatial anchor — return null so the caller can skip the line.
 *
 * Returns null when no position can be determined; the caller should omit that
 * connection from the rendered set.
 */
export function resolveAnchor(
  entity: Entity,
  entities: Entity[],
  planets: PlacedPlanet[]
): [number, number, number] | null {
  switch (entity.type) {
    case "planet": {
      return planetPos(entity.id, planets);
    }
    case "person":
    case "species": {
      return homeworldPos(entity, planets);
    }
    case "ship":
    case "vehicle": {
      return shipAnchorPos(entity.id, entities, planets);
    }
    // Films, shows, events, factions, sectors, regions have no spatial anchor.
    case "film":
    case "show":
    case "event":
    case "faction":
    case "sector":
    case "region":
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Connection discovery
// ---------------------------------------------------------------------------

export type Connection = {
  relation: Relation;
  target: Entity;
  /** true = outgoing from selected; false = incoming (other entity → selected) */
  outgoing: boolean;
};

/**
 * Gather all direct connections for `selectedId`:
 *
 *  1. Outgoing — every entry in selectedEntity.relations.
 *  2. Incoming — every relation in the rest of the entity list whose `target`
 *     matches `selectedId`.
 *
 * Deduplication rule: if an outgoing relation and an incoming relation both
 * link the same (kind, targetId) pair, keep only the outgoing entry.
 *
 * The returned array is capped at 60 entries (well above the realistic data
 * maximum of ~30 for any single entity) to guard against pathological cases.
 */
export function findConnections(
  selectedId: string,
  entities: Entity[]
): Connection[] {
  const selected = entities.find((e) => e.id === selectedId);
  if (!selected) return [];

  // Build a lookup by id for O(1) access.
  const byId = new Map<string, Entity>();
  for (const e of entities) byId.set(e.id, e);

  // Track which (kind, targetId) pairs we've already added to dedup.
  const seen = new Set<string>();
  const results: Connection[] = [];

  const push = (conn: Connection): void => {
    const key = `${conn.relation.kind}:${conn.target.id}`;
    if (seen.has(key)) return;
    seen.add(key);
    results.push(conn);
  };

  // 1. Outgoing relations from the selected entity.
  for (const rel of selected.relations) {
    const target = byId.get(rel.target);
    if (!target) continue;
    push({ relation: rel, target, outgoing: true });
  }

  // 2. Incoming relations — scan all other entities.
  for (const e of entities) {
    if (e.id === selectedId) continue;
    for (const rel of e.relations) {
      if (rel.target !== selectedId) continue;
      // Synthesize a relation object pointing from selectedId perspective.
      const synth: Relation = {
        kind: rel.kind,
        target: e.id,
        startYear: rel.startYear,
        endYear: rel.endYear,
        notes: rel.notes
      };
      push({ relation: synth, target: e, outgoing: false });
    }
  }

  // Cap at 60.
  return results.slice(0, 60);
}

// ---------------------------------------------------------------------------
// Colour / style helpers shared with ConnectionWeb.tsx
// ---------------------------------------------------------------------------

/** OKLCH hex approximations derived from DESIGN.md tokens. */
export const RELATION_COLOR = {
  /** master_of / apprentice_of — accent solid full-sat */
  force:    0x5fbfff as number,
  /** parent_of / child_of — cream */
  family:   0xf0e8cc as number,
  /** spouse_of / sibling_of — faint accent */
  bond:     0x3a6b8c as number,
  /** homeworld_of / located_in — accent half-sat */
  place:    0x3a88a8 as number,
  /** appears_in — cream (dashed) */
  media:    0xd0c8a8 as number,
  /** captained_by — alarm half-sat */
  command:  0x8c3a3a as number,
  /** member_of / leader_of — faint cream */
  member:   0x7a7060 as number,
  /** default — faint accent */
  other:    0x2a4a5a as number
} as const;

export type ColorKey = keyof typeof RELATION_COLOR;

export function kindToColorKey(kind: string): ColorKey {
  switch (kind) {
    case "master_of":
    case "apprentice_of":
      return "force";
    case "parent_of":
    case "child_of":
      return "family";
    case "spouse_of":
    case "sibling_of":
      return "bond";
    case "homeworld_of":
    case "located_in":
      return "place";
    case "appears_in":
      return "media";
    case "captained_by":
      return "command";
    case "member_of":
    case "leader_of":
      return "member";
    default:
      return "other";
  }
}

/** Returns true for relation kinds that should use dashed rendering. */
export function isDashed(kind: string): boolean {
  return kind === "appears_in";
}

/** Returns the base opacity for a given color key. */
export function kindOpacity(key: ColorKey): number {
  switch (key) {
    case "force":   return 0.90;
    case "family":  return 0.75;
    case "bond":    return 0.55;
    case "place":   return 0.70;
    case "media":   return 0.60;
    case "command": return 0.65;
    case "member":  return 0.45;
    case "other":   return 0.35;
  }
}

/** Galaxy-center sentinel used when origin/target is unknown. */
export { GALAXY_CENTER };
