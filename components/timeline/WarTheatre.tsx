"use client";

import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { animate, useMotionValue } from "motion/react";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { FactionId, War } from "@/lib/schema";
import type { PlacedPlanet } from "@/lib/data/positions";

type Props = {
  wars: War[];
  planets: PlacedPlanet[];
  era: number;
};

/**
 * Faction-tinted color tones for war theatres.
 *
 * Per DESIGN.md, Empire/Sith → alarm red, Republic/Rebels → accent holo-blue.
 * Civil wars and stalemates use a desaturated cream tone so they read as
 * "contested" rather than aligned with one side. The `cssVar` is applied to
 * the floating <Html> label; the `mesh` THREE.Color drives the WebGL fill.
 */
type WarTone = {
  mesh: THREE.Color;
  cssVar: string;
};

const TONE_RED: WarTone = {
  // ~oklch(0.64 0.18 25) — alarm
  mesh: new THREE.Color("hsl(8, 70%, 55%)"),
  cssVar: "var(--color-alarm, oklch(0.64 0.18 25))"
};
const TONE_BLUE: WarTone = {
  // ~oklch(0.78 0.13 235) — accent
  mesh: new THREE.Color("hsl(212, 60%, 65%)"),
  cssVar: "var(--color-accent, oklch(0.78 0.13 235))"
};
const TONE_CREAM: WarTone = {
  // Desaturated neutral cream — ~oklch(0.78 0.04 70)
  mesh: new THREE.Color("hsl(45, 22%, 70%)"),
  cssVar: "var(--fg-muted, oklch(0.66 0.01 240))"
};

const RED_FACTIONS: ReadonlySet<FactionId> = new Set<FactionId>([
  "sith_order",
  "galactic_empire",
  "first_order"
]);

const BLUE_FACTIONS: ReadonlySet<FactionId> = new Set<FactionId>([
  "jedi_order",
  "galactic_republic",
  "rebel_alliance",
  "new_republic",
  "resistance",
  "old_republic",
  "high_republic"
]);

/**
 * Pick a tone for a war based on its belligerents. If exactly one side is
 * "red-aligned" and the other "blue-aligned" we pick the side that is
 * traditionally framed as the aggressor in canon (Empire-side reads red,
 * Republic-side reads blue). Civil wars or mixed alignments → cream.
 */
function toneForWar(war: War): WarTone {
  let red = false;
  let blue = false;
  for (const b of war.belligerents) {
    for (const f of b.factions) {
      if (RED_FACTIONS.has(f)) red = true;
      if (BLUE_FACTIONS.has(f)) blue = true;
    }
  }
  if (red && !blue) return TONE_RED;
  if (blue && !red) return TONE_BLUE;
  if (red && blue) return TONE_RED; // dramatic conflict — leans alarm-red
  return TONE_CREAM;
}

const Y_OFFSET = 1.5; // Above lane plane (lanes ~y=0.2), below planet field.
const FILL_OPACITY = 0.16;
const TRANSITION_MS = 800;

/**
 * Renders translucent "battle fog" volumes over the regions of the galaxy
 * where active wars are being fought. Each volume is the convex hull of the
 * resolved positions of `war.theatrePlanetIds`, projected into the XZ plane.
 *
 * Volumes appear when the global era enters the war's `[startYear, endYear]`
 * window and disappear when it leaves, with a 800ms linear fade. Reduced
 * motion users get an instant on/off transition.
 */
export function WarTheatre({ wars, planets, era }: Props) {
  // Build a planet position lookup once per planets change.
  const positionById = useMemo(() => {
    const m = new Map<string, [number, number, number]>();
    for (const p of planets) m.set(p.id, p.position);
    return m;
  }, [planets]);

  return (
    <group>
      {wars.map((war) => (
        <WarVolume
          // Stable identity per war — only opacity animates on era changes.
          key={war.id}
          war={war}
          positionById={positionById}
          era={era}
        />
      ))}
    </group>
  );
}

function WarVolume({
  war,
  positionById,
  era
}: {
  war: War;
  positionById: Map<string, [number, number, number]>;
  era: number;
}) {
  const reducedMotion = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    []
  );

  const isActive = era >= war.startYear && era <= war.endYear;
  const tone = useMemo(() => toneForWar(war), [war]);

  // Resolve theatre planet ids → XZ points. Skip ids missing from the
  // placed-planets set (some legends planets like Korriban or Malachor may
  // be absent from the SWAPI catalogue used for placement).
  const { fillGeometry, centroid, hasHull } = useMemo(() => {
    const pts: Array<[number, number]> = [];
    for (const id of war.theatrePlanetIds) {
      const p = positionById.get(id);
      if (!p) continue;
      pts.push([p[0], p[2]]);
    }

    if (pts.length < 3) {
      // A hull requires at least 3 distinct points; sub-3 theatres still
      // render a label at the centroid (or origin for 0 pts) but no fill.
      let cx = 0;
      let cz = 0;
      for (const v of pts) {
        cx += v[0];
        cz += v[1];
      }
      const c: [number, number] =
        pts.length > 0 ? [cx / pts.length, cz / pts.length] : [0, 0];
      return {
        fillGeometry: new THREE.ShapeGeometry(new THREE.Shape()),
        centroid: c,
        hasHull: false
      };
    }

    // Compute convex hull via Andrew's monotone chain (O(n log n)). The
    // hull preserves CCW winding when traversed lower→upper, which is what
    // THREE.Shape expects for a non-self-intersecting outline.
    const hull = convexHull(pts);
    const shape = new THREE.Shape();
    const first = hull[0];
    if (!first) {
      return {
        fillGeometry: new THREE.ShapeGeometry(new THREE.Shape()),
        centroid: [0, 0] as [number, number],
        hasHull: false
      };
    }
    shape.moveTo(first[0], first[1]);
    for (let i = 1; i < hull.length; i++) {
      const v = hull[i];
      if (!v) continue;
      shape.lineTo(v[0], v[1]);
    }
    shape.closePath();
    const geom = new THREE.ShapeGeometry(shape);

    let cx = 0;
    let cz = 0;
    for (const v of hull) {
      cx += v[0];
      cz += v[1];
    }
    const c: [number, number] = [cx / hull.length, cz / hull.length];

    return { fillGeometry: geom, centroid: c, hasHull: true };
  }, [war.theatrePlanetIds, positionById]);

  const fillMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: tone.mesh,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide
      }),
    [tone.mesh]
  );

  // Dispose GPU resources when this war volume unmounts or the hull rebuilds
  // (active war set effectively changes via React keying when `wars` changes;
  // this also catches in-place rebuild when theatrePlanetIds changes).
  useEffect(() => {
    return () => {
      fillGeometry.dispose();
      fillMaterial.dispose();
    };
  }, [fillGeometry, fillMaterial]);

  // 800ms linear fade per spec; reduced motion → instant.
  const activeMV = useMotionValue(isActive ? 1 : 0);

  useEffect(() => {
    if (reducedMotion) {
      activeMV.set(isActive ? 1 : 0);
      return;
    }
    const controls = animate(activeMV, isActive ? 1 : 0, {
      duration: TRANSITION_MS / 1000,
      ease: "linear"
    });
    return () => controls.stop();
  }, [isActive, activeMV, reducedMotion]);

  const labelRef = useRef<HTMLDivElement | null>(null);
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    const a = activeMV.get();
    fillMaterial.opacity = a * FILL_OPACITY;
    if (labelRef.current) {
      labelRef.current.style.opacity = `${a}`;
    }
    if (groupRef.current) {
      // Cull entirely once fully faded out — saves draw calls when scrubbed
      // far from the war's era window.
      groupRef.current.visible = a > 0.001;
    }
  });

  const [labelX, labelZ] = centroid;

  return (
    <group ref={groupRef} position={[0, Y_OFFSET, 0]}>
      {hasHull && (
        <mesh
          geometry={fillGeometry}
          material={fillMaterial}
          rotation={[-Math.PI / 2, 0, 0]}
          renderOrder={-1}
        />
      )}
      <Html
        position={[labelX, 0.4, labelZ]}
        center
        distanceFactor={64}
        style={{ pointerEvents: "none" }}
        zIndexRange={[5, 0]}
      >
        <div
          ref={labelRef}
          className="whitespace-nowrap font-mono text-2xs uppercase tracking-[0.18em]"
          style={{
            color: tone.cssVar,
            textShadow: "0 1px 2px oklch(0.09 0.005 240 / 0.9)",
            opacity: 0
          }}
        >
          {war.name}
        </div>
      </Html>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Convex hull — Andrew's monotone chain
// ---------------------------------------------------------------------------

/**
 * Returns the convex hull of `points` in counter-clockwise order. Implements
 * Andrew's monotone-chain algorithm: O(n log n). No external library, so
 * we don't pull in a hull dep just for war theatres.
 *
 * The returned hull excludes the duplicated closing vertex (the first and
 * last entries are different points), which is what THREE.Shape expects —
 * `closePath()` handles the final segment.
 */
function convexHull(points: ReadonlyArray<[number, number]>): Array<[number, number]> {
  const pts = points
    .map((p): [number, number] => [p[0], p[1]])
    .sort((a, b) => (a[0] === b[0] ? a[1] - b[1] : a[0] - b[0]));

  if (pts.length <= 1) return pts;

  const cross = (
    o: [number, number],
    a: [number, number],
    b: [number, number]
  ): number => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);

  const lower: Array<[number, number]> = [];
  for (const p of pts) {
    while (lower.length >= 2) {
      const a = lower[lower.length - 2];
      const b = lower[lower.length - 1];
      if (a && b && cross(a, b, p) <= 0) {
        lower.pop();
      } else {
        break;
      }
    }
    lower.push(p);
  }

  const upper: Array<[number, number]> = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    if (!p) continue;
    while (upper.length >= 2) {
      const a = upper[upper.length - 2];
      const b = upper[upper.length - 1];
      if (a && b && cross(a, b, p) <= 0) {
        upper.pop();
      } else {
        break;
      }
    }
    upper.push(p);
  }

  // Drop the last point of each half because it's the start of the other.
  lower.pop();
  upper.pop();
  return lower.concat(upper);
}
