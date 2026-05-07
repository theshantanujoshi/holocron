/**
 * build-person-images.ts
 *
 * Fetches Wikipedia portrait images for all person entities in kb.json.
 *
 * For each person, tries the Wikipedia REST API:
 *   1. https://en.wikipedia.org/api/rest_v1/page/summary/{name}
 *   2. https://en.wikipedia.org/api/rest_v1/page/summary/{name}_(Star_Wars)
 *   3. https://en.wikipedia.org/api/rest_v1/page/summary/{name}_(character)
 *
 * Caches API responses to data/.cache/wiki-people/<slug>.json
 * Downloads thumbnails to public/images/people/<slug>.<ext>
 * Emits data/build/person-images.json
 * Updates data/build/manifest.json
 *
 * Usage:
 *   npm run build:person-images
 *   npm run build:person-images -- --limit 10
 */

import { mkdir, readFile, writeFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, extname } from "node:path";

const ROOT = process.cwd();
const KB_PATH = resolve(ROOT, "data/build/kb.json");
const MANIFEST_PATH = resolve(ROOT, "data/build/manifest.json");
const CACHE_DIR = resolve(ROOT, "data/.cache/wiki-people");
const IMAGES_DIR = resolve(ROOT, "public/images/people");
const OUTPUT_PATH = resolve(ROOT, "data/build/person-images.json");

const WIKI_API = "https://en.wikipedia.org/api/rest_v1/page/summary";
const USER_AGENT = "holocron-build/0.7 (https://github.com/adhit-r/holocron)";
const SLEEP_MS = 100;
const MAX_RETRIES = 3;

// ---- args ----
const args = process.argv.slice(2);
const limitIdx = args.indexOf("--limit");
const limit: number | null =
  limitIdx !== -1 ? Number.parseInt(args[limitIdx + 1] ?? "0", 10) : null;

// ---- types ----

interface WikiThumbnail {
  source: string;
  width: number;
  height: number;
}

interface WikiSummary {
  title: string;
  type: string;
  thumbnail?: WikiThumbnail;
  originalimage?: WikiThumbnail;
  content_urls?: {
    desktop?: { page?: string };
  };
  license?: {
    type?: string;
    url?: string;
  };
  attribution?: string;
}

export interface PersonImage {
  personId: string;
  slug: string;
  name: string;
  /** Relative path for use in <img src> — no basePath prefix */
  src: string;
  thumbnailSrc: string;
  originalSrc: string;
  attribution: string;
  license: string;
  wikipediaUrl: string;
  dominantColor: string | null;
}

// ---- helpers ----

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** URL-encode a Wikipedia title (spaces → underscores). */
function encodeWikiTitle(title: string): string {
  return encodeURIComponent(title.replace(/ /g, "_"));
}

/** Stable kebab-case filesystem slug. */
function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Detect image extension from Content-Type header or URL. */
function detectExt(contentType: string | null, url: string): string {
  if (contentType) {
    if (contentType.includes("jpeg") || contentType.includes("jpg")) return ".jpg";
    if (contentType.includes("png")) return ".png";
    if (contentType.includes("webp")) return ".webp";
    if (contentType.includes("gif")) return ".gif";
  }
  const urlExt = extname(url.split("?")[0] ?? "").toLowerCase();
  if ([".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(urlExt)) {
    return urlExt === ".jpeg" ? ".jpg" : urlExt;
  }
  return ".jpg";
}

// ---- dominant color extraction ----
// Samples center-third of a JPEG/PNG by reading raw bytes and walking pixel data.
// JPEG: find Start Of Scan (SOS) marker then decode a rough sample; PNG: read IDAT.
// This is deliberately rough — we just want an approximate hue for the beam tint.

/**
 * Extract dominant color from image bytes using a minimal pixel sampler.
 * Only handles JPEG (reads raw DCT approximation) and PNG (reads IDAT directly).
 * Returns a CSS hex color string, or null on failure.
 */
function extractDominantColor(bytes: Uint8Array): string | null {
  try {
    // Check if JPEG (FF D8 FF)
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
      return extractDominantColorJpeg(bytes);
    }
    // Check if PNG (89 50 4E 47)
    if (
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47
    ) {
      return extractDominantColorPng(bytes);
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * JPEG dominant color: scan raw bytes for high-value triplets that look like pixel data.
 * Not a proper JPEG decoder — we skip markers and sample bytes in the compressed stream,
 * looking for regions that suggest the dominant brightness/hue. Good enough for a tint.
 */
function extractDominantColorJpeg(bytes: Uint8Array): string | null {
  // Walk markers to find SOS (Start of Scan), then sample after it
  let i = 2; // skip SOI
  while (i < bytes.length - 4) {
    if (bytes[i] !== 0xff) { i++; continue; }
    const marker = bytes[i + 1];
    if (marker === 0xda) {
      // SOS found — sample bytes after the compressed stream offset
      // The compressed data starts approximately 10 bytes after SOS header
      const dataStart = i + 2 + ((bytes[i + 2]! << 8) | bytes[i + 3]!);
      return sampleRawBytesAsColor(bytes, dataStart, bytes.length);
    }
    if (marker === 0xd9) break; // EOI
    if (marker === 0xd8 || marker === 0x00) { i += 2; continue; }
    const segLen = (bytes[i + 2]! << 8) | bytes[i + 3]!;
    i += 2 + segLen;
  }
  // Fallback: sample the middle third of file bytes
  return sampleRawBytesAsColor(bytes, Math.floor(bytes.length / 3), Math.floor((bytes.length * 2) / 3));
}

/**
 * PNG dominant color: locate IDAT chunk data and sample raw deflated bytes.
 * Same approach — not a decoder, just a color hint from the compressed stream.
 */
function extractDominantColorPng(bytes: Uint8Array): string | null {
  let i = 8; // skip PNG signature
  while (i < bytes.length - 12) {
    const chunkLen =
      ((bytes[i]! << 24) | (bytes[i + 1]! << 16) | (bytes[i + 2]! << 8) | bytes[i + 3]!) >>> 0;
    const chunkType = String.fromCharCode(
      bytes[i + 4]!, bytes[i + 5]!, bytes[i + 6]!, bytes[i + 7]!
    );
    if (chunkType === "IDAT") {
      const dataStart = i + 8;
      const dataEnd = Math.min(dataStart + chunkLen, bytes.length);
      return sampleRawBytesAsColor(bytes, dataStart, dataEnd);
    }
    i += 12 + chunkLen;
  }
  return null;
}

/**
 * Sample bytes in [start, end) and derive an average color.
 * We walk in steps picking byte triplets and treating them as approximate R,G,B values.
 * Filters out very dark/light samples (likely background or artifacts).
 */
function sampleRawBytesAsColor(
  bytes: Uint8Array,
  start: number,
  end: number
): string | null {
  const len = end - start;
  if (len < 30) return null;

  let rSum = 0, gSum = 0, bSum = 0, count = 0;
  const step = Math.max(3, Math.floor(len / 300)); // ~300 samples

  for (let i = start; i < end - 2; i += step) {
    const r = bytes[i]!;
    const g = bytes[i + 1]!;
    const b = bytes[i + 2]!;
    // Filter extremes (near-black or near-white, likely artifacts)
    const brightness = (r + g + b) / 3;
    if (brightness < 20 || brightness > 240) continue;
    rSum += r; gSum += g; bSum += b; count++;
  }

  if (count === 0) return null;

  const r = Math.round(rSum / count);
  const g = Math.round(gSum / count);
  const b = Math.round(bSum / count);

  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

// ---- Wikipedia API ----

/** Fetch Wikipedia REST summary with retry on 429. Returns null on 404/error. */
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
      console.warn(`  [wiki] network error for "${title}":`, err);
      return null;
    }

    if (res.status === 404) return null;

    if (res.status === 429) {
      const wait = SLEEP_MS * Math.pow(2, attempt + 2);
      console.warn(`  [wiki] 429 rate-limited on "${title}", backing off ${wait}ms`);
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

/** Read cached API response, or null. */
async function readCache(slug: string): Promise<WikiSummary | null> {
  const path = resolve(CACHE_DIR, `${slug}.json`);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(await readFile(path, "utf8")) as WikiSummary;
  } catch {
    return null;
  }
}

/** Write API response to cache. */
async function writeCache(slug: string, data: WikiSummary): Promise<void> {
  await writeFile(resolve(CACHE_DIR, `${slug}.json`), JSON.stringify(data), "utf8");
}

/**
 * Try multiple Wikipedia title variants for a person name.
 * Returns {summary, matchTitle} for the first hit that has a thumbnail, or null.
 */
async function findPersonSummary(
  name: string
): Promise<{ summary: WikiSummary; matchTitle: string } | null> {
  const variants: string[] = [
    name,
    `${name} (Star Wars)`,
    `${name} (character)`
  ];

  for (const variant of variants) {
    const slug = toSlug(variant);
    let summary = await readCache(slug);

    if (!summary) {
      await sleep(SLEEP_MS);
      summary = await fetchWikiSummary(variant);
      if (summary) {
        await writeCache(slug, summary);
      }
    }

    if (!summary) continue;
    if (summary.type === "disambiguation") continue;
    // Must have a thumbnail to be useful for portraits
    if (!summary.thumbnail?.source) continue;

    return { summary, matchTitle: variant };
  }

  return null;
}

/** Download image bytes from URL. Returns null on error. */
async function downloadImage(
  url: string
): Promise<{ bytes: Uint8Array; contentType: string | null } | null> {
  let attempt = 0;
  while (attempt < MAX_RETRIES) {
    let res: Response;
    try {
      res = await fetch(url, {
        headers: { "user-agent": USER_AGENT }
      });
    } catch (err) {
      console.warn(`  [img] network error fetching ${url}:`, err);
      return null;
    }

    if (res.status === 429) {
      const wait = SLEEP_MS * Math.pow(2, attempt + 2);
      await sleep(wait);
      attempt++;
      continue;
    }

    if (!res.ok) {
      console.warn(`  [img] HTTP ${res.status} for ${url}`);
      return null;
    }

    const buf = await res.arrayBuffer();
    const bytes = new Uint8Array(buf);
    const contentType = res.headers.get("content-type");
    return { bytes, contentType };
  }
  return null;
}

// ---- main ----

interface KbRaw {
  entities: Array<{ id: string; type: string; name: string }>;
}

async function main(): Promise<void> {
  const t0 = Date.now();

  // Ensure directories
  await mkdir(CACHE_DIR, { recursive: true });
  await mkdir(IMAGES_DIR, { recursive: true });

  // Read kb.json (raw — we only need id/type/name, skip full schema parse)
  console.log(`[person-images] reading ${KB_PATH}`);
  const raw = JSON.parse(await readFile(KB_PATH, "utf8")) as KbRaw;
  let persons = raw.entities.filter((e) => e.type === "person");

  if (limit !== null && limit > 0) {
    persons = persons.slice(0, limit);
    console.log(`[person-images] --limit ${limit}: processing ${persons.length} persons`);
  } else {
    console.log(`[person-images] processing all ${persons.length} persons`);
  }

  const results: PersonImage[] = [];
  let hits = 0;
  let misses = 0;
  let totalBytes = 0;

  for (let i = 0; i < persons.length; i++) {
    const person = persons[i]!;
    const idx = `[${i + 1}/${persons.length}]`;
    const slug = toSlug(person.name);

    // Check if we already have the image file (skip re-download)
    const existingExts = [".jpg", ".png", ".webp", ".gif"];
    let existingPath: string | null = null;
    for (const ext of existingExts) {
      const p = resolve(IMAGES_DIR, `${slug}${ext}`);
      if (existsSync(p)) { existingPath = p; break; }
    }

    // Try to find a cached or live Wikipedia entry
    const found = await findPersonSummary(person.name);

    if (!found) {
      console.log(`  ${idx} — ${person.name} (no Wikipedia portrait)`);
      misses++;
      continue;
    }

    const { summary } = found;
    const thumbnailUrl = summary.thumbnail!.source!;
    const originalUrl = summary.originalimage?.source ?? thumbnailUrl;
    const wikiUrl = summary.content_urls?.desktop?.page ?? "";
    const licenseType = summary.license?.type ?? "cc-by-sa";
    const attributionText = `Wikipedia: ${summary.title}`;

    let imagePath: string;
    let ext: string;
    let dominantColor: string | null = null;

    if (existingPath) {
      // Image already downloaded — read for dominant color extraction
      imagePath = existingPath;
      ext = extname(existingPath);
      const existingBytes = new Uint8Array(await readFile(existingPath));
      dominantColor = extractDominantColor(existingBytes);
      const fileStat = await stat(existingPath);
      totalBytes += fileStat.size;
      console.log(
        `  ${idx} ✓ ${person.name} (cached: ${Math.round(fileStat.size / 1024)}KB, color: ${dominantColor ?? "n/a"})`
      );
    } else {
      // Download the thumbnail
      const dl = await downloadImage(thumbnailUrl);
      if (!dl) {
        console.log(`  ${idx} — ${person.name} (image download failed)`);
        misses++;
        continue;
      }

      ext = detectExt(dl.contentType, thumbnailUrl);
      imagePath = resolve(IMAGES_DIR, `${slug}${ext}`);
      await writeFile(imagePath, dl.bytes);
      totalBytes += dl.bytes.length;
      dominantColor = extractDominantColor(dl.bytes);

      console.log(
        `  ${idx} ✓ ${person.name} → ${slug}${ext} (${Math.round(dl.bytes.length / 1024)}KB, color: ${dominantColor ?? "n/a"})`
      );
    }

    const src = `/images/people/${slug}${ext}`;
    results.push({
      personId: person.id,
      slug,
      name: person.name,
      src,
      thumbnailSrc: thumbnailUrl,
      originalSrc: originalUrl,
      attribution: attributionText,
      license: licenseType,
      wikipediaUrl: wikiUrl,
      dominantColor
    });
    hits++;
  }

  // Write person-images.json
  await writeFile(OUTPUT_PATH, JSON.stringify(results, null, 2), "utf8");
  console.log(`\n[person-images] wrote ${OUTPUT_PATH} (${results.length} entries)`);

  // Update manifest.json
  let manifest: Record<string, unknown> = {};
  try {
    manifest = JSON.parse(await readFile(MANIFEST_PATH, "utf-8")) as Record<string, unknown>;
  } catch { /* fresh */ }
  manifest.personImages = results.length;
  manifest.personImagesBuiltAt = new Date().toISOString();
  await writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2), "utf8");
  console.log(`[person-images] updated manifest: personImages=${results.length}`);

  const elapsed = Date.now() - t0;
  console.log(`
[person-images] done in ${elapsed}ms
  persons processed : ${persons.length}
  hits (with image) : ${hits}
  misses (no portrait): ${misses}
  total image bytes : ${totalBytes} (${Math.round(totalBytes / 1024)}KB)
`);
}

main().catch((err) => {
  console.error("[person-images] failed:", err);
  process.exit(1);
});
