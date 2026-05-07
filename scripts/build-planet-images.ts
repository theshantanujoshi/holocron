/**
 * build-planet-images.ts
 *
 * Fetches real planet images from Wikipedia for every planet entity in kb.json.
 *
 * Fallback title order (same as build-descriptions.ts pattern):
 *   1. {name}
 *   2. {name}_(Star_Wars)
 *   3. {name}_(planet)
 *
 * Caches API JSON under data/.cache/wiki-planets/<slug>.json.
 * Downloads thumbnail images to public/images/planets/<slug>.<ext>.
 * Emits data/build/planet-images.json.
 * Updates data/build/manifest.json with `planetImages: N`.
 *
 * Usage:
 *   npm run build:planet-images
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, extname } from "node:path";

const ROOT = process.cwd();
const KB_PATH = resolve(ROOT, "data/build/kb.json");
const MANIFEST_PATH = resolve(ROOT, "data/build/manifest.json");
const CACHE_DIR = resolve(ROOT, "data/.cache/wiki-planets");
const IMG_DIR = resolve(ROOT, "public/images/planets");
const OUT_PATH = resolve(ROOT, "data/build/planet-images.json");

const WIKI_API = "https://en.wikipedia.org/api/rest_v1/page/summary";
const USER_AGENT = "holocron-build/0.7 (https://github.com/adhit-r/holocron)";
const SLEEP_MS = 100;
const MAX_RETRIES = 3;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Shape of the Wikipedia REST summary response (only what we use). */
interface WikiSummary {
  type: string;
  title: string;
  content_urls?: {
    desktop?: { page?: string };
  };
  originalimage?: {
    source: string;
    width: number;
    height: number;
  };
  thumbnail?: {
    source: string;
    width: number;
    height: number;
  };
  attribution?: string;
}

/** One row in the emitted planet-images.json sidecar. */
export interface PlanetImage {
  planetId: string;
  slug: string;
  name: string;
  /** Relative path consumed by the UI: /images/planets/<slug>.<ext> */
  src: string;
  thumbnailSrc: string;
  originalSrc: string;
  attribution: string;
  license: string;
  wikipediaUrl: string;
}

// ---------------------------------------------------------------------------
// Minimal entity shape — we only need id, type, name from kb.json
// ---------------------------------------------------------------------------

interface RawEntity {
  id: string;
  type: string;
  name: string;
}

interface RawKb {
  entities: RawEntity[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Wikipedia title → URL segment (spaces → underscores). */
function encodeWikiTitle(title: string): string {
  return encodeURIComponent(title.replace(/ /g, "_"));
}

/** Stable filesystem slug for cache key and image filename. */
function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Detect file extension from Content-Type header or the URL.
 * Falls back to "jpg".
 */
function detectExt(contentType: string | null, url: string): string {
  if (contentType) {
    if (contentType.includes("webp")) return "webp";
    if (contentType.includes("png")) return "png";
    if (contentType.includes("gif")) return "gif";
    if (contentType.includes("jpeg") || contentType.includes("jpg")) return "jpg";
  }
  // Try URL
  const urlExt = extname(new URL(url).pathname).replace(".", "").toLowerCase();
  if (["jpg", "jpeg", "png", "webp", "gif"].includes(urlExt)) {
    return urlExt === "jpeg" ? "jpg" : urlExt;
  }
  return "jpg";
}

// ---------------------------------------------------------------------------
// Cache helpers
// ---------------------------------------------------------------------------

async function readCache(slug: string): Promise<WikiSummary | null> {
  const path = resolve(CACHE_DIR, `${slug}.json`);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(await readFile(path, "utf8")) as WikiSummary;
  } catch {
    return null;
  }
}

async function writeCache(slug: string, data: WikiSummary): Promise<void> {
  await writeFile(resolve(CACHE_DIR, `${slug}.json`), JSON.stringify(data, null, 2), "utf8");
}

// ---------------------------------------------------------------------------
// Wikipedia fetch with retry on 429
// ---------------------------------------------------------------------------

async function fetchWikiSummary(title: string): Promise<WikiSummary | null> {
  const url = `${WIKI_API}/${encodeWikiTitle(title)}`;
  let attempt = 0;

  while (attempt < MAX_RETRIES) {
    let res: Response;
    try {
      res = await fetch(url, {
        headers: {
          accept: "application/json",
          "user-agent": USER_AGENT
        }
      });
    } catch (err) {
      console.warn(`  [wiki] network error fetching "${title}":`, err);
      return null;
    }

    if (res.status === 404) return null;

    if (res.status === 429) {
      const wait = SLEEP_MS * Math.pow(2, attempt + 2); // 400 → 800 → 1600 ms
      console.warn(`  [wiki] 429 on "${title}", backing off ${wait}ms`);
      await sleep(wait);
      attempt++;
      continue;
    }

    if (!res.ok) {
      console.warn(`  [wiki] HTTP ${res.status} for "${title}"`);
      return null;
    }

    return (await res.json()) as WikiSummary;
  }

  console.warn(`  [wiki] gave up after ${MAX_RETRIES} retries for "${title}"`);
  return null;
}

// ---------------------------------------------------------------------------
// Lookup: try three title variants, cache each
// ---------------------------------------------------------------------------

async function lookupPlanet(name: string): Promise<WikiSummary | null> {
  const variants = [
    name,
    `${name} (Star Wars)`,
    `${name} (planet)`
  ];

  for (const variant of variants) {
    const slug = toSlug(variant);
    let summary = await readCache(slug);

    if (!summary) {
      await sleep(SLEEP_MS); // politeness between API calls
      summary = await fetchWikiSummary(variant);
      if (summary) {
        await writeCache(slug, summary);
      }
    }

    if (!summary) continue;
    if (summary.type === "disambiguation") continue;

    // Must have at least a thumbnail or originalimage to be useful
    if (!summary.thumbnail && !summary.originalimage) continue;

    return summary;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Image download
// ---------------------------------------------------------------------------

async function downloadImage(url: string): Promise<{ buffer: ArrayBuffer; contentType: string | null }> {
  let attempt = 0;

  while (attempt < MAX_RETRIES) {
    let res: Response;
    try {
      res = await fetch(url, {
        headers: { "user-agent": USER_AGENT }
      });
    } catch (err) {
      console.warn(`  [img] network error fetching ${url}:`, err);
      attempt++;
      continue;
    }

    if (res.status === 429) {
      const wait = SLEEP_MS * Math.pow(2, attempt + 2);
      console.warn(`  [img] 429 downloading image, backing off ${wait}ms`);
      await sleep(wait);
      attempt++;
      continue;
    }

    if (!res.ok) {
      console.warn(`  [img] HTTP ${res.status} for ${url}`);
      return { buffer: new ArrayBuffer(0), contentType: null };
    }

    const buffer = await res.arrayBuffer();
    const contentType = res.headers.get("content-type");
    return { buffer, contentType };
  }

  return { buffer: new ArrayBuffer(0), contentType: null };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const t0 = Date.now();

  // Ensure dirs
  await mkdir(CACHE_DIR, { recursive: true });
  await mkdir(IMG_DIR, { recursive: true });

  // Read kb.json (raw parse — we only need id/type/name)
  console.log(`[planet-images] reading ${KB_PATH}`);
  const kb = JSON.parse(await readFile(KB_PATH, "utf8")) as RawKb;
  const planets = kb.entities.filter((e) => e.type === "planet");
  console.log(`[planet-images] found ${planets.length} planet entities\n`);

  const results: PlanetImage[] = [];
  let hits = 0;
  let misses = 0;
  let totalBytes = 0;

  for (let i = 0; i < planets.length; i++) {
    const planet = planets[i]!;
    const label = `[planet/${i + 1}]`;
    const slug = toSlug(planet.name);

    const summary = await lookupPlanet(planet.name);

    if (!summary) {
      console.log(`${label} ${planet.name} → no Wikipedia entry ✗`);
      misses++;
      continue;
    }

    // Prefer thumbnail for datapad hero (small); fall back to originalimage
    const thumbData = summary.thumbnail ?? summary.originalimage;
    if (!thumbData) {
      console.log(`${label} ${planet.name} → no image in Wikipedia response ✗`);
      misses++;
      continue;
    }

    const thumbUrl = thumbData.source;
    const origUrl = summary.originalimage?.source ?? thumbUrl;
    const thumbW = thumbData.width;
    const thumbH = thumbData.height;

    // Check if image already downloaded (skip re-download on re-runs)
    // We still emit the record from cached summary
    const existingExts = ["jpg", "png", "webp", "gif"];
    let existingPath: string | null = null;
    let existingExt: string | null = null;
    for (const ext of existingExts) {
      const candidate = resolve(IMG_DIR, `${slug}.${ext}`);
      if (existsSync(candidate)) {
        existingPath = candidate;
        existingExt = ext;
        break;
      }
    }

    let ext: string;
    let byteSize: number;

    if (existingPath && existingExt) {
      // Already on disk — read size for reporting
      const stat = await import("node:fs/promises").then((m) => m.stat(existingPath as string));
      byteSize = stat.size;
      ext = existingExt;
    } else {
      // Download
      const { buffer, contentType } = await downloadImage(thumbUrl);
      if (buffer.byteLength === 0) {
        console.log(`${label} ${planet.name} → image download failed ✗`);
        misses++;
        continue;
      }

      ext = detectExt(contentType, thumbUrl);
      byteSize = buffer.byteLength;
      totalBytes += byteSize;

      const imgPath = resolve(IMG_DIR, `${slug}.${ext}`);
      await writeFile(imgPath, Buffer.from(buffer));
    }

    const src = `/images/planets/${slug}.${ext}`;
    const wikiUrl = summary.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${encodeWikiTitle(planet.name)}`;

    results.push({
      planetId: planet.id,
      slug,
      name: planet.name,
      src,
      thumbnailSrc: thumbUrl,
      originalSrc: origUrl,
      attribution: `Wikipedia contributors, "${summary.title}", Wikipedia, The Free Encyclopedia`,
      license: "CC-BY-SA-4.0",
      wikipediaUrl: wikiUrl
    });

    hits++;
    const kb_label = `${thumbW}×${thumbH} ${ext} (${Math.round(byteSize / 1024)} KB)`;
    console.log(`${label} ${planet.name} → ${kb_label} ✓`);
  }

  // Emit planet-images.json
  await writeFile(OUT_PATH, JSON.stringify(results, null, 2), "utf8");
  console.log(`\n[planet-images] wrote ${OUT_PATH} (${results.length} entries)`);

  // Update manifest.json
  let manifest: Record<string, unknown> = {};
  try {
    manifest = JSON.parse(await readFile(MANIFEST_PATH, "utf-8")) as Record<string, unknown>;
  } catch {
    /* start fresh */
  }
  manifest.planetImages = hits;
  manifest.planetImagesBuiltAt = new Date().toISOString();
  await writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2), "utf8");
  console.log(`[planet-images] manifest updated: planetImages=${hits}`);

  const elapsed = Date.now() - t0;
  console.log(`
[planet-images] done in ${elapsed}ms
  planets processed : ${planets.length}
  hits (images saved): ${hits}
  misses (no entry)  : ${misses}
  total bytes written: ${totalBytes.toLocaleString()} bytes (~${Math.round(totalBytes / 1024)} KB)
`);
}

main().catch((err) => {
  console.error("[planet-images] failed:", err);
  process.exit(1);
});
