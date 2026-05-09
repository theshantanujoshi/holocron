"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ForceGraph3DDefault from "3d-force-graph";
import type { ForceGraph3DInstance } from "3d-force-graph";
import type { LinkObject, NodeObject } from "three-forcegraph";

/**
 * The published `ForceGraph3D` const is typed without exposing its generics
 * (the type is `IForceGraph3D` with default `NodeObject`/`LinkObject`). To
 * keep our handlers strictly typed we narrow it to the typed constructor.
 */
type TypedForceGraph3DCtor = new <N extends NodeObject, L extends LinkObject<N>>(
  element: HTMLElement,
  configOptions?: { controlType?: "trackball" | "orbit" | "fly"; rendererConfig?: object }
) => ForceGraph3DInstance<N, L>;
const ForceGraph3D = ForceGraph3DDefault as unknown as TypedForceGraph3DCtor;
import { useSelection } from "@/lib/store";
import type { EntityType } from "@/lib/schema";
import type { LineageEdge, LineageGraph, LineageNode } from "@/lib/data/loadLineage";
import { LineageHud } from "./LineageHud";

type Props = {
  graph: LineageGraph;
};

/**
 * Side classification used to color a node.
 *
 *  - sith       — descendant in the Bane / Plagueis / Revan master chain, or
 *                 explicit `faction === "sith_order"`. Drawn in alarm red.
 *  - jedi       — `faction === "jedi_order"`, OR participates in a master_of
 *                 edge that isn't part of the Sith descent. Drawn in accent.
 *  - force      — appears in a master_of edge but no faction tag and isn't
 *                 plainly Sith or Jedi (e.g. ancient unaligned masters).
 *                 Drawn in fg-strong cream.
 *  - civilian   — does not appear on either end of any master_of edge.
 *                 Family-only nodes: Padmé, Han, Shmi, Owen, Beru, Bail,
 *                 Jango, Boba. Drawn in fg-muted.
 */
type Side = "sith" | "jedi" | "force" | "civilian";

/** A node carrying its precomputed side and a stable d3-friendly typing. */
type LNode = NodeObject & {
  id: string;
  name: string;
  faction?: string;
  canonicity: LineageNode["canonicity"];
  side: Side;
};

/** A typed link with our domain edge kind. */
type LLink = LinkObject<LNode> & {
  kind: LineageEdge["kind"];
};

/**
 * Pre-simulation `link.source` is the raw id string; post-simulation
 * `3d-force-graph` mutates it to the resolved LNode. These two helpers
 * collapse that union to a string id and (when available) the LNode.
 */
function endpointId(endpoint: LLink["source"]): string {
  if (endpoint === null || endpoint === undefined) return "";
  if (typeof endpoint === "string") return endpoint;
  if (typeof endpoint === "number") return String(endpoint);
  return endpoint.id;
}

function endpointNode(endpoint: LLink["source"]): LNode | null {
  if (endpoint === null || endpoint === undefined) return null;
  if (typeof endpoint === "object") return endpoint;
  return null;
}

const SITH_ORIGINS = new Set<string>([
  "person/darth-bane",
  "person/darth-plagueis",
  "person/darth-revan"
]);

/**
 * Walks `master_of` edges forward from the Sith origin nodes to mark every
 * descendant Sith — covers untagged Sidious/Maul/Dooku/Anakin/Malak via the
 * Bane → Plagueis → Sidious → {Maul, Dooku, Anakin, Snoke} chain.
 *
 * Anakin's redemption is famous but, for this view's purpose (color = side
 * during the canonical lineage timeline), we keep him on the Sith branch.
 */
function classify(graph: LineageGraph): Map<string, Side> {
  const sith = new Set<string>();

  // Seed: explicit faction tags + Sith origin roots.
  for (const n of graph.nodes) {
    if (n.faction === "sith_order") sith.add(n.id);
    if (SITH_ORIGINS.has(n.id)) sith.add(n.id);
  }

  // Forward BFS along master_of from each seed.
  const masterFwd = new Map<string, string[]>();
  for (const e of graph.edges) {
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

  // Anyone touching a master_of edge is Force-sensitive.
  const inMaster = new Set<string>();
  for (const e of graph.edges) {
    if (e.kind !== "master_of") continue;
    inMaster.add(e.source);
    inMaster.add(e.target);
  }

  const out = new Map<string, Side>();
  for (const n of graph.nodes) {
    if (sith.has(n.id)) {
      out.set(n.id, "sith");
    } else if (n.faction === "jedi_order") {
      out.set(n.id, "jedi");
    } else if (inMaster.has(n.id)) {
      // Untagged but trains apprentices or is trained — treat as Jedi-side
      // since by this point we've excluded Sith. Yoda, Obi-Wan, Anakin (pre-
      // fall, but he's already marked sith), Mace, Plo Koon, etc. land here.
      out.set(n.id, "jedi");
    } else {
      out.set(n.id, "civilian");
    }
  }
  return out;
}

/**
 * Reverse adjacency on master_of + parent_of so we can BFS upward from the
 * hovered node and dim everything not on the resulting path.
 */
function buildAncestryIndex(graph: LineageGraph): Map<string, string[]> {
  const idx = new Map<string, string[]>();
  for (const e of graph.edges) {
    if (e.kind !== "master_of" && e.kind !== "parent_of") continue;
    const parents = idx.get(e.target) ?? [];
    parents.push(e.source);
    idx.set(e.target, parents);
  }
  return idx;
}

function ancestorsOf(start: string, idx: Map<string, string[]>): Set<string> {
  const seen = new Set<string>([start]);
  const queue = [start];
  while (queue.length > 0) {
    const cur = queue.shift();
    if (cur === undefined) break;
    const parents = idx.get(cur);
    if (!parents) continue;
    for (const p of parents) {
      if (!seen.has(p)) {
        seen.add(p);
        queue.push(p);
      }
    }
  }
  return seen;
}

/**
 * Deterministic layered layout used as the reduced-motion fallback. Depth =
 * generation count from the earliest known ancestor (BFS over parent_of +
 * master_of). Within a depth tier nodes are spread along x by id-hash so
 * the layout is stable across reloads.
 */
function staticLayout(graph: LineageGraph): Map<string, { x: number; y: number; z: number }> {
  const idx = buildAncestryIndex(graph);
  const depth = new Map<string, number>();
  // Topological-ish: anyone with no parents starts at depth 0.
  const roots: string[] = [];
  for (const n of graph.nodes) {
    if (!idx.has(n.id)) {
      depth.set(n.id, 0);
      roots.push(n.id);
    }
  }
  // BFS forward from roots along the reverse of `idx` (i.e. master_of /
  // parent_of in the natural direction).
  const fwd = new Map<string, string[]>();
  for (const e of graph.edges) {
    if (e.kind !== "master_of" && e.kind !== "parent_of") continue;
    const list = fwd.get(e.source) ?? [];
    list.push(e.target);
    fwd.set(e.source, list);
  }
  const queue = [...roots];
  while (queue.length > 0) {
    const cur = queue.shift();
    if (cur === undefined) break;
    const d = depth.get(cur) ?? 0;
    const next = fwd.get(cur);
    if (!next) continue;
    for (const t of next) {
      const prior = depth.get(t);
      if (prior === undefined || prior < d + 1) {
        depth.set(t, d + 1);
        queue.push(t);
      }
    }
  }
  for (const n of graph.nodes) {
    if (!depth.has(n.id)) depth.set(n.id, 0);
  }

  // Bucket by depth, then space within each tier.
  const tiers = new Map<number, string[]>();
  for (const [id, d] of depth) {
    const list = tiers.get(d) ?? [];
    list.push(id);
    tiers.set(d, list);
  }

  const out = new Map<string, { x: number; y: number; z: number }>();
  const yStep = 80;
  const xSpread = 260;
  const sortedDepths = [...tiers.keys()].sort((a, b) => a - b);
  for (const d of sortedDepths) {
    const ids = tiers.get(d) ?? [];
    ids.sort();
    const count = ids.length;
    for (let i = 0; i < count; i++) {
      const id = ids[i];
      if (id === undefined) continue;
      const t = count === 1 ? 0.5 : i / (count - 1);
      out.set(id, {
        x: (t - 0.5) * xSpread,
        y: -d * yStep + (sortedDepths.length * yStep) / 2,
        z: ((id.charCodeAt(0) % 7) - 3) * 16
      });
    }
  }
  return out;
}

/** Resolve an `oklch(...)` value from the document's computed style. */
function readToken(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v.length > 0 ? v : fallback;
}

export function LineageView({ graph }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const graphRef = useRef<ForceGraph3DInstance<LNode, LLink> | null>(null);
  const dimSetRef = useRef<Set<string> | null>(null);
  const [showFallback, setShowFallback] = useState(false);

  const selectedId = useSelection((s) => s.entityId);
  const select = useSelection((s) => s.select);

  // Memoize graph derivations so they only run when the JSON changes.
  const sides = useMemo(() => classify(graph), [graph]);
  const ancestryIdx = useMemo(() => buildAncestryIndex(graph), [graph]);
  const staticPos = useMemo(() => staticLayout(graph), [graph]);

  const lnodes = useMemo<LNode[]>(
    () =>
      graph.nodes.map((n) => ({
        id: n.id,
        name: n.name,
        faction: n.faction,
        canonicity: n.canonicity,
        side: sides.get(n.id) ?? "civilian"
      })),
    [graph, sides]
  );
  const llinks = useMemo<LLink[]>(
    () => graph.edges.map((e) => ({ source: e.source, target: e.target, kind: e.kind })),
    [graph]
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const accent = readToken("--color-accent", "oklch(0.78 0.13 235)");
    const accentFaint = readToken("--color-accent-faint", "oklch(0.30 0.05 235)");
    const alarm = readToken("--color-alarm", "oklch(0.64 0.18 25)");
    const fgStrong = readToken("--color-fg-strong", "oklch(0.98 0.003 80)");
    const fgMuted = readToken("--color-fg-muted", "oklch(0.66 0.010 240)");
    const canon = readToken("--color-canon", "oklch(0.94 0.02 80)");

    const sideColor: Record<Side, string> = {
      sith: alarm,
      jedi: accent,
      force: fgStrong,
      civilian: fgMuted
    };

    // Build the instance attached to our own div — separate canvas from R3F.
    const fg = new ForceGraph3D<LNode, LLink>(el, {
      controlType: "orbit",
      rendererConfig: { antialias: true, alpha: true }
    });
    graphRef.current = fg;

    fg.backgroundColor("rgba(0,0,0,0)")
      .nodeRelSize(5)
      .nodeOpacity(0.95)
      .nodeColor((n) => sideColor[n.side])
      .nodeLabel((n) => n.name)
      .linkOpacity(0.55)
      .linkWidth(1.2)
      .linkColor((l) => {
        const src = endpointNode(l.source);
        if (l.kind === "master_of") {
          return src?.side === "sith" ? alarm : accent;
        }
        if (l.kind === "parent_of") return canon;
        // spouse_of, sibling_of
        return accentFaint;
      })
      .enableNodeDrag(false)
      .showNavInfo(false);

    // Click → cross-pivot via global selection store.
    fg.onNodeClick((node) => {
      const t: EntityType = "person";
      select(node.id, t);
    });

    // Hover → highlight ancestry path. We dim non-path nodes/links by
    // overriding the color accessor with a locally-stored "dim set". The
    // accessor closes over `dimSetRef` so toggling is one assignment + one
    // refresh, not a re-init.
    fg.onNodeHover((node) => {
      if (!node) {
        dimSetRef.current = null;
      } else {
        const path = ancestorsOf(node.id, ancestryIdx);
        const dim = new Set<string>();
        for (const n of graph.nodes) {
          if (!path.has(n.id)) dim.add(n.id);
        }
        dimSetRef.current = dim;
      }
      fg.nodeColor((n) => {
        const dim = dimSetRef.current;
        if (dim && dim.has(n.id)) {
          // Same hue, dimmed via opacity-bearing color stub. We piggyback
          // on linkOpacity for links and re-use a low-alpha color here.
          return sideColor[n.side];
        }
        return sideColor[n.side];
      });
      fg.nodeOpacity(dimSetRef.current ? 0.18 : 0.95);
      // Link emphasis: dim links not entirely inside the highlighted path.
      fg.linkOpacity(dimSetRef.current ? 0.18 : 0.55);
      fg.linkColor((l) => {
        const dim = dimSetRef.current;
        const srcId = endpointId(l.source);
        const tgtId = endpointId(l.target);
        const dimmed = dim ? dim.has(srcId) || dim.has(tgtId) : false;
        const src = endpointNode(l.source);
        let base: string;
        if (l.kind === "master_of") {
          base = src?.side === "sith" ? alarm : accent;
        } else if (l.kind === "parent_of") {
          base = canon;
        } else {
          base = accentFaint;
        }
        if (dimmed) return accentFaint;
        return base;
      });
    });

    // Reduced motion: pin every node at its deterministic layered position
    // and skip the simulation.
    if (reduceMotion) {
      for (const n of lnodes) {
        const pos = staticPos.get(n.id);
        if (!pos) continue;
        n.fx = pos.x;
        n.fy = pos.y;
        n.fz = pos.z;
      }
      fg.cooldownTicks(0).warmupTicks(0);
    } else {
      fg.cooldownTime(8000).warmupTicks(40);
    }

    fg.graphData({ nodes: lnodes, links: llinks });

    // Zoom out to fit once layout has run a beat.
    const fitTimer = window.setTimeout(() => {
      fg.zoomToFit(600, 80);
    }, reduceMotion ? 50 : 1500);

    // Resize — the lib does not auto-fit when the container resizes.
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      fg.width(r.width);
      fg.height(r.height);
    });
    ro.observe(el);

    return () => {
      window.clearTimeout(fitTimer);
      ro.disconnect();
      try {
        fg._destructor();
      } catch (err) {
        // Defensive: certain teardown paths in 3d-force-graph throw on
        // already-disposed renderers in HMR; swallow rather than crash.
        if (process.env.NODE_ENV !== "production") {
          console.warn("[lineage] graph teardown threw", err);
        }
      }
      graphRef.current = null;
      // The lib appends its <canvas> as a child of `el`; ensure cleanup if
      // the destructor missed any wrappers in dev/HMR.
      while (el.firstChild) el.removeChild(el.firstChild);
    };
  }, [lnodes, llinks, graph.nodes, ancestryIdx, staticPos, select]);

  // External selection (e.g. from the search palette) — center the camera.
  useEffect(() => {
    const fg = graphRef.current;
    if (!fg || !selectedId) return;
    const node = fg
      .graphData()
      .nodes.find((n) => n.id === selectedId);
    if (!node) return;
    const x = node.x ?? 0;
    const y = node.y ?? 0;
    const z = node.z ?? 0;
    const dist = 180;
    const norm = Math.hypot(x, y, z) || 1;
    fg.cameraPosition(
      { x: x + (x / norm) * dist, y: y + (y / norm) * dist, z: z + (z / norm) * dist },
      { x, y, z },
      900
    );
  }, [selectedId]);

  // Build the chains shown in the accessibility fallback. We walk forward
  // from each root master, depth-first, so screen readers get a coherent
  // narrative: "Yoda → Dooku → Qui-Gon → Obi-Wan → Anakin → Luke → Rey".
  const chains = useMemo(() => buildChains(graph), [graph]);

  return (
    <div className="relative h-full w-full bg-bg-deep">
      <div ref={containerRef} className="absolute inset-0" aria-hidden />
      <LineageHud
        nodeCount={graph.nodes.length}
        edgeCount={graph.edges.length}
        onShowFallback={() => setShowFallback((v) => !v)}
        fallbackOpen={showFallback}
      />
      <AccessibleFallback chains={chains} open={showFallback} />
    </div>
  );
}

type Chain = {
  rootId: string;
  rootName: string;
  kind: "master_of" | "parent_of";
  rows: { id: string; name: string; depth: number }[];
};

function buildChains(graph: LineageGraph): Chain[] {
  const byId = new Map<string, LineageNode>();
  for (const n of graph.nodes) byId.set(n.id, n);

  const fwd = new Map<string, { kind: LineageEdge["kind"]; target: string }[]>();
  const inEdgeKinds = new Map<string, Set<LineageEdge["kind"]>>();
  for (const e of graph.edges) {
    const list = fwd.get(e.source) ?? [];
    list.push({ kind: e.kind, target: e.target });
    fwd.set(e.source, list);
    const k = inEdgeKinds.get(e.target) ?? new Set();
    k.add(e.kind);
    inEdgeKinds.set(e.target, k);
  }

  const out: Chain[] = [];

  for (const kind of ["master_of", "parent_of"] as const) {
    for (const n of graph.nodes) {
      const k = inEdgeKinds.get(n.id);
      if (k && k.has(kind)) continue; // not a root for this kind
      const outgoing = fwd.get(n.id);
      if (!outgoing || !outgoing.some((e) => e.kind === kind)) continue;

      const rows: { id: string; name: string; depth: number }[] = [];
      const stack: { id: string; depth: number }[] = [{ id: n.id, depth: 0 }];
      const seen = new Set<string>();
      while (stack.length > 0) {
        const top = stack.pop();
        if (!top) break;
        if (seen.has(top.id)) continue;
        seen.add(top.id);
        const meta = byId.get(top.id);
        if (!meta) continue;
        rows.push({ id: top.id, name: meta.name, depth: top.depth });
        const children = fwd.get(top.id) ?? [];
        for (const c of children) {
          if (c.kind === kind) stack.push({ id: c.target, depth: top.depth + 1 });
        }
      }
      if (rows.length < 2) continue;
      out.push({ rootId: n.id, rootName: n.name, kind, rows });
    }
  }

  return out;
}

function AccessibleFallback({ chains, open }: { chains: Chain[]; open: boolean }) {
  const className = open
    ? "absolute inset-0 z-20 overflow-auto bg-bg-deep/95 p-6 backdrop-blur-sm"
    : "sr-only";
  return (
    <section
      className={className}
      aria-label="Lineage chains, text fallback"
      role="region"
    >
      <p className="font-mono text-2xs uppercase tracking-[0.16em] text-fg-dim">
        Lineage chains
      </p>
      <div className="mt-3 grid grid-cols-1 gap-6 md:grid-cols-2">
        {chains.map((c) => (
          <div key={`${c.kind}:${c.rootId}`}>
            <p className="font-mono text-2xs uppercase tracking-[0.16em] text-fg-muted">
              {c.kind === "master_of" ? "Master of" : "Parent of"} · {c.rootName}
            </p>
            <ul className="mt-2 space-y-1 text-sm text-fg-primary">
              {c.rows.map((r, i) => (
                <li
                  key={`${c.rootId}-${r.id}-${i}`}
                  style={{ paddingLeft: `${r.depth * 14}px` }}
                >
                  <span className="text-fg-dim">{r.depth === 0 ? "" : "→ "}</span>
                  {r.name}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
