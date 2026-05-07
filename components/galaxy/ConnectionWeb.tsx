"use client";

/**
 * ConnectionWeb — R3F overlay that fans glowing lines from a selected entity's
 * anchor position to every related entity visible in the galaxy.
 *
 * Render strategy
 * ───────────────
 *  • Lines are batched per "material variant" (one BufferGeometry per group).
 *  • A tiny custom ShaderMaterial drives the sweep-draw: a `uProgress` uniform
 *    advances 0→1 over 600 ms.  In the fragment shader each fragment checks its
 *    normalised along-line distance (vDistance) and discards if vDistance >
 *    uProgress, producing an origin-first reveal.
 *  • When `prefers-reduced-motion` is detected, uProgress is fixed at 1 and the
 *    geometry is shown immediately.
 *  • Dashed lines (appears_in) are rendered as an extra pass with a
 *    THREE.LineDashedMaterial on top of the solid geometry — the solid geometry
 *    also uses the same ShaderMaterial so the reveal still works, and the
 *    dashed pass layers on at full progress.
 *  • All BufferGeometry objects and ShaderMaterial instances are disposed in the
 *    useEffect cleanup.
 */

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Entity, EntityType } from "@/lib/schema";
import type { PlacedPlanet } from "@/lib/data/positions";
import {
  resolveAnchor,
  findConnections,
  kindToColorKey,
  isDashed,
  RELATION_COLOR,
  kindOpacity,
  GALAXY_CENTER,
  type ColorKey
} from "@/lib/data/relationGeometry";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Props = {
  entities: Entity[];
  planets: PlacedPlanet[];
  selectedId: string | null;
  selectedType: EntityType | null;
};

// ---------------------------------------------------------------------------
// Sweep-draw ShaderMaterial factory
// ---------------------------------------------------------------------------

/**
 * Vertex shader passes a per-vertex `vDistance` (0 at start, 1 at end of each
 * segment pair) to the fragment shader. `uProgress` gates visibility.
 *
 * BufferGeometry for lines is a flat array of [A, B, A, B, …] pairs — Three.js
 * LineSegments draws each pair as an independent segment, so we treat every
 * even vertex as distance=0 and every odd as distance=1.  The `aDistance`
 * attribute carries this explicitly to avoid depending on gl_VertexID.
 */
const VERT_GLSL = /* glsl */ `
  attribute float aDistance;
  varying float vDistance;
  void main() {
    vDistance = aDistance;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAG_GLSL = /* glsl */ `
  uniform float uProgress;
  uniform vec3  uColor;
  uniform float uOpacity;
  varying float vDistance;
  void main() {
    if (vDistance > uProgress) discard;
    // Soft fade at the tip (last 10 % of the sweep).
    float tip = 1.0 - smoothstep(uProgress - 0.10, uProgress, vDistance);
    gl_FragColor = vec4(uColor, uOpacity * tip);
  }
`;

function makeSweepMaterial(colorHex: number, opacity: number): THREE.ShaderMaterial {
  const color = new THREE.Color(colorHex);
  return new THREE.ShaderMaterial({
    vertexShader: VERT_GLSL,
    fragmentShader: FRAG_GLSL,
    uniforms: {
      uProgress: { value: 0 },
      uColor:    { value: color },
      uOpacity:  { value: opacity }
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
}

// ---------------------------------------------------------------------------
// Geometry builder
// ---------------------------------------------------------------------------

type LineSegmentEntry = {
  origin: [number, number, number];
  target: [number, number, number];
};

/**
 * Build a single THREE.BufferGeometry that holds all line-segment pairs.
 * Returns null when the entry list is empty.
 */
function buildGeometry(segments: LineSegmentEntry[]): THREE.BufferGeometry | null {
  if (segments.length === 0) return null;

  // 2 vertices per segment, 3 floats per vertex.
  const positions = new Float32Array(segments.length * 2 * 3);
  // 1 float per vertex (0 = start, 1 = end).
  const distances = new Float32Array(segments.length * 2);

  let vi = 0;
  let di = 0;
  for (const { origin, target } of segments) {
    positions[vi++] = origin[0];
    positions[vi++] = origin[1];
    positions[vi++] = origin[2];
    distances[di++] = 0;

    positions[vi++] = target[0];
    positions[vi++] = target[1];
    positions[vi++] = target[2];
    distances[di++] = 1;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("aDistance", new THREE.BufferAttribute(distances, 1));
  return geo;
}

// ---------------------------------------------------------------------------
// Reduced-motion detection (run once at module level, SSR-safe)
// ---------------------------------------------------------------------------

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const SWEEP_DURATION_S = 0.6; // seconds

export function ConnectionWeb({
  entities,
  planets,
  selectedId
}: Props) {
  const groupRef = useRef<THREE.Group>(null);

  /**
   * progressRef holds the current animation state:
   *   elapsed = seconds since the last selection change (starts at 0).
   *   done    = true once elapsed ≥ SWEEP_DURATION_S.
   */
  const animRef = useRef({ elapsed: 0, done: false });

  // ------------------------------------------------------------------
  // Compute connection data whenever selectedId changes.
  // ------------------------------------------------------------------
  const webData = useMemo(() => {
    if (!selectedId) return null;

    const selected = entities.find((e) => e.id === selectedId);
    if (!selected) return null;

    const originPos = resolveAnchor(selected, entities, planets) ?? GALAXY_CENTER;
    const connections = findConnections(selectedId, entities);

    // Group by material key (solid by color key, dashed separately).
    type Variant = {
      key: ColorKey;
      dashed: boolean;
      segments: LineSegmentEntry[];
    };

    const variants = new Map<string, Variant>();

    for (const conn of connections) {
      const targetPos = resolveAnchor(conn.target, entities, planets);
      if (!targetPos) continue;

      const key = kindToColorKey(conn.relation.kind);
      const dashed = isDashed(conn.relation.kind);
      const variantKey = `${key}:${dashed ? "d" : "s"}`;

      if (!variants.has(variantKey)) {
        variants.set(variantKey, { key, dashed, segments: [] });
      }
      variants.get(variantKey)!.segments.push({ origin: originPos, target: targetPos });
    }

    return { variants: Array.from(variants.values()), originPos };
  }, [selectedId, entities, planets]);

  // ------------------------------------------------------------------
  // Build Three.js objects and manage cleanup.
  // ------------------------------------------------------------------
  const reduced = prefersReducedMotion();

  /**
   * Each element: geometry + sweep material + optional dashed material
   * that layers over for appears_in.
   */
  type Built = {
    geo: THREE.BufferGeometry;
    sweep: THREE.ShaderMaterial;
    dashed: THREE.LineDashedMaterial | null;
    mesh: THREE.LineSegments;
    dashedMesh: THREE.LineSegments | null;
  };

  const builtRef = useRef<Built[]>([]);

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;

    // Dispose previous objects.
    for (const b of builtRef.current) {
      b.geo.dispose();
      b.sweep.dispose();
      b.dashed?.dispose();
      group.remove(b.mesh);
      if (b.dashedMesh) group.remove(b.dashedMesh);
    }
    builtRef.current = [];

    // Reset animation clock.
    animRef.current = { elapsed: 0, done: false };

    if (!webData) return;

    const built: Built[] = [];

    for (const variant of webData.variants) {
      const geo = buildGeometry(variant.segments);
      if (!geo) continue;

      const colorHex = RELATION_COLOR[variant.key];
      const opacity = kindOpacity(variant.key);
      const sweep = makeSweepMaterial(colorHex, opacity);

      // Reduced-motion: skip animation, show immediately.
      if (reduced) sweep.uniforms.uProgress!.value = 1;

      const mesh = new THREE.LineSegments(geo, sweep);
      group.add(mesh);

      let dashedMesh: THREE.LineSegments | null = null;
      let dashed: THREE.LineDashedMaterial | null = null;

      if (variant.dashed) {
        dashed = new THREE.LineDashedMaterial({
          color: colorHex,
          opacity: opacity * 0.7,
          transparent: true,
          dashSize: 2,
          gapSize: 2,
          depthWrite: false,
          blending: THREE.AdditiveBlending
        });
        // Re-use the same geometry — computeLineDistances for dashes.
        geo.computeBoundingBox();
        dashedMesh = new THREE.LineSegments(geo, dashed);
        dashedMesh.computeLineDistances();
        group.add(dashedMesh);
      }

      built.push({ geo, sweep, dashed, mesh, dashedMesh });
    }

    builtRef.current = built;

    return () => {
      for (const b of built) {
        b.geo.dispose();
        b.sweep.dispose();
        b.dashed?.dispose();
        group.remove(b.mesh);
        if (b.dashedMesh) group.remove(b.dashedMesh);
      }
      builtRef.current = [];
    };
  }, [webData, reduced]);

  // ------------------------------------------------------------------
  // Animate uProgress each frame.
  // ------------------------------------------------------------------
  useFrame((_, delta) => {
    if (reduced) return; // already at 1, nothing to do.

    const state = animRef.current;
    if (state.done) return;

    state.elapsed += delta;
    const t = Math.min(state.elapsed / SWEEP_DURATION_S, 1);

    for (const b of builtRef.current) {
      b.sweep.uniforms.uProgress!.value = t;
    }

    if (t >= 1) state.done = true;
  });

  return <group ref={groupRef} />;
}
