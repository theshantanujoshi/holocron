export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export function formatYear(year: number): string {
  if (year === 0) return "0 ABY";
  return year < 0 ? `${Math.abs(year).toLocaleString()} BBY` : `${year.toLocaleString()} ABY`;
}

export function formatYearRange(start: number, end: number): string {
  return `${formatYear(start)} – ${formatYear(end)}`;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// ---------------------------------------------------------------------------
// Entity crawl helpers
// ---------------------------------------------------------------------------

import type { Entity, RelationKind } from "@/lib/schema";

/** Capitalise the first letter of a string, leave the rest as-is. */
export function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Format a birth/death pair as a readable era string.
 * Returns an empty string when both values are absent.
 */
export function formatBornDied(
  birthYear: number | null | undefined,
  deathYear: number | null | undefined
): string {
  const born = birthYear != null ? formatYear(birthYear) : null;
  const died = deathYear != null ? formatYear(deathYear) : null;
  if (born && died) return `${born} – ${died}`;
  if (born) return `b. ${born}`;
  if (died) return `d. ${died}`;
  return "";
}

/** Kinds that represent meaningful narrative relationships for the crawl body. */
const NARRATIVE_KINDS = new Set<RelationKind>([
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
]);

/** Map a RelationKind to a readable phrase prefix (subject is the entity). */
function kindLabel(kind: RelationKind): string {
  const map: Record<string, string> = {
    master_of: "Master of",
    apprentice_of: "Apprentice of",
    parent_of: "Parent of",
    child_of: "Child of",
    sibling_of: "Sibling of",
    spouse_of: "Spouse of",
    ally_of: "Ally of",
    enemy_of: "Enemy of",
    member_of: "Member of",
    leader_of: "Leader of",
  };
  return map[kind] ?? kind;
}

/**
 * Pure utility — no DOM, no side-effects.
 * Composes the crawl content for a single entity.
 */
export function buildEntityCrawl(
  entity: Entity,
  entities: Entity[]
): { title: string; subtitle: string; paragraphs: string[] } {
  const title = entity.name.toUpperCase();
  const subtitle = `Episode · ${capitalize(entity.type)}`;
  const nameById = new Map<string, string>(entities.map((e) => [e.id, e.name]));

  // --- Paragraph 1: identity line ---
  const identityParts: string[] = [];

  // Era
  const eraStr = entity.era
    ? formatBornDied(entity.era.birthYear, entity.era.deathYear)
    : "";
  if (eraStr) identityParts.push(eraStr);

  // Homeworld
  const homeworldRel = entity.relations.find((r) => r.kind === "homeworld_of");
  const homeworldName = homeworldRel ? nameById.get(homeworldRel.target) : undefined;
  if (homeworldName) identityParts.push(`of ${homeworldName}`);

  // Spatial region (for non-person entities like planets)
  if (!homeworldRel && entity.spatial?.region) {
    identityParts.push(`in the ${entity.spatial.region}`);
  }

  const identityLine = identityParts.length
    ? `${entity.name}, ${capitalize(entity.type)}. ${identityParts.join(". ")}.`
    : `${entity.name}, ${capitalize(entity.type)}.`;

  // --- Paragraph 2: long bio or fallback ---
  let bioParagraph: string;
  if (entity.long.trim()) {
    // Take up to the first 4 sentences
    const sentences = entity.long
      .replace(/\s+/g, " ")
      .split(/(?<=[.!?])\s+/)
      .filter((s) => s.trim().length > 0);
    bioParagraph = sentences.slice(0, 4).join(" ");
  } else {
    // Fallback: build from short + top relations
    const relSnippets = entity.relations
      .filter((r) => NARRATIVE_KINDS.has(r.kind))
      .slice(0, 3)
      .map((r) => {
        const target = nameById.get(r.target);
        return target ? `${kindLabel(r.kind)} ${target}` : null;
      })
      .filter((s): s is string => s !== null);

    const base = entity.short ? `${entity.name}: ${entity.short}.` : `${entity.name}.`;
    bioParagraph = relSnippets.length
      ? `${base} ${relSnippets.join(". ")}.`
      : base;
  }

  // --- Paragraph 3: relationship narrative ---
  const narrativeRels = entity.relations.filter((r) => NARRATIVE_KINDS.has(r.kind));

  // Group by kind
  const byKind = new Map<RelationKind, string[]>();
  for (const r of narrativeRels) {
    const targetName = nameById.get(r.target);
    if (!targetName) continue;
    const list = byKind.get(r.kind) ?? [];
    list.push(targetName);
    byKind.set(r.kind, list);
  }

  const relPhrases: string[] = [];
  for (const [kind, names] of byKind) {
    relPhrases.push(`${kindLabel(kind)}: ${names.join(", ")}`);
  }

  let relationsParagraph: string;
  if (relPhrases.length) {
    relationsParagraph = relPhrases.join(". ") + ".";
  } else {
    // Mention film appearances if no narrative relations
    const filmRels = entity.relations.filter((r) => r.kind === "appears_in");
    const filmNames = filmRels
      .map((r) => nameById.get(r.target))
      .filter((n): n is string => n !== undefined);
    relationsParagraph = filmNames.length
      ? `Appears in: ${filmNames.slice(0, 3).join(", ")}.`
      : "";
  }

  // --- Paragraph 4: closing line ---
  const closingLine = "The archive responds....";

  const paragraphs: string[] = [identityLine, bioParagraph];
  if (relationsParagraph) paragraphs.push(relationsParagraph);
  paragraphs.push(closingLine);

  return { title, subtitle, paragraphs };
}
