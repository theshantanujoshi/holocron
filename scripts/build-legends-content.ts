/**
 * build-legends-content.ts
 *
 * Reads data/build/kb.json (existing entities from SWAPI), adds Legends-era
 * and non-SWAPI canon entities from lib/data/legends-content.ts, then
 * writes the updated kb.json back.
 *
 * Also attaches officialClipUrl from lib/data/clip-links.ts to existing
 * film entities (the 6 SWAPI films).
 *
 * Safe to re-run: duplicate names are skipped, clip links are idempotent.
 *
 * Usage:
 *   npm run build:legends
 *
 * Outputs:
 *   data/build/kb.json          (updated with new entities + clip links)
 *   data/build/manifest.json    (updated with legendsContentAdded count)
 */

import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Entity, KnowledgeBase, type Entity as TEntity } from "../lib/schema";
import { RAW_FILMS, RAW_COMICS, RAW_GAMES, type RawEntry } from "../lib/data/legends-content";
import { CLIP_LINKS_MAP } from "../lib/data/clip-links";

const ROOT = process.cwd();
const KB_PATH = resolve(ROOT, "data/build/kb.json");
const MANIFEST_PATH = resolve(ROOT, "data/build/manifest.json");

// ---------------------------------------------------------------------------
// Mappers: RawEntry → Entity (validated)
// ---------------------------------------------------------------------------

function mapFilm(entry: Extract<RawEntry, { kind: "film" }>): TEntity {
  return Entity.parse({
    id: entry.id,
    type: "film",
    name: entry.name,
    aliases: entry.aliases,
    canonicity: entry.canonicity,
    era: { firstAppearance: entry.releaseYear },
    affiliations: [],
    relations: [],
    short: entry.short,
    long: entry.long,
    media: { gallery: [] },
    sources: entry.sources
  });
}

function mapComic(entry: Extract<RawEntry, { kind: "comic" }>): TEntity {
  const eraObj: { firstAppearance: number; lastAppearance?: number } = {
    firstAppearance: entry.firstIssueYear
  };
  if (entry.lastIssueYear !== null) {
    eraObj.lastAppearance = entry.lastIssueYear;
  }

  return Entity.parse({
    id: entry.id,
    type: "comic",
    name: entry.name,
    aliases: entry.aliases,
    canonicity: entry.canonicity,
    era: eraObj,
    affiliations: [],
    relations: [],
    short: entry.short,
    long: entry.long,
    media: { gallery: [] },
    sources: entry.sources
  });
}

function mapGame(entry: Extract<RawEntry, { kind: "game" }>): TEntity {
  return Entity.parse({
    id: entry.id,
    type: "game",
    name: entry.name,
    aliases: entry.aliases,
    canonicity: entry.canonicity,
    era: { firstAppearance: entry.releaseYear },
    affiliations: [],
    relations: [],
    short: entry.short,
    long: entry.long,
    media: { gallery: [] },
    sources: entry.sources
  });
}

function toEntity(entry: RawEntry): TEntity {
  switch (entry.kind) {
    case "film":
      return mapFilm(entry);
    case "comic":
      return mapComic(entry);
    case "game":
      return mapGame(entry);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const t0 = Date.now();

  // Read existing kb.json
  console.log(`[legends] reading ${KB_PATH}`);
  const rawKb = await readFile(KB_PATH, "utf-8");
  const kb = KnowledgeBase.parse(JSON.parse(rawKb));

  // Build a set of existing names (case-insensitive) to detect duplicates
  const existingNames = new Set(kb.entities.map((e) => e.name.toLowerCase()));
  // Also track existing IDs to detect ID collisions
  const existingIds = new Set(kb.entities.map((e) => e.id));

  // Collect all raw entries
  const allRaw: RawEntry[] = [
    ...RAW_FILMS,
    ...RAW_COMICS,
    ...RAW_GAMES
  ];

  // Map + dedup
  const newEntities: TEntity[] = [];
  const skippedNames: string[] = [];
  const skippedIds: string[] = [];
  let filmCount = 0;
  let comicCount = 0;
  let gameCount = 0;

  for (const raw of allRaw) {
    const nameLower = raw.name.toLowerCase();
    if (existingNames.has(nameLower)) {
      skippedNames.push(raw.name);
      continue;
    }
    if (existingIds.has(raw.id)) {
      skippedIds.push(raw.id);
      continue;
    }

    const entity = toEntity(raw);
    newEntities.push(entity);
    existingNames.add(nameLower);
    existingIds.add(raw.id);

    switch (raw.kind) {
      case "film":
        filmCount++;
        break;
      case "comic":
        comicCount++;
        break;
      case "game":
        gameCount++;
        break;
    }
  }

  console.log(`[legends] new entities: ${newEntities.length} (films: ${filmCount}, comics: ${comicCount}, games: ${gameCount})`);
  if (skippedNames.length > 0) {
    console.log(`[legends] skipped ${skippedNames.length} duplicates by name: ${skippedNames.join(", ")}`);
  }
  if (skippedIds.length > 0) {
    console.log(`[legends] skipped ${skippedIds.length} duplicates by ID: ${skippedIds.join(", ")}`);
  }

  // Attach clip links to existing film entities
  let clipLinksAttached = 0;
  const updatedExisting: TEntity[] = kb.entities.map((entity) => {
    const clipUrl = CLIP_LINKS_MAP.get(entity.id);
    if (!clipUrl) return entity;

    const updated = Entity.parse({
      ...entity,
      media: {
        ...entity.media,
        officialClipUrl: clipUrl
      }
    });
    clipLinksAttached++;
    return updated;
  });

  console.log(`[legends] attached clip links to ${clipLinksAttached} existing film entities`);

  // Merge: updated existing + new entities
  const allEntities: TEntity[] = [...updatedExisting, ...newEntities];

  // Rewrite kb.json
  const updatedKb = {
    ...kb,
    builtAt: new Date().toISOString(),
    entityCount: allEntities.length,
    entities: allEntities
  };

  await writeFile(KB_PATH, JSON.stringify(updatedKb), "utf-8");
  console.log(`[legends] wrote ${KB_PATH} (${allEntities.length} total entities)`);

  // Update manifest.json
  let manifest: Record<string, unknown> = {};
  try {
    manifest = JSON.parse(await readFile(MANIFEST_PATH, "utf-8")) as Record<string, unknown>;
  } catch {
    // manifest missing — start fresh
  }
  manifest.legendsContentAdded = newEntities.length;
  manifest.legendsFilmsAdded = filmCount;
  manifest.legendsComicsAdded = comicCount;
  manifest.legendsGamesAdded = gameCount;
  manifest.legendsClipLinksAttached = clipLinksAttached;
  manifest.legendsBuiltAt = new Date().toISOString();

  await writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2), "utf-8");
  console.log(`[legends] wrote manifest: legendsContentAdded=${newEntities.length}`);

  const elapsed = Date.now() - t0;
  console.log(`
[legends] done in ${elapsed}ms
  existing entities : ${kb.entities.length}
  new entities added: ${newEntities.length}
    films           : ${filmCount}
    comics          : ${comicCount}
    games           : ${gameCount}
  clip links        : ${clipLinksAttached}
  total entities now: ${allEntities.length}
  duplicates skipped: ${skippedNames.length + skippedIds.length}
`);
}

main().catch((err) => {
  console.error("[legends] build failed:", err);
  process.exit(1);
});
