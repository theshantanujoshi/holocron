"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import type { Voyage } from "@/lib/data/ship-voyage";
import { formatYear } from "@/lib/utils";

type Props = {
  voyage: Voyage | null;
};

/**
 * Renders a ship's chronological voyage through the galaxy as an animated
 * 3D path with stop spheres at each visited planet, an octahedron glyph
 * traversing the route at constant velocity, and HTML labels above each
 * waypoint summarising the film and year.
 *
 * Visual language:
 *   - Path: cream (--color-canon), dashed, opacity 0.85. Distinct from
 *     the hyperspace-route's accent-saturated solid line so the user can
 *     read "this is a narrative trail, not a navigable hyperlane".
 *   - Stop spheres: accent-blue (--color-accent). Small, semi-transparent.
 *   - Glyph: octahedron, accent-blue. Loops the route every 6 seconds.
 *
 * Reduced motion: the glyph is parked at the LAST waypoint (the ship's
 * most recent appearance) — no perpetual motion, no rotation. Labels
 * still render. Path/spheres are unchanged.
 *
 * Performance: typical voyages have 4–12 waypoints. Geometry, material,
 * and label-position arrays are memoized on `voyage` reference; on
 * unmount or voyage change, all GPU resources are disposed.
 */

const TRAVERSAL_SECONDS = 6;
const ACCENT_HEX = 0x6dc0ff; // approximation of OKLCH(0.78 0.13 235)
const CANON_HEX = 0xe9e5d6;  // approximation of OKLCH(0.94 0.02 80)

export function ShipVoyage({ voyage }: Props) {
  const glyphRef = useRef<THREE.Mesh>(null);
  const elapsedRef = useRef(0);

  const reduceMotion = useMemo(
    () =>
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    []
  );

  // Build the line geometry, the dashed material, and arc-length samples
  // in a single memo so the cleanup effect can dispose them as one set.
  const built = useMemo(() => {
    if (!voyage) return null;
    const points: THREE.Vector3[] = voyage.waypoints.map(
      (w) => new THREE.Vector3(w.position[0], w.position[1], w.position[2])
    );
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineDashedMaterial({
      color: CANON_HEX,
      dashSize: 1.2,
      gapSize: 0.6,
      transparent: true,
      opacity: 0.85,
      depthWrite: false
    });
    const line = new THREE.Line(geometry, material);
    // LineDashedMaterial requires per-vertex line-distance attribute.
    line.computeLineDistances();
    // Render after dimmed connection web so the voyage stays legible.
    line.renderOrder = 4;

    // Cumulative arc-length, used by the glyph to map t∈[0,1] to position
    // regardless of segment lengths.
    const cumulative: number[] = [0];
    let total = 0;
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1];
      const b = points[i];
      if (!a || !b) {
        cumulative.push(total);
        continue;
      }
      total += a.distanceTo(b);
      cumulative.push(total);
    }

    return {
      line,
      geometry,
      material,
      points,
      samples: { totalLength: total, cumulative }
    };
  }, [voyage]);

  // Dispose GPU resources on unmount or when the voyage prop changes
  // (the previous `built` is captured in the cleanup closure).
  useEffect(() => {
    if (!built) return;
    return () => {
      built.geometry.dispose();
      built.material.dispose();
    };
  }, [built]);

  useFrame((_, delta) => {
    if (!glyphRef.current || !built || !voyage) return;

    if (reduceMotion) {
      // Park glyph at the LAST waypoint — the most recent stop in the
      // ship's chronological history, which is the most narratively
      // useful resting point for a static visualisation.
      const last = built.points[built.points.length - 1];
      if (last) glyphRef.current.position.copy(last);
      return;
    }

    elapsedRef.current = (elapsedRef.current + delta) % TRAVERSAL_SECONDS;
    const t = elapsedRef.current / TRAVERSAL_SECONDS;
    const pos = positionAt(t, built.points, built.samples);
    glyphRef.current.position.copy(pos);
    glyphRef.current.rotation.y += delta * 1.0;
    glyphRef.current.rotation.x += delta * 0.5;
  });

  if (!voyage || !built) return null;

  return (
    <group>
      <primitive object={built.line} />

      {voyage.waypoints.map((wp, i) => (
        <group key={`${wp.filmId}-${wp.planetId}-${i}`} position={wp.position}>
          <mesh renderOrder={5}>
            <sphereGeometry args={[0.6, 16, 16]} />
            <meshBasicMaterial
              color={ACCENT_HEX}
              transparent
              opacity={0.9}
              depthWrite={false}
            />
          </mesh>
          <Html
            position={[0, 2.4, 0]}
            center
            distanceFactor={56}
            occlude={false}
            style={{ pointerEvents: "none" }}
          >
            <div
              className="whitespace-nowrap font-mono text-2xs uppercase tracking-[0.16em]"
              style={{
                color: "oklch(0.94 0.02 80)",
                textShadow: "0 1px 2px oklch(0.09 0.005 240 / 0.9)"
              }}
            >
              <span style={{ color: "oklch(0.78 0.13 235)" }}>
                {formatYear(wp.filmYear)}
              </span>
              <span className="mx-1.5 text-fg-dim">·</span>
              <span>{wp.filmName}</span>
            </div>
          </Html>
        </group>
      ))}

      <mesh ref={glyphRef} renderOrder={6}>
        <octahedronGeometry args={[0.95, 0]} />
        <meshBasicMaterial
          color={ACCENT_HEX}
          transparent
          opacity={0.95}
          depthTest={false}
        />
      </mesh>
    </group>
  );
}

function positionAt(
  t: number,
  points: THREE.Vector3[],
  samples: { totalLength: number; cumulative: number[] }
): THREE.Vector3 {
  const target = samples.totalLength * Math.max(0, Math.min(1, t));
  for (let i = 1; i < points.length; i++) {
    const segStart = samples.cumulative[i - 1] ?? 0;
    const segEnd = samples.cumulative[i] ?? segStart;
    if (target <= segEnd || i === points.length - 1) {
      const a = points[i - 1];
      const b = points[i];
      if (!a || !b) return new THREE.Vector3();
      const segLen = Math.max(segEnd - segStart, 1e-6);
      const local = (target - segStart) / segLen;
      return new THREE.Vector3(
        a.x + (b.x - a.x) * local,
        a.y + (b.y - a.y) * local,
        a.z + (b.z - a.z) * local
      );
    }
  }
  const first = points[0];
  return first ? first.clone() : new THREE.Vector3();
}
