import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { z } from "zod";

const MANIFEST_PATH = resolve(process.cwd(), "data/build/manifest.json");

const ManifestSchema = z.object({
  builtAt: z.string(),
  durationMs: z.number().optional(),
  counts: z.object({
    total: z.number(),
    invalid: z.number().optional(),
    coordsMatched: z.number().optional(),
    byType: z.record(z.string(), z.number()).optional()
  }),
  sources: z.array(z.object({ id: z.string(), url: z.string(), license: z.string() })).optional(),
  descriptionsEnriched: z.number().optional(),
  descriptionsBuiltAt: z.string().optional()
});

export type Manifest = z.infer<typeof ManifestSchema>;

let cached: Manifest | null = null;

export async function loadManifest(): Promise<Manifest | null> {
  if (cached) return cached;
  if (!existsSync(MANIFEST_PATH)) return null;
  const raw = await readFile(MANIFEST_PATH, "utf8");
  const parsed: unknown = JSON.parse(raw);
  const validated = ManifestSchema.safeParse(parsed);
  if (!validated.success) {
    console.error("[holocron] manifest.json failed schema validation", validated.error.issues.slice(0, 3));
    return null;
  }
  cached = validated.data;
  return cached;
}
