import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const PLANET_IMAGES_PATH = resolve(process.cwd(), "data/build/planet-images.json");

/** One entry from data/build/planet-images.json. */
export interface PlanetImage {
  planetId: string;
  slug: string;
  name: string;
  /** Relative path, no basePath prefix: /images/planets/<slug>.<ext> */
  src: string;
  thumbnailSrc: string;
  originalSrc: string;
  attribution: string;
  license: string;
  wikipediaUrl: string;
}

let cached: Map<string, PlanetImage> | null = null;

/**
 * Server-side reader for planet image metadata.
 * Returns a Map keyed by planetId for O(1) lookup, or null if the file
 * doesn't exist (build hasn't been run yet).
 */
export async function loadPlanetImages(): Promise<Map<string, PlanetImage> | null> {
  if (cached) return cached;
  if (!existsSync(PLANET_IMAGES_PATH)) return null;

  let raw: string;
  try {
    raw = await readFile(PLANET_IMAGES_PATH, "utf8");
  } catch {
    return null;
  }

  let entries: unknown;
  try {
    entries = JSON.parse(raw);
  } catch {
    console.error("[holocron] planet-images.json is malformed JSON");
    return null;
  }

  if (!Array.isArray(entries)) {
    console.error("[holocron] planet-images.json expected an array");
    return null;
  }

  const map = new Map<string, PlanetImage>();
  for (const entry of entries) {
    if (
      entry !== null &&
      typeof entry === "object" &&
      typeof (entry as Record<string, unknown>)["planetId"] === "string" &&
      typeof (entry as Record<string, unknown>)["src"] === "string"
    ) {
      const img = entry as PlanetImage;
      map.set(img.planetId, img);
    }
  }

  cached = map;
  return cached;
}
