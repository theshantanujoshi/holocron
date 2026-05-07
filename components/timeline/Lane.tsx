"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Hyperlane } from "@/lib/schema";

type Props = {
  lane: Hyperlane;
  era: number;
};

/**
 * One hyperspace lane drawn as a dashed THREE.Line. Active lanes (whose
 * era window contains the global era, or that have no era window) render
 * at full accent saturation with a perpetually-flowing dash pattern.
 * Inactive lanes render at accent-faint with no dash motion.
 *
 * Reduced motion: dash pattern is static (no offset animation) regardless
 * of active state. The lane geometry is identical either way.
 */
export function Lane({ lane, era }: Props) {
  const matRef = useRef<THREE.LineDashedMaterial | null>(null);

  const reduce = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    []
  );

  const isActive = useMemo(() => {
    if (!lane.era) return true;
    const { start, end } = lane.era;
    if (start === null && end === null) return true;
    if (start !== null && era < start) return false;
    if (end !== null && era > end) return false;
    return true;
  }, [lane.era, era]);

  // Color tokens — match the OKLCH accent token approximated in HSL for
  // Three.js. activeColor ≈ accent (0.78 0.13 235), faintColor ≈
  // accent-faint (0.30 0.05 235).
  const activeColor = useMemo(() => new THREE.Color().setHSL(0.59, 0.55, 0.62), []);
  const faintColor = useMemo(() => new THREE.Color().setHSL(0.59, 0.32, 0.30), []);

  // Build the Three.Line instance once per (path, active-state). Since
  // LineDashedMaterial requires computeLineDistances() on the geometry's
  // host line object, we keep the line as a single primitive.
  const lineObject = useMemo(() => {
    const pts = lane.path.map((p) => new THREE.Vector3(p.x, p.y, p.z));
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineDashedMaterial({
      color: isActive ? activeColor.clone() : faintColor.clone(),
      dashSize: 1.6,
      gapSize: 1.0,
      transparent: true,
      opacity: isActive ? 0.85 : 0.42,
      depthWrite: false
    });
    matRef.current = mat;
    const line = new THREE.Line(geo, mat);
    line.computeLineDistances();
    return line;
    // We re-create only when the path itself changes; opacity/color
    // animations are handled by useFrame mutating the material in place.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lane.path]);

  // Tear down the GPU resources when this lane unmounts or the path changes.
  useEffect(() => {
    return () => {
      lineObject.geometry.dispose();
      const m = lineObject.material as THREE.Material;
      m.dispose();
    };
  }, [lineObject]);

  const targetOpacity = isActive ? 0.85 : 0.42;

  useFrame((_, delta) => {
    if (!matRef.current) return;
    // Smooth opacity/color shift on active toggles (~220ms easing).
    const lerpRate = 1 - Math.pow(0.001, delta);
    matRef.current.opacity += (targetOpacity - matRef.current.opacity) * lerpRate;
    const target = isActive ? activeColor : faintColor;
    matRef.current.color.lerp(target, lerpRate);

    // Perpetual dash flow (DESIGN.md: "active hyperspace lane has a slow
    // flowing dash, 4s linear loop"). Mutates the supported `dashOffset`
    // property on LineDashedMaterial (three r150+).
    if (!reduce && isActive) {
      const m = matRef.current as THREE.LineDashedMaterial & {
        dashOffset?: number;
      };
      m.dashOffset = (m.dashOffset ?? 0) - delta * 0.65;
    }
  });

  return <primitive object={lineObject} />;
}
