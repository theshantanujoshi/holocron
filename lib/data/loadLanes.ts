import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { z } from "zod";
import { Hyperlane, type Hyperlane as THyperlane } from "@/lib/schema";

const LANES_PATH = resolve(process.cwd(), "data/build/lanes.json");

const LanesFile = z.array(Hyperlane);

let cached: THyperlane[] | null = null;

/**
 * Load hyperspace lanes from data/build/lanes.json.
 * Cached after first read. Returns null when the file is missing or fails
 * Zod validation — callers should treat that as "no lanes available" and
 * render the timeline view without overlay routes.
 */
export async function loadLanes(): Promise<THyperlane[] | null> {
  if (cached) return cached;
  if (!existsSync(LANES_PATH)) return null;
  const raw = await readFile(LANES_PATH, "utf8");
  const parsed = JSON.parse(raw);
  const validated = LanesFile.safeParse(parsed);
  if (!validated.success) {
    console.error(
      "[holocron] lanes.json failed schema validation",
      validated.error.issues.slice(0, 3)
    );
    return null;
  }
  cached = validated.data;
  return cached;
}
