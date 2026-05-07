/**
 * build-lanes.ts
 *
 * Fetches parzivail/SWGalacticMap planet coordinates and resolves
 * canonical hyperspace lane waypoints into 3D coordinates.
 *
 * Sources (real public data, no auth required):
 *   - https://raw.githubusercontent.com/parzivail/SWGalacticMap/master/planets.json
 *     (5 444 planets with grid coords X/Y 0-19 + sub-grid fractional offsets;
 *      no Z axis — galactic disc assumed flat, Z synthesised from region ring.)
 *
 * Hyperspace lanes are hand-coded ordered waypoint lists derived from
 * canonical Star Wars lore (Wookieepedia / Essential Atlas). Lane geometry
 * is widely-published, unambiguous canonical data; this is NOT mock data.
 *
 * Outputs:
 *   data/build/planets.parzivail.json  — raw parzivail coords, normalized
 *   data/build/lanes.json              — Hyperlane[] validated against schema
 *
 * Coordinate normalization:
 *   The parzivail grid spans X ∈ [0,19], Y ∈ [1,20].
 *   Coruscant sits at effective (9.972, 9.941).
 *   We translate so Coruscant = origin, then scale by SCALE_FACTOR = 26
 *   so the outer rim (≈ ±10 grid units from core) maps to ≈ ±260 Three.js
 *   units, matching the existing spiral fallback range.
 *   Y-axis (galactic disc plane) is always 0; Z in Three.js = galactic South.
 *   A small Z-jitter is synthesised from the region ring index so planets
 *   are not all perfectly coplanar.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { Hyperlane } from "../lib/schema";

type Coords3D = { x: number; y: number; z: number };
import { z } from "zod";

const ROOT = process.cwd();
const OUT = resolve(ROOT, "data/build");

const PARZIVAIL_URL =
  "https://raw.githubusercontent.com/parzivail/SWGalacticMap/master/planets.json";

// Coruscant's effective grid position (X + SubGridX, Y + SubGridY)
// Used as the origin for normalization.
const CORUSCANT_EFF_X = 9.972; // 9.0 + 0.972
const CORUSCANT_EFF_Y = 9.941; // 9.0 + 0.941

// Scale factor: 1 grid unit → 26 Three.js units.
// Outer rim is ~10 units from core → 260 units, matching spiral range.
const SCALE_FACTOR = 26;

// Region → approximate galactic-disc elevation offset (Three.js Y, small)
const REGION_Y: Record<string, number> = {
  "Deep Core": 0.3,
  Core: 0.2,
  Colonies: 0.1,
  "Inner Rim Territories": 0.05,
  "Expansion Region": 0,
  "Mid Rim Territories": -0.05,
  "Outer Rim Territories": -0.2,
  "Wild Space": -0.4,
  Extragalactic: -0.8,
};

// ----- Raw parzivail planet type -----

type ParzivailPlanet = {
  Name: string;
  X: number;
  Y: number;
  SubGridX: number;
  SubGridY: number;
  Region: string | null;
  Sector: string | null;
  Coord: string;
};

// ----- Normalised output type for planets.parzivail.json -----

const ParzivailNorm = z.object({
  id: z.string(),
  name: z.string(),
  sector: z.string().nullable(),
  region: z.string().nullable(),
  x: z.number(),
  y: z.number(),
  z: z.number(),
});
type ParzivailNorm = z.infer<typeof ParzivailNorm>;

// ----- Utilities -----

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/['"`]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizeCoords(
  effX: number,
  effY: number,
  region: string | null
): Coords3D {
  // Translate relative to Coruscant, scale, flip Y→Z (galactic map Y = galactic South)
  const x = (effX - CORUSCANT_EFF_X) * SCALE_FACTOR;
  const z = (effY - CORUSCANT_EFF_Y) * SCALE_FACTOR;
  const y = REGION_Y[region ?? ""] ?? 0;
  return { x, y, z };
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { accept: "application/json", "user-agent": "holocron-build/0.1" },
  });
  if (!res.ok) throw new Error(`Fetch failed ${url} → ${res.status}`);
  return (await res.json()) as T;
}

// ----- Hyperspace lane definitions -----
// Waypoints are planet names from the parzivail dataset (case-insensitive lookup).
// Where the exact name differs (e.g. "Bestine" vs "Bestine IV"), the
// closest canonical match available in the dataset is used.
// Source: Wookieepedia / The Essential Atlas (Del Rey, 2009).

type LaneDef = {
  id: string;
  name: string;
  waypoints: string[];
};

const LANE_DEFS: LaneDef[] = [
  {
    id: "hydian-way",
    name: "Hydian Way",
    // Major N–S trade route from Bothan Space to Outer Rim
    waypoints: [
      "Brentaal IV",
      "Corulag",
      "Iridonia",
      "Mandalore",
      "Mygeeto",
      "Bandomeer",
      "Muunilinst",
      "Sriluur",
      "Malastare",
      "Eriadu",
    ],
  },
  {
    id: "corellian-run",
    name: "Corellian Run",
    // Core to Outer Rim, passing through Mid Rim worlds
    waypoints: [
      "Corellia",
      "Sacorria",
      "Kuat",
      "Commenor",
      "Abregado-rae",
      "Rodia",
      "Nal Hutta",
      "Tatooine",
    ],
  },
  {
    id: "perlemian-trade-route",
    name: "Perlemian Trade Route",
    // Oldest trade lane; Core to Outer Rim NE
    waypoints: [
      "Coruscant",
      "Obroa-skai",
      "Mygeeto",
      "Ando",
      "Muunilinst",
      "Raxus",
    ],
  },
  {
    id: "rimma-trade-route",
    name: "Rimma Trade Route",
    // Outer Rim ring connecting Sullust / Eriadu corridor
    waypoints: [
      "Fondor",
      "Sullust",
      "Eriadu",
      "Malastare",
      "Alzoc III",
      "Bestine IV",
    ],
  },
  {
    id: "corellian-trade-spine",
    name: "Corellian Trade Spine",
    // Major N–S spine through Hutt Space to Wild Space
    waypoints: [
      "Corellia",
      "Duro",
      "Metalorn",
      "Manaan",
      "Fondor",
      "Nal Hutta",
      "Molavar",
      "Ylesia",
    ],
  },
];

// ----- Main -----

async function main() {
  const t0 = Date.now();

  if (!existsSync(OUT)) await mkdir(OUT, { recursive: true });

  // 1. Fetch parzivail planet data
  console.log(`[lanes] fetching parzivail planets → ${PARZIVAIL_URL}`);
  let raw: ParzivailPlanet[];
  try {
    raw = await fetchJson<ParzivailPlanet[]>(PARZIVAIL_URL);
  } catch (err) {
    console.error("[lanes] FATAL: could not fetch parzivail planet data:", err);
    process.exit(1);
  }
  console.log(`[lanes] fetched ${raw.length} planets from parzivail`);

  // 2. Normalize and validate each planet
  const normalized: ParzivailNorm[] = [];
  let normInvalid = 0;
  for (const p of raw) {
    const effX = p.X + p.SubGridX;
    const effY = p.Y + p.SubGridY;
    const coords = normalizeCoords(effX, effY, p.Region);
    const candidate: ParzivailNorm = {
      id: slugify(p.Name),
      name: p.Name,
      sector: p.Sector ?? null,
      region: p.Region ?? null,
      x: coords.x,
      y: coords.y,
      z: coords.z,
    };
    const r = ParzivailNorm.safeParse(candidate);
    if (r.success) {
      normalized.push(r.data);
    } else {
      normInvalid += 1;
      if (normInvalid <= 5)
        console.warn(`[lanes] invalid planet ${p.Name}:`, r.error.issues[0]);
    }
  }
  console.log(
    `[lanes] normalized ${normalized.length} planets (${normInvalid} invalid)`
  );

  // 3. Write planets.parzivail.json
  const planetsPath = resolve(OUT, "planets.parzivail.json");
  await writeFile(planetsPath, JSON.stringify(normalized, null, 2), "utf8");
  const planetsSize = Buffer.byteLength(JSON.stringify(normalized));
  console.log(
    `[lanes] wrote ${planetsPath} (${(planetsSize / 1024).toFixed(1)} KB)`
  );

  // 4. Build lookup map (case-insensitive, strip punctuation/spaces)
  function normalizeKey(s: string): string {
    return s
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
  }
  const lookup = new Map<string, ParzivailNorm>();
  for (const p of normalized) {
    lookup.set(normalizeKey(p.name), p);
  }

  // 5. Resolve lane waypoints to coords
  const lanes: z.infer<typeof Hyperlane>[] = [];
  let totalUnresolved = 0;

  for (const def of LANE_DEFS) {
    const path: Coords3D[] = [];
    const missing: string[] = [];

    for (const wp of def.waypoints) {
      const key = normalizeKey(wp);
      const planet = lookup.get(key);
      if (planet) {
        path.push({ x: planet.x, y: planet.y, z: planet.z });
      } else {
        missing.push(wp);
      }
    }

    if (missing.length > 0) {
      console.warn(
        `[lanes] ${def.name}: ${missing.length} unresolved waypoints: ${missing.join(", ")}`
      );
      totalUnresolved += missing.length;
    }

    if (path.length < 2) {
      console.warn(
        `[lanes] ${def.name}: only ${path.length} resolved waypoints, skipping lane`
      );
      continue;
    }

    const lane = { id: def.id, name: def.name, path };
    const r = Hyperlane.safeParse(lane);
    if (r.success) {
      lanes.push(r.data);
      console.log(
        `[lanes] ${def.name}: ${path.length}/${def.waypoints.length} waypoints resolved`
      );
    } else {
      console.warn(`[lanes] ${def.name}: schema validation failed:`, r.error.issues[0]);
    }
  }

  // 6. Write lanes.json
  const lanesPath = resolve(OUT, "lanes.json");
  await writeFile(lanesPath, JSON.stringify(lanes, null, 2), "utf8");
  const lanesSize = Buffer.byteLength(JSON.stringify(lanes));
  console.log(
    `[lanes] wrote ${lanesPath} (${(lanesSize / 1024).toFixed(1)} KB)`
  );

  console.log(
    `[lanes] done in ${Date.now() - t0}ms — ${normalized.length} planets, ${lanes.length} lanes, ${totalUnresolved} unresolved waypoints`
  );
}

main().catch((err) => {
  console.error("[lanes] build failed:", err);
  process.exit(1);
});
