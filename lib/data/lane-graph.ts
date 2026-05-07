/**
 * Lane graph & shortest-path routing for the galaxy explorer.
 *
 * Builds an undirected weighted graph from `data/build/lanes.json`, where:
 *   - Each lane waypoint becomes a node.
 *   - Each consecutive pair (path[i], path[i+1]) becomes an edge whose
 *     weight is the euclidean distance scaled by PARSEC_PER_UNIT.
 *
 * For arbitrary origin/destination planets that are NOT already on a lane
 * (most of the 5,444 parzivail planets aren't), we snap to the nearest lane
 * waypoint within SNAP_TOLERANCE. If no waypoint is in range, `findRoute`
 * returns `null` (no hyperspace route available).
 *
 * The algorithm itself is plain Dijkstra with an array-scan "extract-min".
 * The graph has ~38 lane waypoints + 2 endpoints, so the O(V²) cost is
 * trivial — using a binary heap would add code without a measurable win.
 *
 * Routes are memoized by `(originId|destinationId)` in a module-local Map
 * so picking the same pair repeatedly costs O(1).
 */

import type { Hyperlane, Coords3D } from "@/lib/schema";
import type { PlacedPlanet } from "@/lib/data/positions";

/**
 * Parsecs per Three.js unit in this project.
 *
 * The galaxy canvas uses a ~520-unit-wide sector grid (see GalaxyCanvas
 * `<SectorGrid size={520} />`). The canonical Star Wars galaxy is ~120,000
 * light-years = ~36,800 parsecs across (some sources cite up to 60,000 pc /
 * 200,000 ly for the fan-canonical "outer rim to outer rim"). We split the
 * difference: 520 units → ~30,000 pc gives 57.7 pc per Three.js unit.
 *
 * This constant is the project-wide convention for galactic distance
 * readouts; if the grid scale changes, update both this constant and the
 * `Sector grid · 1500 pc` HUD label in GalaxyCanvas.
 */
export const PARSEC_PER_UNIT = 57.7;

/**
 * Maximum distance (in Three.js units) from a planet to the nearest lane
 * waypoint we are willing to snap. 30 units ≈ 1,730 pc — roughly one
 * sector. Beyond this, the planet is considered "off the network" and we
 * report no route rather than fabricating a multi-thousand-parsec leg.
 */
export const SNAP_TOLERANCE = 30;

/**
 * Tolerance (Three.js units) for treating a lane waypoint as identical to
 * a known planet position. Many lane endpoints sit literally on top of
 * canon planets (Coruscant at 0,0,0, Corellia at the Corellian Run head,
 * etc.) — when they match within this radius we name the node after the
 * planet for nicer route summaries.
 */
const PLANET_MATCH_TOLERANCE = 0.5;

/**
 * ETA model.
 *
 * Class-1 hyperdrive convention used here: 1 hour per 60 parsecs cruising,
 * 24-hour standard day → 1,440 parsecs per day. The Millennium Falcon is
 * ~class 0.5 (twice as fast), so this number is conservative on purpose
 * — the readout describes a generic freighter, not a hero ship.
 */
const PARSECS_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
const PARSECS_PER_DAY = PARSECS_PER_HOUR * HOURS_PER_DAY;

export type RouteSegment = {
  laneId: string;
  lane: string;
  from: Coords3D;
  to: Coords3D;
  parsecs: number;
};

export type RouteResult = {
  originId: string;
  destinationId: string;
  segments: RouteSegment[];
  totalParsecs: number;
  etaDays: number;
};

type GraphNode = {
  id: string;
  position: Coords3D;
  /** Stable display name — planet name when matched, else `lane:{name}:{idx}`. */
  label: string;
};

type GraphEdge = {
  to: string;
  weight: number; // parsecs
  laneId: string;
  laneName: string;
};

type LaneGraph = {
  nodes: Map<string, GraphNode>;
  adjacency: Map<string, GraphEdge[]>;
};

let graphCache: { graph: LaneGraph; lanesRef: Hyperlane[]; planetsRef: PlacedPlanet[] } | null =
  null;
const routeCache = new Map<string, RouteResult | null>();

function distance(a: Coords3D, b: Coords3D): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function nodeKey(point: Coords3D): string {
  // Quantize to 3 decimals so two waypoints at the same physical location
  // (e.g. the Hydian/Perlemian crossing at ~(-39.3, -0.2, -126.5)) collapse
  // to one node. Both lanes' edges then attach to the shared crossing node,
  // which is what we want for routing.
  return `${point.x.toFixed(3)}|${point.y.toFixed(3)}|${point.z.toFixed(3)}`;
}

function findPlanetLabel(point: Coords3D, planets: PlacedPlanet[]): string | null {
  for (const p of planets) {
    const [px, py, pz] = p.position;
    const d = Math.sqrt(
      (px - point.x) ** 2 + (py - point.y) ** 2 + (pz - point.z) ** 2
    );
    if (d <= PLANET_MATCH_TOLERANCE) return p.name;
  }
  return null;
}

function buildGraph(lanes: Hyperlane[], planets: PlacedPlanet[]): LaneGraph {
  const nodes = new Map<string, GraphNode>();
  const adjacency = new Map<string, GraphEdge[]>();

  for (const lane of lanes) {
    for (let i = 0; i < lane.path.length; i++) {
      const point = lane.path[i];
      if (!point) continue;
      const key = nodeKey(point);
      if (!nodes.has(key)) {
        const matched = findPlanetLabel(point, planets);
        nodes.set(key, {
          id: key,
          position: point,
          label: matched ?? `lane:${lane.id}:${i}`
        });
        adjacency.set(key, []);
      }
    }

    // Wire consecutive waypoints as undirected edges.
    for (let i = 0; i < lane.path.length - 1; i++) {
      const a = lane.path[i];
      const b = lane.path[i + 1];
      if (!a || !b) continue;
      const ka = nodeKey(a);
      const kb = nodeKey(b);
      if (ka === kb) continue; // duplicate waypoint, skip self-loop
      const parsecs = distance(a, b) * PARSEC_PER_UNIT;
      const adjA = adjacency.get(ka);
      const adjB = adjacency.get(kb);
      if (adjA) {
        adjA.push({ to: kb, weight: parsecs, laneId: lane.id, laneName: lane.name });
      }
      if (adjB) {
        adjB.push({ to: ka, weight: parsecs, laneId: lane.id, laneName: lane.name });
      }
    }
  }

  return { nodes, adjacency };
}

function getGraph(lanes: Hyperlane[], planets: PlacedPlanet[]): LaneGraph {
  if (
    graphCache &&
    graphCache.lanesRef === lanes &&
    graphCache.planetsRef === planets
  ) {
    return graphCache.graph;
  }
  const graph = buildGraph(lanes, planets);
  graphCache = { graph, lanesRef: lanes, planetsRef: planets };
  routeCache.clear();
  return graph;
}

function snapToNearestNode(
  point: Coords3D,
  graph: LaneGraph
): { nodeId: string; gapUnits: number } | null {
  let best: { nodeId: string; gapUnits: number } | null = null;
  for (const node of graph.nodes.values()) {
    const d = distance(point, node.position);
    if (!best || d < best.gapUnits) {
      best = { nodeId: node.id, gapUnits: d };
    }
  }
  if (!best || best.gapUnits > SNAP_TOLERANCE) return null;
  return best;
}

/**
 * Plain Dijkstra with array-scan extract-min. With ~38 nodes the O(V²)
 * scan is faster than maintaining a heap (and avoids a dep). Returns the
 * predecessor map and the cost to each node.
 */
function dijkstra(
  graph: LaneGraph,
  sourceId: string
): { dist: Map<string, number>; prev: Map<string, { nodeId: string; edge: GraphEdge } | null> } {
  const dist = new Map<string, number>();
  const prev = new Map<string, { nodeId: string; edge: GraphEdge } | null>();
  const visited = new Set<string>();

  for (const id of graph.nodes.keys()) {
    dist.set(id, Number.POSITIVE_INFINITY);
    prev.set(id, null);
  }
  dist.set(sourceId, 0);

  while (visited.size < graph.nodes.size) {
    let u: string | null = null;
    let uDist = Number.POSITIVE_INFINITY;
    for (const [id, d] of dist) {
      if (visited.has(id)) continue;
      if (d < uDist) {
        u = id;
        uDist = d;
      }
    }
    if (u === null || uDist === Number.POSITIVE_INFINITY) break; // unreachable rest
    visited.add(u);

    const edges = graph.adjacency.get(u) ?? [];
    for (const edge of edges) {
      if (visited.has(edge.to)) continue;
      const alt = uDist + edge.weight;
      const cur = dist.get(edge.to) ?? Number.POSITIVE_INFINITY;
      if (alt < cur) {
        dist.set(edge.to, alt);
        prev.set(edge.to, { nodeId: u, edge });
      }
    }
  }

  return { dist, prev };
}

function reconstructPath(
  graph: LaneGraph,
  prev: Map<string, { nodeId: string; edge: GraphEdge } | null>,
  targetId: string
): { fromId: string; toId: string; edge: GraphEdge }[] | null {
  const segments: { fromId: string; toId: string; edge: GraphEdge }[] = [];
  let cursor = targetId;
  while (true) {
    const step = prev.get(cursor);
    if (!step) break;
    segments.push({ fromId: step.nodeId, toId: cursor, edge: step.edge });
    cursor = step.nodeId;
  }
  if (segments.length === 0) return null;
  segments.reverse();
  // Sanity: ensure the source-side has an entry in the graph.
  const firstFrom = segments[0]?.fromId;
  if (firstFrom === undefined || !graph.nodes.has(firstFrom)) return null;
  return segments;
}

function findPlanetById(planets: PlacedPlanet[], id: string): PlacedPlanet | undefined {
  return planets.find((p) => p.id === id);
}

function planetCoords(p: PlacedPlanet): Coords3D {
  const [x, y, z] = p.position;
  return { x, y, z };
}

/**
 * Compute the shortest hyperspace route between two planets along the
 * lane network. Returns `null` when either endpoint can't be snapped to
 * a lane waypoint within `SNAP_TOLERANCE`, or when the network is
 * disconnected between the two snapped nodes.
 */
export function findRoute(
  originPlanetId: string,
  destinationPlanetId: string,
  planets: PlacedPlanet[],
  lanes: Hyperlane[]
): RouteResult | null {
  if (originPlanetId === destinationPlanetId) return null;

  const cacheKey = `${originPlanetId}|${destinationPlanetId}`;
  if (routeCache.has(cacheKey)) {
    return routeCache.get(cacheKey) ?? null;
  }

  const origin = findPlanetById(planets, originPlanetId);
  const destination = findPlanetById(planets, destinationPlanetId);
  if (!origin || !destination) {
    routeCache.set(cacheKey, null);
    return null;
  }

  const graph = getGraph(lanes, planets);
  const originSnap = snapToNearestNode(planetCoords(origin), graph);
  const destinationSnap = snapToNearestNode(planetCoords(destination), graph);
  if (!originSnap || !destinationSnap) {
    routeCache.set(cacheKey, null);
    return null;
  }

  if (originSnap.nodeId === destinationSnap.nodeId) {
    // Both endpoints snapped to the same waypoint — no meaningful route.
    routeCache.set(cacheKey, null);
    return null;
  }

  const { dist, prev } = dijkstra(graph, originSnap.nodeId);
  const totalLane = dist.get(destinationSnap.nodeId);
  if (totalLane === undefined || !Number.isFinite(totalLane)) {
    routeCache.set(cacheKey, null);
    return null;
  }

  const pathEdges = reconstructPath(graph, prev, destinationSnap.nodeId);
  if (!pathEdges) {
    routeCache.set(cacheKey, null);
    return null;
  }

  const segments: RouteSegment[] = [];
  // Optional: prepend "spur" from origin planet to its snap node.
  if (originSnap.gapUnits > PLANET_MATCH_TOLERANCE) {
    const headNode = graph.nodes.get(originSnap.nodeId);
    if (headNode) {
      segments.push({
        laneId: "spur",
        lane: "Sublight transit",
        from: planetCoords(origin),
        to: headNode.position,
        parsecs: originSnap.gapUnits * PARSEC_PER_UNIT
      });
    }
  }

  for (const step of pathEdges) {
    const fromNode = graph.nodes.get(step.fromId);
    const toNode = graph.nodes.get(step.toId);
    if (!fromNode || !toNode) continue;
    segments.push({
      laneId: step.edge.laneId,
      lane: step.edge.laneName,
      from: fromNode.position,
      to: toNode.position,
      parsecs: step.edge.weight
    });
  }

  // Trailing spur from snapped node to destination planet.
  if (destinationSnap.gapUnits > PLANET_MATCH_TOLERANCE) {
    const tailNode = graph.nodes.get(destinationSnap.nodeId);
    if (tailNode) {
      segments.push({
        laneId: "spur",
        lane: "Sublight transit",
        from: tailNode.position,
        to: planetCoords(destination),
        parsecs: destinationSnap.gapUnits * PARSEC_PER_UNIT
      });
    }
  }

  let totalParsecs = 0;
  for (const seg of segments) totalParsecs += seg.parsecs;

  const result: RouteResult = {
    originId: originPlanetId,
    destinationId: destinationPlanetId,
    segments,
    totalParsecs,
    etaDays: totalParsecs / PARSECS_PER_DAY
  };
  routeCache.set(cacheKey, result);
  return result;
}

/** Visible for tests / one-off diagnostics. */
export function _clearRouteCache(): void {
  routeCache.clear();
  graphCache = null;
}
