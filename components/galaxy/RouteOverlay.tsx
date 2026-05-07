"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { RouteResult } from "@/lib/data/lane-graph";

type Props = {
  route: RouteResult;
};

/**
 * Renders an active hyperspace route on top of the dimmed lane network.
 *
 * - The route is drawn as a single THREE.Line built from concatenated
 *   segment vertices. `linewidth` is intentionally 1 (browsers clamp this
 *   regardless of what we set), so we lean on full saturation +
 *   `depthTest: false` to keep the line readable above the dimmed lanes.
 * - A small octahedron glyph cruises along the path at constant velocity
 *   (5s per traversal, looping). The traversal is parameterized by total
 *   parsec length — a long route doesn't move the glyph faster, it just
 *   means each unit of t covers more space.
 * - `prefers-reduced-motion`: the glyph parks at the route midpoint
 *   instead of looping; the line itself is unchanged.
 */
const TRAVERSAL_SECONDS = 5;
const ACCENT_HEX = 0x6dc0ff; // approximation of OKLCH(0.78 0.13 235)

export function RouteOverlay({ route }: Props) {
  const glyphRef = useRef<THREE.Mesh>(null);
  const elapsedRef = useRef(0);

  const reduceMotion = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    []
  );

  // Build the polyline from segment vertices. We deliberately don't
  // dedupe endpoints (segment[i].to === segment[i+1].from), since
  // duplicating a vertex is harmless and keeps the index math simple.
  const { lineObject, samples } = useMemo(() => {
    const points: THREE.Vector3[] = [];
    for (const seg of route.segments) {
      points.push(new THREE.Vector3(seg.from.x, seg.from.y, seg.from.z));
      points.push(new THREE.Vector3(seg.to.x, seg.to.y, seg.to.z));
    }

    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({
      color: ACCENT_HEX,
      transparent: true,
      opacity: 1,
      linewidth: 2,
      depthTest: false,
      depthWrite: false
    });
    const line = new THREE.Line(geo, mat);
    // Render after dimmed lanes so the route always wins z-ordering.
    line.renderOrder = 5;

    // Pre-compute cumulative lengths for the glyph so we can map t∈[0,1]
    // to a 3D position regardless of segment count or unevenness.
    const cumulative: number[] = [0];
    let total = 0;
    for (const seg of route.segments) {
      const dx = seg.to.x - seg.from.x;
      const dy = seg.to.y - seg.from.y;
      const dz = seg.to.z - seg.from.z;
      total += Math.sqrt(dx * dx + dy * dy + dz * dz);
      cumulative.push(total);
    }

    return {
      lineObject: line,
      samples: { totalLength: total, cumulative }
    };
  }, [route]);

  useEffect(() => {
    return () => {
      lineObject.geometry.dispose();
      const m = lineObject.material as THREE.Material;
      m.dispose();
    };
  }, [lineObject]);

  useFrame((_, delta) => {
    if (!glyphRef.current) return;
    if (reduceMotion) {
      // Park glyph at midpoint statically.
      const pos = positionAt(0.5, route, samples);
      glyphRef.current.position.copy(pos);
      return;
    }
    elapsedRef.current = (elapsedRef.current + delta) % TRAVERSAL_SECONDS;
    const t = elapsedRef.current / TRAVERSAL_SECONDS;
    const pos = positionAt(t, route, samples);
    glyphRef.current.position.copy(pos);
    glyphRef.current.rotation.y += delta * 1.2;
    glyphRef.current.rotation.x += delta * 0.6;
  });

  return (
    <group>
      <primitive object={lineObject} />
      <mesh ref={glyphRef} renderOrder={6}>
        <octahedronGeometry args={[1.4, 0]} />
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
  route: RouteResult,
  samples: { totalLength: number; cumulative: number[] }
): THREE.Vector3 {
  const target = samples.totalLength * Math.max(0, Math.min(1, t));
  for (let i = 0; i < route.segments.length; i++) {
    const seg = route.segments[i];
    if (!seg) continue;
    const segStart = samples.cumulative[i] ?? 0;
    const segEnd = samples.cumulative[i + 1] ?? segStart;
    if (target <= segEnd || i === route.segments.length - 1) {
      const segLen = Math.max(segEnd - segStart, 1e-6);
      const local = (target - segStart) / segLen;
      const x = seg.from.x + (seg.to.x - seg.from.x) * local;
      const y = seg.from.y + (seg.to.y - seg.from.y) * local;
      const z = seg.from.z + (seg.to.z - seg.from.z) * local;
      return new THREE.Vector3(x, y, z);
    }
  }
  return new THREE.Vector3(0, 0, 0);
}
