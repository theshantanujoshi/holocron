/**
 * build-wars.ts
 *
 * Validates hand-curated wars and battles from lib/data/wars-battles.ts
 * against the War and Battle Zod schemas, cross-validates all id references,
 * and emits:
 *
 *   data/build/wars.json     — { builtAt, wars: War[], battles: Battle[] }
 *   data/build/manifest.json — updated with wars + battles counts
 *
 * Cross-validation rules:
 *   - Every war.keyBattleIds entry must reference a battle id in the dataset.
 *   - Every battle.warId (non-null) must reference a war id in the dataset.
 *
 * Sources:
 *   - Wookieepedia (https://starwars.fandom.com/wiki/) — canonical lore
 *   - See lib/data/wars-battles.ts for per-record source URLs.
 *
 * Usage:  npx tsx scripts/build-wars.ts
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { War, Battle, WarsFile } from "../lib/schema";
import { WARS, BATTLES } from "../lib/data/wars-battles";

const ROOT = process.cwd();
const OUT = resolve(ROOT, "data/build");
const WARS_PATH = resolve(OUT, "wars.json");
const MANIFEST_PATH = resolve(OUT, "manifest.json");

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

function validateWars(raw: unknown[]): War[] {
  const results: War[] = [];
  let invalid = 0;
  for (const item of raw) {
    const r = War.safeParse(item);
    if (r.success) {
      results.push(r.data);
    } else {
      invalid++;
      // We know these come from typed data, so log details
      const id = (item as { id?: string }).id ?? "(unknown)";
      console.error(`[wars] War validation failed for ${id}:`, r.error.issues.slice(0, 3));
    }
  }
  if (invalid > 0) {
    console.error(`[wars] ${invalid} wars failed schema validation — aborting`);
    process.exit(1);
  }
  return results;
}

function validateBattles(raw: unknown[]): Battle[] {
  const results: Battle[] = [];
  let invalid = 0;
  for (const item of raw) {
    const r = Battle.safeParse(item);
    if (r.success) {
      results.push(r.data);
    } else {
      invalid++;
      const id = (item as { id?: string }).id ?? "(unknown)";
      console.error(`[wars] Battle validation failed for ${id}:`, r.error.issues.slice(0, 3));
    }
  }
  if (invalid > 0) {
    console.error(`[wars] ${invalid} battles failed schema validation — aborting`);
    process.exit(1);
  }
  return results;
}

function crossValidate(wars: War[], battles: Battle[]): void {
  const warIds = new Set(wars.map((w) => w.id));
  const battleIds = new Set(battles.map((b) => b.id));
  let errors = 0;

  // Check war.keyBattleIds → battle ids
  for (const war of wars) {
    for (const battleId of war.keyBattleIds) {
      if (!battleIds.has(battleId)) {
        console.error(
          `[wars] Cross-validate error: war "${war.id}" references unknown battle "${battleId}"`
        );
        errors++;
      }
    }
  }

  // Check battle.warId → war ids
  for (const battle of battles) {
    if (battle.warId !== null && !warIds.has(battle.warId)) {
      console.error(
        `[wars] Cross-validate error: battle "${battle.id}" references unknown war "${battle.warId}"`
      );
      errors++;
    }
  }

  if (errors > 0) {
    console.error(`[wars] ${errors} cross-validation error(s) — aborting`);
    process.exit(1);
  }
  console.log(`[wars] Cross-validation passed: all ${wars.length} wars and ${battles.length} battles reference valid ids`);
}

// ---------------------------------------------------------------------------
// Manifest update
// ---------------------------------------------------------------------------

async function updateManifest(wars: number, battles: number): Promise<void> {
  if (!existsSync(MANIFEST_PATH)) {
    console.warn("[wars] manifest.json not found — skipping manifest update");
    return;
  }
  const raw = await readFile(MANIFEST_PATH, "utf8");
  const manifest: Record<string, unknown> = JSON.parse(raw) as Record<string, unknown>;

  // Merge wars/battles counts into the manifest counts object
  const counts = (manifest["counts"] ?? {}) as Record<string, unknown>;
  counts["wars"] = wars;
  counts["battles"] = battles;
  manifest["counts"] = counts;
  manifest["warsBuiltAt"] = new Date().toISOString();

  await writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2), "utf8");
  console.log(`[wars] manifest.json updated — wars: ${wars}, battles: ${battles}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const t0 = Date.now();

  if (!existsSync(OUT)) await mkdir(OUT, { recursive: true });

  console.log(`[wars] validating ${WARS.length} wars and ${BATTLES.length} battles…`);

  const wars = validateWars(WARS as unknown[]);
  const battles = validateBattles(BATTLES as unknown[]);

  crossValidate(wars, battles);

  const output = WarsFile.parse({
    builtAt: new Date().toISOString(),
    wars,
    battles
  });

  await writeFile(WARS_PATH, JSON.stringify(output, null, 2), "utf8");
  const sizeBytes = Buffer.byteLength(JSON.stringify(output));
  console.log(
    `[wars] wrote ${WARS_PATH} (${(sizeBytes / 1024).toFixed(1)} KB)`
  );

  await updateManifest(wars.length, battles.length);

  console.log(
    `[wars] done in ${Date.now() - t0}ms — ${wars.length} wars, ${battles.length} battles`
  );
}

main().catch((err: unknown) => {
  console.error("[wars] build failed:", err);
  process.exit(1);
});
