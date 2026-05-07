"use client";

import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { animate, useMotionValue } from "motion/react";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { FACTION_TERRITORIES, type TerritoryEra } from "@/lib/data/faction-territories";
import type { FactionId } from "@/lib/schema";

type Props = { era: number };

/**
 * Per-faction colors used for the translucent fill and the perimeter glow.
 *
 * These are picked to match DESIGN.md's color tokens, but must be expressed
 * here as `THREE.Color` literals (the OKLCH tokens live in CSS only). The
 * mapping below approximates them closely:
 *  - Empire / Sith                → --color-alarm  (Imperial red, oklch 0.64 0.18 25)
 *  - Republic / Rebels / NR       → --color-accent (electric holo-blue, oklch 0.78 0.13 235)
 *  - CIS                          → --color-legends (warm amber, oklch 0.82 0.10 60)
 *  - First Order                  → desaturated alarm-leaning hue (between alarm and accent)
 *
 * `cssColor` is what the floating <Html> label uses (CSS var → real OKLCH);
 * the <THREE.Color> instances are sampled approximations for WebGL.
 */
const FACTION_STYLE: Record<
  FactionId,
  { mesh: THREE.Color; line: THREE.Color; cssVar: string }
> = {
  jedi_order: {
    mesh: new THREE.Color("hsl(210, 55%, 65%)"),
    line: new THREE.Color("hsl(210, 70%, 75%)"),
    cssVar: "var(--color-accent, oklch(0.78 0.13 235))"
  },
  sith_order: {
    mesh: new THREE.Color("hsl(10, 70%, 56%)"),
    line: new THREE.Color("hsl(10, 80%, 66%)"),
    cssVar: "var(--color-alarm, oklch(0.64 0.18 25))"
  },
  galactic_republic: {
    mesh: new THREE.Color("hsl(212, 55%, 65%)"),
    line: new THREE.Color("hsl(212, 70%, 75%)"),
    cssVar: "var(--color-accent, oklch(0.78 0.13 235))"
  },
  galactic_empire: {
    mesh: new THREE.Color("hsl(8, 70%, 55%)"),
    line: new THREE.Color("hsl(8, 80%, 65%)"),
    cssVar: "var(--color-alarm, oklch(0.64 0.18 25))"
  },
  rebel_alliance: {
    mesh: new THREE.Color("hsl(212, 55%, 65%)"),
    line: new THREE.Color("hsl(212, 75%, 78%)"),
    cssVar: "var(--color-accent, oklch(0.78 0.13 235))"
  },
  new_republic: {
    mesh: new THREE.Color("hsl(212, 55%, 65%)"),
    line: new THREE.Color("hsl(212, 70%, 75%)"),
    cssVar: "var(--color-accent, oklch(0.78 0.13 235))"
  },
  first_order: {
    mesh: new THREE.Color("hsl(0, 60%, 52%)"),
    line: new THREE.Color("hsl(0, 75%, 65%)"),
    cssVar: "var(--color-alarm, oklch(0.64 0.18 25))"
  },
  resistance: {
    mesh: new THREE.Color("hsl(212, 55%, 65%)"),
    line: new THREE.Color("hsl(212, 70%, 75%)"),
    cssVar: "var(--color-accent, oklch(0.78 0.13 235))"
  },
  cis: {
    mesh: new THREE.Color("hsl(38, 60%, 60%)"),
    line: new THREE.Color("hsl(38, 75%, 70%)"),
    cssVar: "var(--color-legends, oklch(0.82 0.10 60))"
  },
  mandalorian: {
    mesh: new THREE.Color("hsl(210, 8%, 55%)"),
    line: new THREE.Color("hsl(210, 12%, 65%)"),
    cssVar: "var(--fg-muted, oklch(0.66 0.01 240))"
  },
  old_republic: {
    mesh: new THREE.Color("hsl(212, 55%, 65%)"),
    line: new THREE.Color("hsl(212, 70%, 75%)"),
    cssVar: "var(--color-accent, oklch(0.78 0.13 235))"
  },
  high_republic: {
    mesh: new THREE.Color("hsl(212, 55%, 65%)"),
    line: new THREE.Color("hsl(212, 70%, 75%)"),
    cssVar: "var(--color-accent, oklch(0.78 0.13 235))"
  },
  hutt_cartel: {
    mesh: new THREE.Color("hsl(38, 50%, 55%)"),
    line: new THREE.Color("hsl(38, 65%, 65%)"),
    cssVar: "var(--color-legends, oklch(0.82 0.10 60))"
  },
  trade_federation: {
    mesh: new THREE.Color("hsl(38, 50%, 55%)"),
    line: new THREE.Color("hsl(38, 65%, 65%)"),
    cssVar: "var(--color-legends, oklch(0.82 0.10 60))"
  },
  unknown: {
    mesh: new THREE.Color("hsl(210, 8%, 55%)"),
    line: new THREE.Color("hsl(210, 12%, 65%)"),
    cssVar: "var(--fg-dim, oklch(0.44 0.012 240))"
  }
};

const Y_OFFSET = 0.5; // Sit just above the lane plane (lanes are ~y=0.2), below planets.
const FILL_OPACITY = 0.18;
const LINE_OPACITY = 0.55;
const LABEL_OPACITY_FLOOR = 0.0;
const TRANSITION_MS = 600;

/**
 * Renders translucent 3D regions for major factions over the top-down
 * galactic plane. Active territory polygons fade in (opacity → fill/line
 * targets) when the era enters their window and fade out when it leaves.
 *
 * Per DESIGN.md §Motion: animations are 600ms linear; reduced motion makes
 * them instant. Materials use `depthWrite: false` and `DoubleSide` so the
 * planet field above remains visible through the volumes.
 *
 * Geometry & materials are owned per-component and disposed on unmount.
 * The set of `<TerritoryShape>` instances is stable across era changes
 * (one per entry in `FACTION_TERRITORIES`), so React doesn't churn the
 * scene graph when scrubbing — only opacity values animate.
 */
export function FactionTerritory({ era }: Props) {
  return (
    <group>
      {FACTION_TERRITORIES.map((t, i) => (
        <TerritoryShape
          // Polygon position + factionId + era window are stable identity.
          key={`${t.factionId}-${t.eraStart}-${t.eraEnd}-${i}`}
          territory={t}
          era={era}
        />
      ))}
    </group>
  );
}

function TerritoryShape({ territory, era }: { territory: TerritoryEra; era: number }) {
  const style = FACTION_STYLE[territory.factionId];

  const reducedMotion = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    []
  );

  const isActive = era >= territory.eraStart && era <= territory.eraEnd;

  // Build the THREE.Shape once per polygon. Vertices live in (x, z) in
  // gameplay space — we put them on the local XY plane and rotate the mesh
  // -90° around X so it lies flat on the XZ plane at Y_OFFSET.
  const { fillGeometry, outlinePoints, centroid } = useMemo(() => {
    const shape = new THREE.Shape();
    const first = territory.polygon[0];
    if (!first) {
      return {
        fillGeometry: new THREE.ShapeGeometry(shape),
        outlinePoints: new Float32Array(0),
        centroid: [0, 0] as [number, number]
      };
    }
    shape.moveTo(first[0], first[1]);
    for (let i = 1; i < territory.polygon.length; i++) {
      const v = territory.polygon[i];
      if (!v) continue;
      shape.lineTo(v[0], v[1]);
    }
    shape.closePath();

    const geom = new THREE.ShapeGeometry(shape);

    // Build the line-loop perimeter as a flat XZ polyline. The line loop
    // closes itself (THREE.LineLoop draws a segment from last → first).
    const lineXYZ = new Float32Array(territory.polygon.length * 3);
    let cx = 0;
    let cz = 0;
    for (let i = 0; i < territory.polygon.length; i++) {
      const v = territory.polygon[i];
      if (!v) continue;
      lineXYZ[i * 3] = v[0];
      lineXYZ[i * 3 + 1] = 0; // local Y for line geometry; the parent group sets world Y.
      lineXYZ[i * 3 + 2] = v[1];
      cx += v[0];
      cz += v[1];
    }
    const n = Math.max(territory.polygon.length, 1);
    const c: [number, number] = territory.centerLabel
      ? territory.centerLabel
      : [cx / n, cz / n];

    return { fillGeometry: geom, outlinePoints: lineXYZ, centroid: c };
  }, [territory.polygon, territory.centerLabel]);

  // Build one BufferGeometry for the line loop. Built alongside the fill so
  // it shares the same lifecycle.
  const lineGeometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(outlinePoints, 3));
    return g;
  }, [outlinePoints]);

  const fillMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: style.mesh,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide
      }),
    [style.mesh]
  );

  const lineMaterial = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: style.line,
        transparent: true,
        opacity: 0,
        depthWrite: false
      }),
    [style.line]
  );

  // Dispose all GPU resources when the component unmounts (or any of the
  // memoized inputs change). React's invariant is that the cleanup runs
  // before the next effect with new resources, so the previous geometry
  // gets disposed before a fresh one is rendered.
  useEffect(() => {
    return () => {
      fillGeometry.dispose();
      lineGeometry.dispose();
      fillMaterial.dispose();
      lineMaterial.dispose();
    };
  }, [fillGeometry, lineGeometry, fillMaterial, lineMaterial]);

  // Single MotionValue drives all three opacities (fill, line, label). They
  // share an active-fraction in [0, 1] which we multiply by per-element
  // target opacities. animate(...) gives us 600ms linear easing per spec.
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

  // Apply the motion value to materials each frame. Doing this in a
  // useFrame keeps the GL state updates on the R3F render loop and avoids
  // a setState path that would cause a React re-render every frame.
  const labelRef = useRef<HTMLDivElement | null>(null);
  useFrame(() => {
    const a = activeMV.get();
    fillMaterial.opacity = a * FILL_OPACITY;
    lineMaterial.opacity = a * LINE_OPACITY;
    if (labelRef.current) {
      labelRef.current.style.opacity = `${LABEL_OPACITY_FLOOR + a}`;
    }
  });

  // Cull entirely when fully inactive (post-transition). Keeps draw calls
  // off the GPU when scrubbed to an era this faction does not exist in.
  // We rely on `activeMV.get()` polled in useFrame above for opacity, and
  // toggle `visible` on the parent group only when fully transparent AND
  // inactive (so the fade-out completes before culling).
  const groupRef = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!groupRef.current) return;
    const a = activeMV.get();
    groupRef.current.visible = a > 0.001;
  });

  const [labelX, labelZ] = centroid;

  return (
    <group ref={groupRef} position={[0, Y_OFFSET, 0]}>
      {/* Fill: rotate the XY-plane ShapeGeometry onto the XZ plane. */}
      <mesh
        geometry={fillGeometry}
        material={fillMaterial}
        rotation={[-Math.PI / 2, 0, 0]}
        renderOrder={-1}
      />
      {/* Outline: line loop traced around the perimeter, already in XZ space. */}
      <lineLoop geometry={lineGeometry} material={lineMaterial} renderOrder={0} />
      {/* Floating faction label, placed at the polygon's centroid (or override). */}
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
            color: style.cssVar,
            textShadow: "0 1px 2px oklch(0.09 0.005 240 / 0.9)",
            opacity: 0
          }}
        >
          {territory.name}
        </div>
      </Html>
    </group>
  );
}
