import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { z } from "zod";
import { Canonicity, EntityType, FactionId } from "@/lib/schema";

/**
 * Schema for the prebuilt lineage graph at `data/build/lineage.json`.
 *
 * The build script (`scripts/build-lineage.ts`) emits a flat node + edge list
 * covering master/apprentice + parent/child + spouse/sibling relations across
 * the Force-sensitive lineage tree (Yoda → Dooku → Qui-Gon → Obi-Wan → Anakin
 * → Luke), the Sith Rule of Two chain (Bane → Plagueis → Sidious → ...), and
 * the Skywalker family. Faction is optional — older nodes carry only the SWAPI
 * id, name, and canonicity.
 */
export const LineageNode = z.object({
  id: z.string(),
  name: z.string(),
  faction: FactionId.optional(),
  canonicity: Canonicity,
  type: EntityType
});
export type LineageNode = z.infer<typeof LineageNode>;

export const LineageEdgeKind = z.enum([
  "master_of",
  "parent_of",
  "spouse_of",
  "sibling_of"
]);
export type LineageEdgeKind = z.infer<typeof LineageEdgeKind>;

export const LineageEdge = z.object({
  source: z.string(),
  target: z.string(),
  kind: LineageEdgeKind
});
export type LineageEdge = z.infer<typeof LineageEdge>;

export const LineageGraph = z.object({
  builtAt: z.string(),
  nodes: z.array(LineageNode),
  edges: z.array(LineageEdge)
});
export type LineageGraph = z.infer<typeof LineageGraph>;

const LINEAGE_PATH = resolve(process.cwd(), "data/build/lineage.json");

let cached: LineageGraph | null = null;

export async function loadLineageGraph(): Promise<LineageGraph | null> {
  if (cached) return cached;
  if (!existsSync(LINEAGE_PATH)) return null;
  const raw = await readFile(LINEAGE_PATH, "utf8");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    console.error("[holocron] lineage.json failed to parse", err);
    return null;
  }
  const validated = LineageGraph.safeParse(parsed);
  if (!validated.success) {
    console.error(
      "[holocron] lineage.json failed schema validation",
      validated.error.issues.slice(0, 3)
    );
    return null;
  }
  cached = validated.data;
  return cached;
}
