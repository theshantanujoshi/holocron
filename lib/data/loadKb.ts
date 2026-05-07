import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { KnowledgeBase, type Entity, type KnowledgeBase as TKb } from "@/lib/schema";

const KB_PATH = resolve(process.cwd(), "data/build/kb.json");

let cached: TKb | null = null;

export async function loadKb(): Promise<TKb | null> {
  if (cached) return cached;
  if (!existsSync(KB_PATH)) return null;
  const raw = await readFile(KB_PATH, "utf8");
  const parsed = JSON.parse(raw);
  const validated = KnowledgeBase.safeParse(parsed);
  if (!validated.success) {
    console.error("[holocron] kb.json failed schema validation", validated.error.issues.slice(0, 3));
    return null;
  }
  cached = validated.data;
  return cached;
}

export function planetsFrom(kb: TKb): Entity[] {
  return kb.entities.filter((e) => e.type === "planet");
}

export function findEntity(kb: TKb, id: string): Entity | undefined {
  return kb.entities.find((e) => e.id === id);
}
