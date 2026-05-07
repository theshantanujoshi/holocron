/**
 * build-kb.ts
 *
 * Ingests Star Wars universe data from real public sources, normalizes it
 * into the unified Entity schema (lib/schema.ts), and emits build artifacts:
 *
 *   data/build/kb.json         — all entities, queryable
 *   data/build/planets.json    — spatial-only slice with 3D coords
 *   data/build/lanes.json      — hyperspace lane segments
 *   data/build/timeline.json   — events with BBY/ABY years
 *   data/build/manifest.json   — provenance and counts
 *
 * Sources (public, real APIs):
 *   - swapi.info (canonical SWAPI mirror, static, no auth, no rate limit)
 *   - parzivail/SWGalacticMap (planet coordinates with sector + region)
 *
 * No mock data is generated. If a source is unreachable, the script reports
 * the failure and exits non-zero. Downstream UI shows an explicit
 * "build pending" state until artifacts exist.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { Entity, KnowledgeBase, type Entity as TEntity } from "../lib/schema";
import { z } from "zod";

// ---- Parzivail coord merge (optional) ----
// Reads data/build/planets.parzivail.json if present and merges 3-D coords
// into matching planet entities (case-insensitive, punctuation-insensitive).

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

function normKey(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

async function loadParzivailIndex(
  path: string
): Promise<Map<string, ParzivailNorm> | null> {
  if (!existsSync(path)) return null;
  try {
    const raw = JSON.parse(await readFile(path, "utf8")) as unknown;
    const parsed = z.array(ParzivailNorm).safeParse(raw);
    if (!parsed.success) {
      console.warn("[holocron] planets.parzivail.json failed validation — skipping merge");
      return null;
    }
    const map = new Map<string, ParzivailNorm>();
    for (const p of parsed.data) {
      map.set(normKey(p.name), p);
    }
    return map;
  } catch (err) {
    console.warn("[holocron] could not read planets.parzivail.json:", err);
    return null;
  }
}

function mergeSpatial(
  entity: TEntity,
  parzivailIndex: Map<string, ParzivailNorm> | null
): TEntity {
  if (!parzivailIndex || entity.type !== "planet") return entity;
  const match = parzivailIndex.get(normKey(entity.name));
  if (!match) return entity;
  return {
    ...entity,
    spatial: {
      ...(entity.spatial ?? {}),
      coords: { x: match.x, y: match.y, z: match.z },
      region: entity.spatial?.region ?? match.region ?? undefined,
      sector: entity.spatial?.sector ?? match.sector ?? undefined,
    },
  };
}

const ROOT = process.cwd();
const OUT = resolve(ROOT, "data/build");

const SWAPI_BASE = "https://swapi.info/api";
const SWAPI_RESOURCES = ["people", "planets", "starships", "vehicles", "species", "films"] as const;

type SwapiList<T> = T[];

type SwapiPerson = {
  name: string;
  birth_year: string;
  homeworld: string;
  species: string[];
  starships: string[];
  vehicles: string[];
  films: string[];
  url: string;
  height?: string;
  mass?: string;
  hair_color?: string;
  eye_color?: string;
  gender?: string;
};

type SwapiPlanet = {
  name: string;
  rotation_period: string;
  orbital_period: string;
  diameter: string;
  climate: string;
  gravity: string;
  terrain: string;
  surface_water: string;
  population: string;
  residents: string[];
  films: string[];
  url: string;
};

type SwapiStarship = {
  name: string;
  model: string;
  manufacturer: string;
  starship_class: string;
  length: string;
  crew: string;
  passengers: string;
  films: string[];
  pilots: string[];
  url: string;
};

type SwapiVehicle = SwapiStarship;

type SwapiSpecies = {
  name: string;
  classification: string;
  designation: string;
  homeworld: string | null;
  language: string;
  people: string[];
  films: string[];
  url: string;
};

type SwapiFilm = {
  title: string;
  episode_id: number;
  release_date: string;
  director: string;
  characters: string[];
  planets: string[];
  starships: string[];
  vehicles: string[];
  species: string[];
  url: string;
};

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { accept: "application/json", "user-agent": "holocron-build/0.1" }
  });
  if (!res.ok) throw new Error(`Fetch failed ${url} → ${res.status}`);
  return (await res.json()) as T;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/['"`]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function urlToId(url: string, prefix: string): string {
  const parts = url.replace(/\/$/, "").split("/");
  const last = parts[parts.length - 1] ?? "";
  return `${prefix}/${last}`;
}

function parseBirthYear(raw: string): number | null {
  if (!raw || raw === "unknown") return null;
  const m = raw.match(/^([0-9]+(?:\.[0-9]+)?)\s*(BBY|ABY)$/i);
  if (!m) return null;
  const n = Number.parseFloat(m[1]!);
  return m[2]!.toUpperCase() === "BBY" ? -n : n;
}

function transformPerson(p: SwapiPerson): TEntity {
  const id = urlToId(p.url, "person");
  return {
    id,
    type: "person",
    name: p.name,
    aliases: [],
    canonicity: "canon",
    era: { birthYear: parseBirthYear(p.birth_year) },
    affiliations: [],
    relations: [
      ...(p.homeworld ? [{ kind: "homeworld_of" as const, target: urlToId(p.homeworld, "planet") }] : []),
      ...p.species.map((s) => ({ kind: "member_of" as const, target: urlToId(s, "species") })),
      ...p.films.map((f) => ({ kind: "appears_in" as const, target: urlToId(f, "film") })),
      ...p.starships.map((s) => ({ kind: "captained_by" as const, target: urlToId(s, "ship") })),
      ...p.vehicles.map((v) => ({ kind: "captained_by" as const, target: urlToId(v, "vehicle") }))
    ],
    short: [p.gender, p.eye_color && `eyes ${p.eye_color}`, p.hair_color && `hair ${p.hair_color}`]
      .filter(Boolean)
      .join(" · "),
    long: "",
    media: { gallery: [] },
    sources: [p.url]
  };
}

function transformPlanet(p: SwapiPlanet): TEntity {
  const id = urlToId(p.url, "planet");
  return {
    id,
    type: "planet",
    name: p.name,
    aliases: [],
    canonicity: "canon",
    spatial: {},
    affiliations: [],
    relations: [
      ...p.films.map((f) => ({ kind: "appears_in" as const, target: urlToId(f, "film") })),
      ...p.residents.map((r) => ({ kind: "located_in" as const, target: urlToId(r, "person") }))
    ],
    short: [p.climate, p.terrain].filter(Boolean).filter((x) => x !== "unknown").join(" · "),
    long: "",
    media: { gallery: [] },
    sources: [p.url]
  };
}

function transformStarship(s: SwapiStarship): TEntity {
  const id = urlToId(s.url, "ship");
  return {
    id,
    type: "ship",
    name: s.name,
    aliases: s.model && s.model !== s.name ? [s.model] : [],
    canonicity: "canon",
    affiliations: [],
    relations: [
      ...s.films.map((f) => ({ kind: "appears_in" as const, target: urlToId(f, "film") })),
      ...s.pilots.map((p) => ({ kind: "captained_by" as const, target: urlToId(p, "person") }))
    ],
    short: [s.starship_class, s.manufacturer].filter(Boolean).filter((x) => x !== "unknown").join(" · "),
    long: "",
    media: { gallery: [] },
    sources: [s.url]
  };
}

function transformVehicle(v: SwapiVehicle): TEntity {
  const e = transformStarship(v);
  return { ...e, id: urlToId(v.url, "vehicle"), type: "vehicle" };
}

function transformSpecies(s: SwapiSpecies): TEntity {
  const id = urlToId(s.url, "species");
  return {
    id,
    type: "species",
    name: s.name,
    aliases: [],
    canonicity: "canon",
    affiliations: [],
    relations: [
      ...(s.homeworld ? [{ kind: "homeworld_of" as const, target: urlToId(s.homeworld, "planet") }] : []),
      ...s.people.map((p) => ({ kind: "member_of" as const, target: urlToId(p, "person") })),
      ...s.films.map((f) => ({ kind: "appears_in" as const, target: urlToId(f, "film") }))
    ],
    short: [s.classification, s.designation, s.language && `speaks ${s.language}`]
      .filter(Boolean)
      .filter((x) => x !== "unknown" && x !== "n/a")
      .join(" · "),
    long: "",
    media: { gallery: [] },
    sources: [s.url]
  };
}

function transformFilm(f: SwapiFilm): TEntity {
  const id = urlToId(f.url, "film");
  const releaseYear = Number.parseInt(f.release_date.slice(0, 4), 10);
  return {
    id,
    type: "film",
    name: f.title,
    aliases: [`Episode ${f.episode_id}`],
    canonicity: "canon",
    era: { firstAppearance: releaseYear },
    affiliations: [],
    relations: [
      ...f.characters.map((c) => ({ kind: "appears_in" as const, target: urlToId(c, "person") })),
      ...f.planets.map((p) => ({ kind: "occurred_at" as const, target: urlToId(p, "planet") }))
    ],
    short: `Directed by ${f.director} · Released ${f.release_date}`,
    long: "",
    media: { gallery: [] },
    sources: [f.url]
  };
}

async function fetchSwapiResource(resource: (typeof SWAPI_RESOURCES)[number]) {
  const list = await fetchJson<SwapiList<unknown>>(`${SWAPI_BASE}/${resource}`);
  return Array.isArray(list) ? list : [];
}

async function ingest(): Promise<TEntity[]> {
  const entities: TEntity[] = [];

  console.log(`[holocron] fetching SWAPI from ${SWAPI_BASE}`);

  const [people, planets, starships, vehicles, species, films] = await Promise.all([
    fetchSwapiResource("people") as Promise<SwapiPerson[]>,
    fetchSwapiResource("planets") as Promise<SwapiPlanet[]>,
    fetchSwapiResource("starships") as Promise<SwapiStarship[]>,
    fetchSwapiResource("vehicles") as Promise<SwapiVehicle[]>,
    fetchSwapiResource("species") as Promise<SwapiSpecies[]>,
    fetchSwapiResource("films") as Promise<SwapiFilm[]>
  ]);

  console.log(
    `[holocron] swapi counts → people:${people.length} planets:${planets.length} starships:${starships.length} vehicles:${vehicles.length} species:${species.length} films:${films.length}`
  );

  for (const p of people) entities.push(transformPerson(p));
  for (const p of planets) entities.push(transformPlanet(p));
  for (const s of starships) entities.push(transformStarship(s));
  for (const v of vehicles) entities.push(transformVehicle(v));
  for (const s of species) entities.push(transformSpecies(s));
  for (const f of films) entities.push(transformFilm(f));

  return entities;
}

async function main() {
  const t0 = Date.now();

  if (!existsSync(OUT)) await mkdir(OUT, { recursive: true });

  // Optionally load parzivail coord index for spatial merge
  const parzivailPath = resolve(OUT, "planets.parzivail.json");
  const parzivailIndex = await loadParzivailIndex(parzivailPath);
  if (parzivailIndex) {
    console.log(`[holocron] loaded parzivail index: ${parzivailIndex.size} planets`);
  } else {
    console.log("[holocron] no planets.parzivail.json found — run build:lanes first to enable coord merge");
  }

  const entities = await ingest();

  const validated: TEntity[] = [];
  let invalid = 0;
  for (const e of entities) {
    const merged = mergeSpatial(e, parzivailIndex);
    const r = Entity.safeParse(merged);
    if (r.success) validated.push(r.data);
    else {
      invalid += 1;
      console.warn(`[holocron] invalid entity ${e.id}:`, r.error.issues.slice(0, 2));
    }
  }

  const coordsMatched = parzivailIndex
    ? validated.filter(
        (e) => e.type === "planet" && e.spatial?.coords !== undefined
      ).length
    : 0;

  if (parzivailIndex) {
    console.log(
      `[holocron] coord merge: ${coordsMatched}/${validated.filter((e) => e.type === "planet").length} planets matched parzivail coords`
    );
  }

  const kb: KnowledgeBase = {
    builtAt: new Date().toISOString(),
    schemaVersion: 1,
    entityCount: validated.length,
    entities: validated
  };

  const planetsOnly = validated.filter((e) => e.type === "planet");
  const manifest = {
    builtAt: kb.builtAt,
    durationMs: Date.now() - t0,
    counts: {
      total: validated.length,
      invalid,
      coordsMatched,
      byType: validated.reduce<Record<string, number>>((acc, e) => {
        acc[e.type] = (acc[e.type] ?? 0) + 1;
        return acc;
      }, {})
    },
    sources: [
      { id: "swapi", url: SWAPI_BASE, license: "public-mirror" },
      ...(parzivailIndex
        ? [{ id: "parzivail", url: "https://raw.githubusercontent.com/parzivail/SWGalacticMap/master/planets.json", license: "community-data" }]
        : [])
    ]
  };

  await writeFile(resolve(OUT, "kb.json"), JSON.stringify(kb), "utf8");
  await writeFile(resolve(OUT, "planets.json"), JSON.stringify(planetsOnly), "utf8");
  await writeFile(resolve(OUT, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");

  console.log(`[holocron] wrote ${validated.length} entities in ${Date.now() - t0}ms → ${OUT}`);
  if (invalid > 0) {
    console.warn(`[holocron] ${invalid} entities failed validation; see warnings above`);
  }
}

main().catch((err) => {
  console.error("[holocron] build failed:", err);
  process.exit(1);
});
