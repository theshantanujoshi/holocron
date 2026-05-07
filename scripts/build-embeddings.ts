/**
 * build-embeddings.ts
 *
 * Build-time embeddings pipeline for Holocron.
 *
 * Reads `data/build/kb.json` and produces:
 *   public/data/vectors.bin        — packed Float32Array(N × dim) (raw binary)
 *   public/data/vectors.meta.json  — { dim, count, modelId, ids[], builtAt }
 *
 * Model: Xenova/all-MiniLM-L6-v2 (384-dim, ~25MB ONNX). Best speed/quality
 * tradeoff for 260 entities; runs entirely in-browser after first download.
 *
 * The description string for each entity is composed from name, aliases,
 * type, short blurb, era summary, and the top-6 relation summaries (kind +
 * resolved target name). Relation target names are resolved against the
 * full entity set so the embedding sees "apprentice of Obi-Wan Kenobi"
 * rather than "apprentice of person/10".
 *
 * No mock data. Uses real Hugging Face model weights cached under
 * node_modules/@xenova/transformers/.cache by the library.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { KnowledgeBase, type Entity, type Relation } from "../lib/schema";

const ROOT = process.cwd();
const KB_PATH = resolve(ROOT, "data/build/kb.json");
const OUT_DIR = resolve(ROOT, "public/data");
const VECTORS_BIN = resolve(OUT_DIR, "vectors.bin");
const VECTORS_META = resolve(OUT_DIR, "vectors.meta.json");

const MODEL_ID = "Xenova/all-MiniLM-L6-v2";
const TOP_RELATIONS = 6;

function summarizeEra(e: Entity): string {
  const era = e.era;
  if (!era) return "";
  const parts: string[] = [];
  if (typeof era.birthYear === "number") parts.push(`born ${formatYear(era.birthYear)}`);
  if (typeof era.deathYear === "number") parts.push(`died ${formatYear(era.deathYear)}`);
  if (typeof era.firstAppearance === "number" && typeof era.birthYear !== "number") {
    parts.push(`first appears ${formatYear(era.firstAppearance)}`);
  }
  if (typeof era.lastAppearance === "number" && typeof era.deathYear !== "number") {
    parts.push(`last appears ${formatYear(era.lastAppearance)}`);
  }
  return parts.join(", ");
}

function formatYear(y: number): string {
  if (y === 0) return "0 ABY";
  return y < 0 ? `${Math.abs(y)} BBY` : `${y} ABY`;
}

function relationLabel(kind: Relation["kind"]): string {
  // Human-readable phrasing for relation kinds.
  const map: Record<string, string> = {
    master_of: "master of",
    apprentice_of: "apprentice of",
    parent_of: "parent of",
    child_of: "child of",
    sibling_of: "sibling of",
    spouse_of: "spouse of",
    ally_of: "ally of",
    enemy_of: "enemy of",
    member_of: "member of",
    leader_of: "leader of",
    homeworld_of: "from",
    located_in: "located in",
    appears_in: "appears in",
    captained_by: "captained by",
    designed_by: "designed by",
    fought_in: "fought in",
    occurred_at: "occurred at"
  };
  return map[kind] ?? kind;
}

function buildDescription(e: Entity, byId: Map<string, Entity>): string {
  // name | aliases | type | short | era summary | top 6 relations
  const aliases = e.aliases.join(" ");
  const era = summarizeEra(e);

  const relSummaries: string[] = [];
  for (const r of e.relations.slice(0, TOP_RELATIONS)) {
    const target = byId.get(r.target);
    if (!target) continue;
    relSummaries.push(`${relationLabel(r.kind)} ${target.name}`);
  }

  const parts = [
    e.name,
    aliases,
    e.type,
    e.short,
    e.long,
    era,
    relSummaries.join(", ")
  ].filter((p) => p && p.trim().length > 0);

  return parts.join(" | ");
}

async function main() {
  const t0 = Date.now();
  console.log(`[embeddings] reading ${KB_PATH}`);
  const raw = await readFile(KB_PATH, "utf-8");
  const kb = KnowledgeBase.parse(JSON.parse(raw));
  const entities = kb.entities;
  console.log(`[embeddings] ${entities.length} entities`);

  const byId = new Map<string, Entity>();
  for (const e of entities) byId.set(e.id, e);

  const descriptions = entities.map((e) => buildDescription(e, byId));
  // Quick sanity: log a few descriptions.
  for (let i = 0; i < Math.min(3, descriptions.length); i++) {
    console.log(`[embeddings] sample[${i}]: ${descriptions[i]}`);
  }

  console.log(`[embeddings] loading model: ${MODEL_ID}`);
  // Dynamic import keeps tsc happy and matches client-side pattern.
  const { pipeline, env } = await import("@xenova/transformers");
  // Allow remote model download (first run); cache under node_modules/.cache.
  env.allowRemoteModels = true;
  env.allowLocalModels = false;

  const tModel = Date.now();
  const extractor = await pipeline("feature-extraction", MODEL_ID, { quantized: true });
  console.log(`[embeddings] model ready in ${Date.now() - tModel}ms`);

  // Detect dim by embedding the first description.
  const tEmbed = Date.now();
  const vectors: Float32Array[] = [];
  let dim = 384;

  for (let i = 0; i < descriptions.length; i++) {
    const text = descriptions[i] ?? "";
    const out = (await extractor(text, {
      pooling: "mean",
      normalize: true
    })) as unknown as { data: Float32Array; dims: number[] };
    if (i === 0) {
      dim = out.dims[out.dims.length - 1] ?? 384;
      console.log(`[embeddings] dim = ${dim}`);
    }
    vectors.push(out.data);
    if ((i + 1) % 50 === 0 || i === descriptions.length - 1) {
      const pct = Math.round(((i + 1) / descriptions.length) * 100);
      console.log(`[embeddings] ${i + 1}/${descriptions.length} (${pct}%)`);
    }
  }
  console.log(`[embeddings] embedded in ${Date.now() - tEmbed}ms`);

  // Pack into one Float32Array(N × dim).
  const packed = new Float32Array(entities.length * dim);
  for (let i = 0; i < vectors.length; i++) {
    packed.set(vectors[i]!, i * dim);
  }

  await mkdir(OUT_DIR, { recursive: true });
  // Write raw little-endian bytes (Float32Array native byte order).
  await writeFile(VECTORS_BIN, Buffer.from(packed.buffer));

  const meta = {
    dim,
    count: entities.length,
    modelId: MODEL_ID,
    ids: entities.map((e) => e.id),
    builtAt: new Date().toISOString()
  };
  await writeFile(VECTORS_META, JSON.stringify(meta, null, 2));

  const sizeBytes = packed.byteLength;
  console.log(
    `[embeddings] wrote vectors.bin (${sizeBytes.toLocaleString()} bytes, ${(sizeBytes / 1024).toFixed(1)} KB)`
  );
  console.log(`[embeddings] wrote vectors.meta.json`);
  console.log(`[embeddings] total ${Date.now() - t0}ms`);
}

main().catch((err) => {
  console.error("[embeddings] failed:", err);
  process.exit(1);
});
