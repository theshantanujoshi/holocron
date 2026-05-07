"use client";

import { useMemo } from "react";
import type { Entity } from "@/lib/schema";
import type { PlacedPlanet } from "@/lib/data/positions";
import type { LineageGraph } from "@/lib/data/loadLineage";
import { HolographicFigure } from "./HolographicFigure";

type Side = "jedi" | "sith" | "civilian";

type Props = {
  entities: Entity[];
  planets: PlacedPlanet[];
  lineage: LineageGraph | null;
  selectedId: string | null;
  enabled: boolean;
};

// Sith origin seeds — same set used in HolographicFigure and LineageView.
const SITH_ORIGINS = new Set<string>([
  "person/darth-bane",
  "person/darth-plagueis",
  "person/darth-revan",
]);

/**
 * Derive the Sith descent set from the lineage graph via BFS over master_of
 * edges. Mirrors the identical logic in HolographicFigure.classifyFromLineage
 * and LineageView.classify — kept inline here so AtlasMode has no runtime
 * coupling to those modules.
 */
function buildSithSet(lineage: LineageGraph): Set<string> {
  const sith = new Set<string>();
  for (const n of lineage.nodes) {
    if (n.faction === "sith_order") sith.add(n.id);
    if (SITH_ORIGINS.has(n.id)) sith.add(n.id);
  }
  const masterFwd = new Map<string, string[]>();
  for (const e of lineage.edges) {
    if (e.kind !== "master_of") continue;
    const list = masterFwd.get(e.source) ?? [];
    list.push(e.target);
    masterFwd.set(e.source, list);
  }
  const queue = [...sith];
  while (queue.length > 0) {
    const cur = queue.shift();
    if (cur === undefined) break;
    const downstream = masterFwd.get(cur);
    if (!downstream) continue;
    for (const next of downstream) {
      if (!sith.has(next)) {
        sith.add(next);
        queue.push(next);
      }
    }
  }
  return sith;
}

function classifySide(
  id: string,
  faction: string | undefined,
  sithSet: Set<string>,
  jediSet: Set<string>,
): Side {
  if (sithSet.has(id)) return "sith";
  if (faction === "jedi_order" || jediSet.has(id)) return "jedi";
  return "civilian";
}

type ResolvedFigure = {
  entity: Entity;
  position: [number, number, number];
  side: Side;
};

/**
 * <AtlasMode /> — renders a holographic figure above each major character's
 * homeworld when atlas mode is enabled.
 *
 * "Major characters" = every person node in the lineage graph. The lineage
 * graph currently contains 33 nodes; roughly 20 have homeworlds in our SWAPI
 * subset, so at most 20 figures appear simultaneously.
 *
 * The resolved list is memoized on (entities, planets, lineage) so it only
 * recomputes when source data changes, not on every selectedId change.
 * selectedId only affects the intensity/scale passed to each figure.
 */
export function AtlasMode({
  entities,
  planets,
  lineage,
  selectedId,
  enabled,
}: Props) {
  // Build a fast lookup: planet entity-id → placed position.
  const planetById = useMemo<Map<string, [number, number, number]>>(() => {
    const map = new Map<string, [number, number, number]>();
    for (const p of planets) {
      // PlacedPlanet.id is the entity id (e.g. "planet/1").
      map.set(p.id, p.position);
    }
    return map;
  }, [planets]);

  // Build a fast lookup: entity-id → Entity for person-type entities only.
  const personById = useMemo<Map<string, Entity>>(() => {
    const map = new Map<string, Entity>();
    for (const e of entities) {
      if (e.type === "person") map.set(e.id, e);
    }
    return map;
  }, [entities]);

  // Derive the set of lineage node ids → the "major character" filter.
  const lineageNodeIds = useMemo<Set<string>>(() => {
    if (!lineage) return new Set<string>();
    return new Set(lineage.nodes.map((n) => n.id));
  }, [lineage]);

  // Precompute classification sets once per lineage graph.
  const sithSet = useMemo<Set<string>>(() => {
    if (!lineage) return new Set<string>();
    return buildSithSet(lineage);
  }, [lineage]);

  // Jedi: appears in any master_of edge AND is not Sith. This is the same
  // "inMaster" heuristic from HolographicFigure.classifyFromLineage.
  const jediSet = useMemo<Set<string>>(() => {
    if (!lineage) return new Set<string>();
    const inMaster = new Set<string>();
    for (const e of lineage.edges) {
      if (e.kind !== "master_of") continue;
      inMaster.add(e.source);
      inMaster.add(e.target);
    }
    // Remove Sith — they share the master_of graph but resolve to sith first.
    for (const id of sithSet) inMaster.delete(id);
    return inMaster;
  }, [lineage, sithSet]);

  // Also index faction from the lineage nodes for faster lookup.
  const factionById = useMemo<Map<string, string>>(() => {
    if (!lineage) return new Map<string, string>();
    const map = new Map<string, string>();
    for (const n of lineage.nodes) {
      if (n.faction) map.set(n.id, n.faction);
    }
    return map;
  }, [lineage]);

  // The expensive join: lineage-member persons × their homeworld positions.
  const figures = useMemo<ResolvedFigure[]>(() => {
    if (!lineage) return [];
    const out: ResolvedFigure[] = [];

    for (const nodeId of lineageNodeIds) {
      const entity = personById.get(nodeId);
      if (!entity) continue;

      // Find the homeworld_of relation — the relation target is the planet id
      // for which this person IS the homeworld (i.e., the relation lives on the
      // planet entity: planet.relations[{ kind:"homeworld_of", target:personId }]).
      // In our schema the relation direction is: planet → homeworld_of → person.
      // We need the reverse: for a person, which planet has a homeworld_of → them?
      // So we search all entities for a planet with homeworld_of pointing at this person.
      // That's O(entities) — but we only do it once per person, and personById limits us to ~33 people.
      // We cache the result in the memoized figures array.
      //
      // Alternatively, some person entities carry a homeworld_of relation TO the
      // planet. The schema supports both directions. Try person first (faster),
      // then fall back to the planet scan.
      let homeworldPos: [number, number, number] | undefined;

      // Check if the person entity itself has a relation pointing to a planet:
      for (const rel of entity.relations) {
        if (rel.kind === "homeworld_of") {
          homeworldPos = planetById.get(rel.target);
          if (homeworldPos) break;
        }
      }

      // If not found on the person, scan planets for homeworld_of → this person.
      if (!homeworldPos) {
        for (const e of entities) {
          if (e.type !== "planet") continue;
          for (const rel of e.relations) {
            if (rel.kind === "homeworld_of" && rel.target === nodeId) {
              homeworldPos = planetById.get(e.id);
              break;
            }
          }
          if (homeworldPos) break;
        }
      }

      if (!homeworldPos) continue; // no homeworld in our dataset — skip

      const side = classifySide(
        nodeId,
        factionById.get(nodeId),
        sithSet,
        jediSet,
      );

      out.push({
        entity,
        position: [homeworldPos[0], homeworldPos[1] + 5, homeworldPos[2]],
        side,
      });
    }

    return out;
  }, [lineage, lineageNodeIds, personById, planetById, entities, sithSet, jediSet, factionById]);

  if (!enabled) return null;

  return (
    <>
      {figures.map((fig) => {
        const isSelected = selectedId === fig.entity.id;
        return (
          <HolographicFigure
            key={fig.entity.id}
            entity={fig.entity}
            position={fig.position}
            scale={isSelected ? 2.5 : 1.2}
            intensity={isSelected ? 1.0 : 0.3}
            side={fig.side}
          />
        );
      })}
    </>
  );
}
