/**
 * build-descriptions.ts
 *
 * Enriches entity `long` descriptions by fetching Wikipedia summaries.
 *
 * For each entity in data/build/kb.json, tries the Wikipedia REST API:
 *   1. https://en.wikipedia.org/api/rest_v1/page/summary/{name}
 *   2. https://en.wikipedia.org/api/rest_v1/page/summary/{name}_(Star_Wars)
 *   3. https://en.wikipedia.org/api/rest_v1/page/summary/{name}_({type})
 *
 * Caches results to data/.cache/wiki/{slug}.json so re-runs are instant.
 * Sets entity.long = wikipedia extract (≤600 chars). Does NOT touch entity.short.
 *
 * Usage:
 *   npm run build:descriptions            # all 260 entities
 *   npm run build:descriptions -- --limit 10  # first 10 only (for testing)
 *
 * Outputs:
 *   data/build/kb.json          (overwritten with enriched descriptions)
 *   data/build/manifest.json    (updated with descriptionsEnriched count)
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { KnowledgeBase, Entity, type Entity as TEntity } from "../lib/schema";

const ROOT = process.cwd();
const KB_PATH = resolve(ROOT, "data/build/kb.json");
const MANIFEST_PATH = resolve(ROOT, "data/build/manifest.json");
const CACHE_DIR = resolve(ROOT, "data/.cache/wiki");

const WIKI_API = "https://en.wikipedia.org/api/rest_v1/page/summary";
const MAX_CHARS = 600;
const SLEEP_MS = 100;
const MAX_RETRIES = 3;

// ---- args ----
const args = process.argv.slice(2);
const limitIdx = args.indexOf("--limit");
const limit: number | null = limitIdx !== -1 ? Number.parseInt(args[limitIdx + 1] ?? "0", 10) : null;

// ---- helpers ----

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** URL-encode a Wikipedia title slug (spaces → underscores, special chars encoded). */
function encodeWikiTitle(title: string): string {
  // Wikipedia titles use underscores for spaces
  return encodeURIComponent(title.replace(/ /g, "_"));
}

/** A stable filesystem slug for the cache key — lowercase, no special chars. */
function cacheSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "-")
    .replace(/^-|-$/g, "");
}

interface WikiSummary {
  title: string;
  type: string;
  extract: string;
}

const WikiSummaryShape = {
  isDisambiguation(s: WikiSummary): boolean {
    return s.type === "disambiguation";
  }
};

/**
 * Fetch a single Wikipedia summary with retry on 429 (exponential backoff).
 * Returns null on 404 / disambiguation / any non-retryable error.
 */
async function fetchWikiSummary(title: string): Promise<WikiSummary | null> {
  const url = `${WIKI_API}/${encodeWikiTitle(title)}`;

  let attempt = 0;
  while (attempt < MAX_RETRIES) {
    let res: Response;
    try {
      res = await fetch(url, {
        headers: {
          accept: "application/json",
          "user-agent": "holocron-build/0.1 (https://github.com/axonome/holocron)"
        }
      });
    } catch (err) {
      // Network error — give up
      console.warn(`  [wiki] network error fetching "${title}":`, err);
      return null;
    }

    if (res.status === 404) return null;

    if (res.status === 429) {
      // Rate-limited: exponential backoff
      const wait = SLEEP_MS * Math.pow(2, attempt + 2); // 400ms, 800ms, 1600ms
      console.warn(`  [wiki] 429 rate-limited on "${title}", backing off ${wait}ms`);
      await sleep(wait);
      attempt++;
      continue;
    }

    if (!res.ok) {
      console.warn(`  [wiki] HTTP ${res.status} for "${title}"`);
      return null;
    }

    const json = (await res.json()) as WikiSummary;
    return json;
  }

  console.warn(`  [wiki] gave up after ${MAX_RETRIES} retries for "${title}"`);
  return null;
}

/** Read from file cache, or null if miss. */
async function readCache(slug: string): Promise<WikiSummary | null> {
  const path = resolve(CACHE_DIR, `${slug}.json`);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(await readFile(path, "utf8")) as WikiSummary;
  } catch {
    return null;
  }
}

/** Write to file cache. Creates dir if needed (idempotent). */
async function writeCache(slug: string, data: WikiSummary): Promise<void> {
  const path = resolve(CACHE_DIR, `${slug}.json`);
  await writeFile(path, JSON.stringify(data), "utf8");
}

/**
 * Look up Wikipedia for an entity, trying three title variants in order:
 *   1. raw name (e.g. "Tatooine")
 *   2. "{name}_(Star_Wars)" (e.g. "Luke_Skywalker_(Star_Wars)")
 *   3. "{name}_({type})" (e.g. "Tatooine_(planet)")
 *
 * Returns the extract string (≤600 chars), or "" if nothing found.
 */
async function lookupEntity(entity: TEntity): Promise<string> {
  const variants: string[] = [
    entity.name,
    `${entity.name} (Star Wars)`,
    `${entity.name} (${entity.type})`
  ];

  // Films: also try the plain title which often works best
  if (entity.type === "film") {
    variants.unshift(entity.name.replace(/^Star Wars: /, "").replace(/^Star Wars Episode \w+: /, ""));
  }

  for (const variant of variants) {
    const slug = cacheSlug(variant);
    let summary = await readCache(slug);

    if (!summary) {
      await sleep(SLEEP_MS);
      summary = await fetchWikiSummary(variant);
      if (summary) {
        await writeCache(slug, summary);
      }
    }

    if (!summary) continue;
    if (WikiSummaryShape.isDisambiguation(summary)) continue;
    if (!summary.extract || summary.extract.trim().length === 0) continue;

    // Truncate to MAX_CHARS at sentence boundary if possible
    let extract = summary.extract.trim();
    if (extract.length > MAX_CHARS) {
      // Try to cut at last period before MAX_CHARS
      const cutoff = extract.lastIndexOf(".", MAX_CHARS);
      extract = cutoff > MAX_CHARS / 2
        ? extract.slice(0, cutoff + 1)
        : extract.slice(0, MAX_CHARS);
    }

    return extract;
  }

  return "";
}

// ---- main ----

async function main(): Promise<void> {
  const t0 = Date.now();

  // Ensure cache dir exists
  await mkdir(CACHE_DIR, { recursive: true });

  // Read and validate kb.json
  console.log(`[descriptions] reading ${KB_PATH}`);
  const raw = await readFile(KB_PATH, "utf-8");
  const kb = KnowledgeBase.parse(JSON.parse(raw));
  let entities = kb.entities;

  if (limit !== null && limit > 0) {
    entities = entities.slice(0, limit);
    console.log(`[descriptions] --limit ${limit}: processing first ${entities.length} entities`);
  } else {
    console.log(`[descriptions] processing all ${entities.length} entities`);
  }

  // Enrich each entity
  let enriched = 0;
  let missed = 0;
  let cached = 0;

  for (let i = 0; i < entities.length; i++) {
    const entity = entities[i]!;
    const pct = Math.round(((i + 1) / entities.length) * 100);

    // Check if any cache variant exists (to report cached vs live)
    const mainSlug = cacheSlug(entity.name);
    const cacheHit = existsSync(resolve(CACHE_DIR, `${mainSlug}.json`)) ||
      existsSync(resolve(CACHE_DIR, `${cacheSlug(`${entity.name} (Star Wars)`)}.json`)) ||
      existsSync(resolve(CACHE_DIR, `${cacheSlug(`${entity.name} (${entity.type})`)}.json`));

    const extract = await lookupEntity(entity);

    if (extract) {
      entity.long = extract;
      enriched++;
      if (cacheHit) cached++;
      if (!cacheHit) {
        // Only log live fetches to avoid spam on re-runs
        console.log(`  [${i + 1}/${entities.length}] ${pct}% ✓ ${entity.name}`);
      }
    } else {
      missed++;
      if (!cacheHit) {
        // Only log first-time misses
        console.log(`  [${i + 1}/${entities.length}] ${pct}% — ${entity.name} (no Wikipedia entry)`);
      }
    }
  }

  // If --limit was used, splice updated entities back into the full set
  const allEntities: TEntity[] =
    limit !== null && limit > 0
      ? [...entities, ...kb.entities.slice(entities.length)]
      : entities;

  // Validate all entities before writing
  const validated: TEntity[] = [];
  for (const e of allEntities) {
    const r = Entity.safeParse(e);
    if (r.success) validated.push(r.data);
    else console.warn(`[descriptions] validation failed for ${e.id}:`, r.error.issues.slice(0, 2));
  }

  const finalEnrichedCount = validated.filter((e) => e.long.length > 0).length;

  // Rewrite kb.json
  const updatedKb = {
    ...kb,
    builtAt: new Date().toISOString(),
    entityCount: validated.length,
    entities: validated
  };

  await writeFile(KB_PATH, JSON.stringify(updatedKb), "utf8");
  console.log(`[descriptions] wrote ${KB_PATH}`);

  // Update manifest.json
  let manifest: Record<string, unknown> = {};
  try {
    manifest = JSON.parse(await readFile(MANIFEST_PATH, "utf-8")) as Record<string, unknown>;
  } catch {
    // manifest missing — start fresh
  }
  manifest.descriptionsEnriched = finalEnrichedCount;
  manifest.descriptionsBuiltAt = new Date().toISOString();
  await writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2), "utf8");
  console.log(`[descriptions] wrote manifest: descriptionsEnriched=${finalEnrichedCount}`);

  const elapsed = Date.now() - t0;
  console.log(`
[descriptions] done in ${elapsed}ms
  entities processed : ${entities.length}
  enriched (long set): ${enriched}
  from cache         : ${cached}
  missed (no wiki)   : ${missed}
  total enriched now : ${finalEnrichedCount}
`);
}

main().catch((err) => {
  console.error("[descriptions] failed:", err);
  process.exit(1);
});
