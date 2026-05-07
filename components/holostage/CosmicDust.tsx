"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

/**
 * <CosmicDust /> — ambient particle field for the holo-stage backdrop.
 *
 * Distinct from <Starfield /> in two ways:
 *   1. Local Brownian drift per particle (vs. one rigid rotation of the whole
 *      field). Particles wander on independent velocity vectors so the field
 *      feels alive at rest, not rotating-as-a-whole.
 *   2. A custom box-volume containment integrator. Each frame we add a small
 *      acceleration sampled from a hash-based pseudo-random source, integrate
 *      velocity → position, then softly pull particles back toward origin
 *      whenever they drift past the volume's half-extent. This avoids both
 *      hard wall-bouncing (which reads as bugs at this density) and the
 *      "everything explodes outward forever" failure mode.
 *
 * Rendering: a single `<points>` with additive blending. 4000 points × 3
 * floats × 32-bit = 48 KB position buffer; trivial for any laptop GPU. The
 * BufferAttribute is marked `needsUpdate` once per frame, but we skip the
 * GPU upload entirely under `prefers-reduced-motion: reduce`.
 *
 * Disposal: geometry, BufferAttributes, and material are all explicitly
 * disposed on unmount; the velocity buffer is plain CPU memory and is GC'd.
 */
type Props = {
  count?: number;
  /** Half-extent of the bounding box. Particles softly recenter past this. */
  bound?: number;
  /** Brownian acceleration scale. Higher = faster jitter. */
  agitation?: number;
};

export function CosmicDust({
  count = 4000,
  bound = 80,
  agitation = 0.12
}: Props) {
  const meshRef = useRef<THREE.Points>(null);
  const { gl } = useThree();

  const reduce = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    []
  );

  // CPU velocity buffer — same layout as positions (xyz × count) but lives on
  // the CPU side. We never upload velocities; only the integrated positions.
  const velocities = useMemo(() => new Float32Array(count * 3), [count]);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    // Hash-based seed so a build-time RNG isn't required and SSR is consistent
    // until the integrator advances. Values below come from cheap hash11.
    for (let i = 0; i < count; i++) {
      const seed = i * 17.31 + 3.7;
      const h1 = fract(Math.sin(seed) * 43758.5453);
      const h2 = fract(Math.sin(seed * 1.31 + 7.1) * 24634.6345);
      const h3 = fract(Math.sin(seed * 0.71 - 4.3) * 17631.1234);

      // Bias toward the center: cube root of uniform → roughly uniform within
      // the volume rather than clumped at the corners.
      const r = bound * Math.cbrt(h1 * 0.95 + 0.05);
      const theta = h2 * Math.PI * 2;
      const phi = Math.acos(2 * h3 - 1);

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta) * 0.7; // flattened
      const z = r * Math.cos(phi);

      positions[i * 3 + 0] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      // Color tier — 65% deep-blue dust, 25% cyan accent, 10% faint cream.
      const tier = fract(Math.sin(seed * 2.71) * 9871.3);
      let r0: number;
      let g0: number;
      let b0: number;
      if (tier > 0.90) {
        // cream highlight ≈ oklch(0.94 0.005 80)
        r0 = 0.94;
        g0 = 0.92;
        b0 = 0.86;
      } else if (tier > 0.65) {
        // accent cyan ≈ oklch(0.78 0.13 235)
        r0 = 0.40;
        g0 = 0.78;
        b0 = 1.00;
      } else {
        // deep cool dust ≈ oklch(0.46 0.04 240)
        r0 = 0.18;
        g0 = 0.30;
        b0 = 0.46;
      }
      // per-particle dimming so the field has visible depth
      const dim = 0.55 + 0.45 * fract(Math.sin(seed * 4.13) * 7723.7);
      colors[i * 3 + 0] = r0 * dim;
      colors[i * 3 + 1] = g0 * dim;
      colors[i * 3 + 2] = b0 * dim;

      sizes[i] = 0.6 + 1.4 * fract(Math.sin(seed * 5.91) * 12211.7);

      // tiny initial velocities so first-frame motion isn't purely additive
      velocities[i * 3 + 0] = (h1 - 0.5) * 0.04;
      velocities[i * 3 + 1] = (h2 - 0.5) * 0.04;
      velocities[i * 3 + 2] = (h3 - 0.5) * 0.04;
    }

    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geo.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
    return geo;
  }, [count, bound, velocities]);

  const material = useMemo(
    () =>
      new THREE.PointsMaterial({
        size: 1.1,
        sizeAttenuation: true,
        vertexColors: true,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      }),
    []
  );

  // Frame-counter for pseudo-random force sampling without an RNG.
  const tick = useRef(0);

  useFrame((_, delta) => {
    if (reduce) return;
    const m = meshRef.current;
    if (!m) return;
    const positionAttr = geometry.getAttribute("position") as THREE.BufferAttribute;
    const positions = positionAttr.array as Float32Array;

    // Clamp delta to avoid huge jumps after a tab is restored.
    const dt = Math.min(delta, 1 / 30);
    tick.current += 1;
    const t = tick.current * 0.013;

    const a = agitation;
    const halfBound = bound;
    const damping = Math.pow(0.985, dt * 60); // frame-rate independent

    for (let i = 0; i < count; i++) {
      const ix = i * 3;

      // Brownian acceleration: deterministic hashes of (i, tick). Cheap and
      // stable per particle so the motion has a recognizable signature
      // instead of pure white noise.
      const seed = i * 0.31731 + t;
      const ax = (fract(Math.sin(seed * 12.9898) * 43758.5453) - 0.5) * a;
      const ay = (fract(Math.sin(seed * 78.233) * 12345.678) - 0.5) * a;
      const az = (fract(Math.sin(seed * 39.346) * 23845.123) - 0.5) * a;

      let vx = velocities[ix + 0] ?? 0;
      let vy = velocities[ix + 1] ?? 0;
      let vz = velocities[ix + 2] ?? 0;

      vx = (vx + ax * dt) * damping;
      vy = (vy + ay * dt) * damping;
      vz = (vz + az * dt) * damping;

      let px = positions[ix + 0] ?? 0;
      let py = positions[ix + 1] ?? 0;
      let pz = positions[ix + 2] ?? 0;

      px += vx;
      py += vy;
      pz += vz;

      // Soft containment: anything past halfBound gets pulled back toward
      // origin proportional to the overshoot. Cheap, monotonic, no branches.
      const overX = Math.max(0, Math.abs(px) - halfBound);
      const overY = Math.max(0, Math.abs(py) - halfBound * 0.7);
      const overZ = Math.max(0, Math.abs(pz) - halfBound);
      const pull = 0.02;
      if (overX > 0) vx -= Math.sign(px) * overX * pull;
      if (overY > 0) vy -= Math.sign(py) * overY * pull;
      if (overZ > 0) vz -= Math.sign(pz) * overZ * pull;

      positions[ix + 0] = px;
      positions[ix + 1] = py;
      positions[ix + 2] = pz;
      velocities[ix + 0] = vx;
      velocities[ix + 1] = vy;
      velocities[ix + 2] = vz;
    }

    positionAttr.needsUpdate = true;
  });

  // Cleanup pattern: dispose geometry + its attributes + material on unmount.
  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  if (gl.capabilities.isWebGL2 === false) return null;

  return <points ref={meshRef} geometry={geometry} material={material} />;
}

/** GLSL-equivalent fract for CPU code. */
function fract(x: number): number {
  return x - Math.floor(x);
}
