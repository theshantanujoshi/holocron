"use client";

import { useRef, useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Entity } from "@/lib/schema";

// ─── constants ────────────────────────────────────────────────────────────────

const RING_COUNT = 3;
const STAGGER_S = 1.3;           // seconds between ring launches
const LIFETIME_S = 4.0;          // seconds for one ring to expand fully
const RADIUS_START = 0.5;        // world units
const RADIUS_END = 80;           // world units
const OPACITY_START = 0.85;
const INNER_RADIUS = 0.5;
const OUTER_RADIUS = 0.55;       // very thin annulus
const RING_SEGMENTS = 64;

// ─── color resolution ─────────────────────────────────────────────────────────

/**
 * Reads a CSS custom property from :root (e.g. `--color-accent`) and converts
 * its OKLCH value to a THREE.Color.
 *
 * THREE.Color.set() understands CSS color strings including oklch() as of
 * Three.js r155+ (which uses CSS Color Level 4 parsing internally via the
 * browser's CSS engine when running in a browser context). We delegate the
 * conversion to the browser by setting the value on a temporary element and
 * reading back the computed rgb() string, which Three.Color can reliably parse.
 */
function resolveCSSColorToThree(cssVar: string): THREE.Color {
  if (typeof document === "undefined") {
    // SSR guard — fg-primary archive cream (oklch 0.94 0.005 80)
    return new THREE.Color("#ece8d8");
  }
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(cssVar)
    .trim();

  // Use a temporary element to let the browser convert OKLCH → rgb
  const el = document.createElement("div");
  el.style.color = raw;
  el.style.display = "none";
  document.body.appendChild(el);
  const computed = getComputedStyle(el).color; // always rgb(r, g, b)
  document.body.removeChild(el);

  const color = new THREE.Color();
  color.set(computed);
  return color;
}

// ─── types ────────────────────────────────────────────────────────────────────

export type ForceSide = "jedi" | "sith" | "civilian";

type Props = {
  entity: Entity | null;
  anchorPosition: [number, number, number] | null;
  side: ForceSide;
};

type RingStartTimes = {
  ring0Start: number;
  ring1Start: number;
  ring2Start: number;
};

type RingRefs = {
  meshes: (THREE.Mesh | null)[];
  mats: (THREE.MeshBasicMaterial | null)[];
  geos: (THREE.RingGeometry | null)[];
};

// ─── component ────────────────────────────────────────────────────────────────

export function ForcePulse({ entity, anchorPosition, side }: Props) {
  const active = entity !== null && side !== "civilian" && anchorPosition !== null;

  // Reduced-motion detection, evaluated once on mount
  const reducedMotion = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    []
  );

  // Per-ring birth timestamps (clock.elapsedTime at launch)
  const startTimesRef = useRef<RingStartTimes>({
    ring0Start: 0,
    ring1Start: -STAGGER_S,
    ring2Start: -STAGGER_S * 2,
  });

  // Refs to live Three.js objects so useFrame can mutate without re-renders
  const ringRefs = useRef<RingRefs>({
    meshes: [null, null, null],
    mats: [null, null, null],
    geos: [null, null, null],
  });

  // Resolved color, computed once when `side` changes
  const colorRef = useRef<THREE.Color>(new THREE.Color());
  useEffect(() => {
    if (!active) return;
    const cssVar = side === "jedi" ? "--accent" : "--alarm";
    colorRef.current = resolveCSSColorToThree(cssVar);
    // Propagate new color to already-existing materials
    for (const mat of ringRefs.current.mats) {
      if (mat) mat.color.copy(colorRef.current);
    }
  }, [side, active]);

  // Dispose and rebuild geometries/materials whenever entity changes or unmounts
  useEffect(() => {
    if (!active) {
      // Dispose existing objects and null-out refs
      for (let i = 0; i < RING_COUNT; i++) {
        ringRefs.current.geos[i]?.dispose();
        ringRefs.current.mats[i]?.dispose();
        ringRefs.current.geos[i] = null;
        ringRefs.current.mats[i] = null;
        ringRefs.current.meshes[i] = null;
      }
      return;
    }
    return () => {
      // Cleanup on unmount or entity change
      for (let i = 0; i < RING_COUNT; i++) {
        ringRefs.current.geos[i]?.dispose();
        ringRefs.current.mats[i]?.dispose();
        ringRefs.current.geos[i] = null;
        ringRefs.current.mats[i] = null;
        ringRefs.current.meshes[i] = null;
      }
    };
  }, [active, entity?.id]);

  // Reset start times on each new entity so rings begin fresh
  useEffect(() => {
    if (!active) return;
    // We don't have clock.elapsedTime here; set to sentinel -999 so useFrame
    // initialises them on the first tick (elapsed will always be > -999).
    startTimesRef.current = {
      ring0Start: -999,
      ring1Start: -999 - STAGGER_S,
      ring2Start: -999 - STAGGER_S * 2,
    };
  }, [active, entity?.id]);

  // Animation loop
  useFrame(({ clock }) => {
    if (!active || reducedMotion) return;
    const now = clock.elapsedTime;
    const starts = startTimesRef.current;
    const startArr: number[] = [starts.ring0Start, starts.ring1Start, starts.ring2Start];

    // Initialise sentinel start times on first frame
    if (starts.ring0Start < -100) {
      startTimesRef.current = {
        ring0Start: now,
        ring1Start: now - STAGGER_S,
        ring2Start: now - STAGGER_S * 2,
      };
      return; // let next frame do the actual animation
    }

    for (let i = 0; i < RING_COUNT; i++) {
      const mesh = ringRefs.current.meshes[i];
      const mat = ringRefs.current.mats[i];
      if (!mesh || !mat) continue;

      const birthTime = startArr[i] ?? 0;
      let t = (now - birthTime) / LIFETIME_S; // 0..1

      // Loop: relaunch when expansion completes
      if (t >= 1) {
        const newStart = birthTime + Math.ceil(t) * LIFETIME_S;
        if (i === 0) startTimesRef.current.ring0Start = newStart;
        if (i === 1) startTimesRef.current.ring1Start = newStart;
        if (i === 2) startTimesRef.current.ring2Start = newStart;
        t = 0;
      }
      // Clamp to [0,1] for negative-stagger pre-launch
      const tc = Math.max(0, t);

      // Scale: ring geometry starts at RADIUS_START; we drive actual radius via
      // uniform scale on the mesh. Target radius at tc: lerp(START,END).
      const targetRadius = RADIUS_START + (RADIUS_END - RADIUS_START) * tc;
      // The geometry itself has inner=0.5, so scale=1 → radius=0.5
      const scaleFactor = targetRadius / INNER_RADIUS;
      mesh.scale.setScalar(scaleFactor);

      mat.opacity = OPACITY_START * (1 - tc);
    }
  });

  // ── static reduced-motion variant ──
  if (!active) return null;

  if (reducedMotion) {
    const staticColor = side === "jedi"
      ? resolveCSSColorToThree("--accent")
      : resolveCSSColorToThree("--alarm");
    const staticRadius = 30;
    const geo = new THREE.RingGeometry(staticRadius - 0.15, staticRadius + 0.15, 64, 1);
    const mat = new THREE.MeshBasicMaterial({
      color: staticColor,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    return (
      <mesh
        geometry={geo}
        material={mat}
        position={anchorPosition}
        rotation={[-Math.PI / 2, 0, 0]}
        onUpdate={(self) => {
          // Dispose on unmount via Three.js ref lifecycle
          return () => {
            self.geometry.dispose();
            (self.material as THREE.MeshBasicMaterial).dispose();
          };
        }}
      />
    );
  }

  // ── animated variant ──
  // We render three <mesh> elements whose refs we capture into ringRefs.
  return (
    <group position={anchorPosition}>
      {Array.from({ length: RING_COUNT }, (_, i) => (
        <mesh
          key={i}
          rotation={[-Math.PI / 2, 0, 0]}
          ref={(node) => {
            if (!node) return;
            // Build geometry and material lazily on first ref assignment
            if (!ringRefs.current.geos[i]) {
              const geo = new THREE.RingGeometry(
                INNER_RADIUS,
                OUTER_RADIUS,
                RING_SEGMENTS,
                1
              );
              const mat = new THREE.MeshBasicMaterial({
                color: colorRef.current,
                transparent: true,
                opacity: 0,
                depthWrite: false,
                blending: THREE.AdditiveBlending,
                side: THREE.DoubleSide,
              });
              node.geometry = geo;
              node.material = mat;
              ringRefs.current.geos[i] = geo;
              ringRefs.current.mats[i] = mat;
            }
            ringRefs.current.meshes[i] = node;
          }}
        />
      ))}
    </group>
  );
}
