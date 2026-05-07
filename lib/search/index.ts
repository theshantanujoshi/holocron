"use client";

import { create, insertMultiple, search, type AnyOrama } from "@orama/orama";
import type { Entity } from "@/lib/schema";

export type SearchSource = "lex" | "sem" | "hybrid";

export type SearchDoc = {
  id: string;
  type: Entity["type"];
  name: string;
  aliases: string;
  short: string;
  canonicity: Entity["canonicity"];
};

export type SearchHit = SearchDoc & {
  score: number;
  source: SearchSource;
};

type VectorsMeta = {
  dim: number;
  count: number;
  modelId: string;
  ids: string[];
  builtAt: string;
};

type SemanticIndex = {
  meta: VectorsMeta;
  vectors: Float32Array; // length = count * dim
  // Lazy-resolved feature-extraction pipeline (any to avoid pulling Xenova types into top-level).
  extractor: (text: string, opts: { pooling: "mean"; normalize: true }) => Promise<{
    data: Float32Array;
    dims: number[];
  }>;
};

let dbPromise: Promise<AnyOrama> | null = null;
let semanticPromise: Promise<SemanticIndex> | null = null;

const SEMANTIC_TOP_K = 24;
const HYBRID_W_LEX = 0.5;
const HYBRID_W_SEM = 0.5;

export function getDb(entities: Entity[]): Promise<AnyOrama> {
  if (dbPromise) return dbPromise;
  dbPromise = (async () => {
    const db = create({
      schema: {
        id: "string",
        type: "string",
        name: "string",
        aliases: "string",
        short: "string",
        canonicity: "string"
      } as const,
      components: {
        tokenizer: { language: "english", stemming: true }
      }
    });

    const docs: SearchDoc[] = entities.map((e) => ({
      id: e.id,
      type: e.type,
      name: e.name,
      aliases: e.aliases.join(" "),
      short: e.short,
      canonicity: e.canonicity
    }));

    await insertMultiple(db, docs);
    return db;
  })();
  return dbPromise;
}

/**
 * Lazy-load the semantic index (vectors + transformer model).
 * Runs only client-side; the transformers package is dynamic-imported so
 * the landing-page bundle never pulls it in.
 */
export function loadSemanticIndex(): Promise<SemanticIndex> {
  if (semanticPromise) return semanticPromise;
  if (typeof window === "undefined") {
    semanticPromise = Promise.reject(new Error("semantic index is client-only"));
    return semanticPromise;
  }
  semanticPromise = (async () => {
    const [metaRes, binRes] = await Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/data/vectors.meta.json`),
      fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/data/vectors.bin`)
    ]);
    if (!metaRes.ok) throw new Error(`vectors.meta.json: ${metaRes.status}`);
    if (!binRes.ok) throw new Error(`vectors.bin: ${binRes.status}`);

    const meta = (await metaRes.json()) as VectorsMeta;
    const buf = await binRes.arrayBuffer();
    const vectors = new Float32Array(buf);
    if (vectors.length !== meta.count * meta.dim) {
      throw new Error(
        `vectors.bin size mismatch: got ${vectors.length} floats, expected ${meta.count * meta.dim}`
      );
    }

    // Lazy import — keeps the package out of the initial bundle.
    const transformers = await import("@xenova/transformers");
    const { pipeline, env } = transformers;
    // Browser caches model weights via the library's IndexedDB layer.
    env.allowRemoteModels = true;
    env.allowLocalModels = false;

    const extractor = (await pipeline("feature-extraction", meta.modelId, {
      quantized: true
    })) as SemanticIndex["extractor"];

    return { meta, vectors, extractor };
  })();
  return semanticPromise;
}

export async function runSearch(
  entities: Entity[],
  query: string,
  limit = 12
): Promise<SearchHit[]> {
  if (!query.trim()) return [];
  const lex = await runLexicalSearch(entities, query, limit);
  return lex;
}

async function runLexicalSearch(
  entities: Entity[],
  query: string,
  limit: number
): Promise<SearchHit[]> {
  const db = await getDb(entities);
  const result = await search(db, {
    term: query,
    properties: ["name", "aliases", "short"],
    boost: { name: 3, aliases: 2, short: 1 },
    limit,
    tolerance: 1
  });
  const hits = result.hits as unknown as Array<{ document: SearchDoc; score: number }>;
  return hits.map((h) => ({ ...h.document, score: h.score, source: "lex" as const }));
}

function cosineFromNormalized(a: Float32Array, b: Float32Array, offset: number, dim: number): number {
  // Both query and stored vectors are L2-normalized (transformers `normalize: true`),
  // so cosine similarity reduces to a dot product.
  let s = 0;
  for (let i = 0; i < dim; i++) {
    s += a[i]! * b[offset + i]!;
  }
  return s;
}

async function runSemanticSearch(
  query: string,
  topK: number,
  index: SemanticIndex
): Promise<Array<{ id: string; score: number }>> {
  const out = await index.extractor(query, { pooling: "mean", normalize: true });
  const q = out.data;
  const { vectors, meta } = index;
  const dim = meta.dim;
  const count = meta.count;

  // Maintain a small top-K via a simple bounded scan (260 × 384 = ~100k mults; trivial).
  const scores = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    scores[i] = cosineFromNormalized(q, vectors, i * dim, dim);
  }

  const idx = new Array(count);
  for (let i = 0; i < count; i++) idx[i] = i;
  idx.sort((a, b) => scores[b]! - scores[a]!);

  const k = Math.min(topK, count);
  const out2: Array<{ id: string; score: number }> = [];
  for (let r = 0; r < k; r++) {
    const i = idx[r]!;
    out2.push({ id: meta.ids[i]!, score: scores[i]! });
  }
  return out2;
}

/**
 * Hybrid lexical + semantic search.
 *
 * Scoring (weighted-sum of normalized scores):
 *   score(e) = W_LEX * lex_norm(e) + W_SEM * sem_norm(e)
 * where each side is min-max normalized to [0,1] over its own candidate set
 * (entities not present in a side contribute 0). With W_LEX = W_SEM = 0.5,
 * a match that's strong in either side scores at least 0.5; matches strong
 * in both rise to ~1.0. Chosen over RRF because per-entity score values are
 * useful for the UI's `lex`/`sem`/`hybrid` chip distinction.
 */
export async function runHybridSearch(
  entities: Entity[],
  query: string,
  limit = 14
): Promise<SearchHit[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  // If the semantic index isn't ready yet (or fails to load), fall back to lexical-only.
  let semIndex: SemanticIndex | null = null;
  try {
    semIndex = await loadSemanticIndex();
  } catch {
    semIndex = null;
  }

  const [lex, sem] = await Promise.all([
    runLexicalSearch(entities, trimmed, Math.max(limit * 2, 24)),
    semIndex
      ? runSemanticSearch(trimmed, SEMANTIC_TOP_K, semIndex)
      : Promise.resolve([] as Array<{ id: string; score: number }>)
  ]);

  // Min-max normalize each side over its own candidates. Empty side → all zeros.
  const lexN = normalize(lex.map((h) => h.score));
  const semN = normalize(sem.map((h) => h.score));

  const lexScore = new Map<string, number>();
  lex.forEach((h, i) => lexScore.set(h.id, lexN[i]!));
  const semScore = new Map<string, number>();
  sem.forEach((h, i) => semScore.set(h.id, semN[i]!));

  const byId = new Map<string, Entity>();
  for (const e of entities) byId.set(e.id, e);

  const docFor = (id: string): SearchDoc | null => {
    const e = byId.get(id);
    if (!e) return null;
    return {
      id: e.id,
      type: e.type,
      name: e.name,
      aliases: e.aliases.join(" "),
      short: e.short,
      canonicity: e.canonicity
    };
  };

  const ids = new Set<string>();
  for (const h of lex) ids.add(h.id);
  for (const s of sem) ids.add(s.id);

  const merged: SearchHit[] = [];
  for (const id of ids) {
    const doc = docFor(id);
    if (!doc) continue;
    const lScore = lexScore.get(id) ?? 0;
    const sScore = semScore.get(id) ?? 0;
    const inLex = lexScore.has(id);
    const inSem = semScore.has(id);
    const source: SearchSource = inLex && inSem ? "hybrid" : inSem ? "sem" : "lex";
    const score = HYBRID_W_LEX * lScore + HYBRID_W_SEM * sScore;
    merged.push({ ...doc, score, source });
  }

  merged.sort((a, b) => b.score - a.score);
  return merged.slice(0, limit);
}

function normalize(values: number[]): number[] {
  if (values.length === 0) return [];
  let lo = Infinity;
  let hi = -Infinity;
  for (const v of values) {
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  const span = hi - lo;
  if (span <= 0) return values.map(() => 1);
  return values.map((v) => (v - lo) / span);
}
