/**
 * Ship voyage computation.
 *
 * A "voyage" is the chronological sequence of planets a ship has visited
 * across all film appearances, ordered by canonical BBY/ABY year of each
 * film and connected by straight-line interpolation through the galaxy
 * canvas. It's distinct from the hyperspace-route system (see
 * lib/data/lane-graph.ts), which uses canon hyperlanes; voyages don't
 * care about lanes — they trace a ship's narrative trail through space.
 *
 * Two safety rails:
 *   - A planet referenced by a film but missing from the placed-planet
 *     list is silently skipped (rather than crashing or fabricating
 *     coordinates).
 *   - A voyage with fewer than two valid waypoints returns `null`. There
 *     is no meaningful "path" through a single point.
 *
 * Memoization: voyages are cached by `shipId` in a module-level Map so
 * picking the same ship twice in a session is O(1). The cache is
 * invalidated only when the module reloads — this matches the lane-graph
 * cache discipline elsewhere in the project.
 */

import type { Entity } from "@/lib/schema";
import type { PlacedPlanet } from "@/lib/data/positions";
import { PARSEC_PER_UNIT } from "@/lib/data/lane-graph";

export type VoyageWaypoint = {
  filmId: string;
  filmName: string;
  /** Canonical BBY/ABY year (negative = BBY, 0 = Battle of Yavin, positive = ABY). */
  filmYear: number;
  planetId: string;
  planetName: string;
  position: [number, number, number];
};

export type Voyage = {
  shipId: string;
  shipName: string;
  /** Chronologically sorted by `filmYear` (then film order within the year). */
  waypoints: VoyageWaypoint[];
  /** Sum of consecutive Euclidean waypoint distances, in parsecs. */
  totalParsecs: number;
};

/**
 * Canonical BBY/ABY year per Star Wars film.
 *
 * Sourced from the Wookieepedia "Star Wars film" timeline and the
 * individual film articles. The Force Awakens and The Last Jedi share a
 * year (34 ABY) — Wookieepedia dates them within months of each other —
 * so we use FILM_ORDER as a stable secondary sort key.
 *
 * Source: https://starwars.fandom.com/wiki/Timeline_of_galactic_history
 *         https://starwars.fandom.com/wiki/Star_Wars:_Episode_VII_The_Force_Awakens
 *         https://starwars.fandom.com/wiki/Star_Wars:_Episode_VIII_The_Last_Jedi
 */
const FILM_YEARS: Record<string, number> = {
  "film/4": -32, // The Phantom Menace
  "film/5": -22, // Attack of the Clones
  "film/6": -19, // Revenge of the Sith
  "film/1": 0,   // A New Hope
  "film/2": 3,   // The Empire Strikes Back
  "film/3": 4,   // Return of the Jedi
  "film/7": 34,  // The Force Awakens
  "film/8": 34,  // The Last Jedi
  "film/9": 35   // The Rise of Skywalker
};

/**
 * Tie-break for films sharing a `filmYear`. Lower number = earlier in
 * the saga's internal chronology (Episode I < Episode II < ... < Episode IX).
 */
const FILM_ORDER: Record<string, number> = {
  "film/4": 1,
  "film/5": 2,
  "film/6": 3,
  "film/1": 4,
  "film/2": 5,
  "film/3": 6,
  "film/7": 7,
  "film/8": 8,
  "film/9": 9
};

const voyageCache = new Map<string, Voyage | null>();

export function computeVoyage(
  ship: Entity,
  entities: Entity[],
  planets: PlacedPlanet[]
): Voyage | null {
  if (voyageCache.has(ship.id)) {
    return voyageCache.get(ship.id) ?? null;
  }

  // Step 1: collect the films this ship appears in.
  const filmIds: string[] = [];
  for (const r of ship.relations) {
    if (r.kind === "appears_in") filmIds.push(r.target);
  }
  if (filmIds.length === 0) {
    voyageCache.set(ship.id, null);
    return null;
  }

  // Step 2: build a fast lookup for entities and placed planets.
  const entityById = new Map<string, Entity>();
  for (const e of entities) entityById.set(e.id, e);
  const planetById = new Map<string, PlacedPlanet>();
  for (const p of planets) planetById.set(p.id, p);

  // Step 3: for each film, expand to its `occurred_at` planet relations.
  // We dedupe by (filmId, planetId) so a film that lists the same planet
  // twice doesn't produce two stops; we DO NOT dedupe across films,
  // since visiting Tatooine in ANH and again in ROTJ is a real two-stop
  // sequence the voyage should reflect.
  const seen = new Set<string>();
  const waypoints: VoyageWaypoint[] = [];

  for (const filmId of filmIds) {
    const film = entityById.get(filmId);
    if (!film) continue;
    if (FILM_YEARS[filmId] === undefined) continue; // unknown film, skip

    for (const r of film.relations) {
      if (r.kind !== "occurred_at") continue;
      const key = `${filmId}|${r.target}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const planet = planetById.get(r.target);
      if (!planet) continue; // planet not placed — silently skip

      const filmYear = FILM_YEARS[filmId];
      if (filmYear === undefined) continue;

      waypoints.push({
        filmId,
        filmName: film.name,
        filmYear,
        planetId: planet.id,
        planetName: planet.name,
        position: planet.position
      });
    }
  }

  if (waypoints.length < 2) {
    voyageCache.set(ship.id, null);
    return null;
  }

  // Step 4: chronological sort. Within a year, fall back to FILM_ORDER
  // so TFA reliably precedes TLJ.
  waypoints.sort((a, b) => {
    if (a.filmYear !== b.filmYear) return a.filmYear - b.filmYear;
    const oa = FILM_ORDER[a.filmId] ?? 0;
    const ob = FILM_ORDER[b.filmId] ?? 0;
    if (oa !== ob) return oa - ob;
    // Same film + year: keep the order they appeared in source data
    // (already preserved by the iteration above).
    return 0;
  });

  // Step 5: compute total distance in parsecs.
  let totalUnits = 0;
  for (let i = 1; i < waypoints.length; i++) {
    const prev = waypoints[i - 1];
    const cur = waypoints[i];
    if (!prev || !cur) continue;
    const dx = cur.position[0] - prev.position[0];
    const dy = cur.position[1] - prev.position[1];
    const dz = cur.position[2] - prev.position[2];
    totalUnits += Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  const voyage: Voyage = {
    shipId: ship.id,
    shipName: ship.name,
    waypoints,
    totalParsecs: totalUnits * PARSEC_PER_UNIT
  };
  voyageCache.set(ship.id, voyage);
  return voyage;
}

/** Visible for tests / one-off diagnostics. */
export function _clearVoyageCache(): void {
  voyageCache.clear();
}
