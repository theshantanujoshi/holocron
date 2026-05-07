import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const PERSON_IMAGES_PATH = resolve(process.cwd(), "data/build/person-images.json");

export interface PersonImage {
  personId: string;
  slug: string;
  name: string;
  /** Relative path — no basePath prefix. Use with router.basePath or asset prefix. */
  src: string;
  thumbnailSrc: string;
  originalSrc: string;
  attribution: string;
  license: string;
  wikipediaUrl: string;
  dominantColor: string | null;
}

let cached: Map<string, PersonImage> | null = null;

/**
 * Load person-images.json and index by personId.
 * Returns null if the file doesn't exist (pre-build or build skipped).
 */
export async function loadPersonImages(): Promise<Map<string, PersonImage> | null> {
  if (cached) return cached;
  if (!existsSync(PERSON_IMAGES_PATH)) return null;

  let raw: string;
  try {
    raw = await readFile(PERSON_IMAGES_PATH, "utf8");
  } catch {
    return null;
  }

  let arr: unknown;
  try {
    arr = JSON.parse(raw);
  } catch {
    console.error("[holocron] person-images.json is invalid JSON");
    return null;
  }

  if (!Array.isArray(arr)) {
    console.error("[holocron] person-images.json is not an array");
    return null;
  }

  const map = new Map<string, PersonImage>();
  for (const item of arr) {
    if (
      typeof item === "object" &&
      item !== null &&
      "personId" in item &&
      typeof (item as Record<string, unknown>).personId === "string"
    ) {
      const img = item as PersonImage;
      map.set(img.personId, img);
    }
  }

  cached = map;
  return cached;
}
