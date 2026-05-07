"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

/**
 * <HyperspaceStreaks /> — long, thin elongated lines drifting across the
 * holo-stage backdrop. Each streak has its own lifecycle: spawn at random
 * position with random heading, fade in over ~1s, hold ~2–4s, fade out over
 * ~1s, then respawn.
 *
 * Implementation: rather than allocating a `THREE.Line2` per streak (heavy:
 * each one carries its own LineMaterial pipeline), we render N stretched
 * billboard quads as a single instanced mesh. Each instance carries its own
 * model matrix (set per-frame from CPU state) and a per-instance color/alpha.
 *
 * Cheap, GPU-efficient (1 draw call), and easy to control individual streak
 * intensity. Custom ShaderMaterial does the soft head/tail falloff so the
 * streaks read as light, not solid bars.
 *
 * Disposal: instanced geometry, its attributes, and the shader material are
 * all disposed on unmount.
 */
type Props = {
  count?: number;
  /** Spawn radius around origin. */
  radius?: number;
  /** Color hint — accent cyan by default. */
  color?: THREE.Color;
};

const STREAK_VERT = /* glsl */ `
  attribute vec3 instancePosition;
  attribute vec3 instanceDirection;
  attribute float instanceLength;
  attribute float instanceWidth;
  attribute float instanceAlpha;

  varying float vAlpha;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    vAlpha = instanceAlpha;

    // Build a basis where +X is along the streak direction and +Y is the
    // viewer-facing perpendicular. We use the camera's up to derive the
    // perpendicular so the streak always presents its width to the camera.
    vec3 dir = normalize(instanceDirection);
    vec3 toCamera = normalize(cameraPosition - instancePosition);
    vec3 perp = normalize(cross(dir, toCamera));
    if (length(perp) < 0.0001) {
      perp = vec3(0.0, 1.0, 0.0);
    }

    // Quad UV runs (-0.5..0.5, -0.5..0.5). Scale by length & width.
    float u = uv.x - 0.5;
    float v = uv.y - 0.5;

    vec3 worldPos =
      instancePosition +
      dir * (u * instanceLength) +
      perp * (v * instanceWidth);

    gl_Position = projectionMatrix * viewMatrix * vec4(worldPos, 1.0);
  }
`;

const STREAK_FRAG = /* glsl */ `
  precision highp float;

  uniform vec3 uColor;

  varying float vAlpha;
  varying vec2 vUv;

  void main() {
    // Long axis: bright in the middle, falls off at both ends. Use a smooth
    // hat function with a slight asymmetric bias so streaks read as motion-y.
    float along = vUv.x;
    float headTail = smoothstep(0.0, 0.18, along) * (1.0 - smoothstep(0.82, 1.0, along));

    // Cross axis: gaussian-ish lateral falloff for a soft glow edge.
    float lateral = vUv.y - 0.5;
    float cross = exp(-lateral * lateral * 26.0);

    float intensity = headTail * cross * vAlpha;
    if (intensity < 0.005) discard;

    gl_FragColor = vec4(uColor * intensity, intensity);
  }
`;

const DEFAULT_COLOR = new THREE.Color(0.62, 0.86, 1.0); // luminous accent cyan

export function HyperspaceStreaks({
  count = 12,
  radius = 70,
  color = DEFAULT_COLOR
}: Props) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { gl } = useThree();

  const reduce = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    []
  );

  // Per-streak CPU state. We keep this on the ref-side so re-renders never
  // touch GPU buffers directly.
  type StreakState = {
    px: number;
    py: number;
    pz: number;
    dx: number;
    dy: number;
    dz: number;
    length: number;
    width: number;
    age: number;       // seconds since spawn
    lifetime: number;  // total seconds before respawn
  };

  const streaks = useRef<StreakState[]>(
    Array.from({ length: count }, (_, i) => initStreak(i, radius, true))
  );

  // Geometry: instanced quad. Position attribute provides 4 vertices for the
  // billboard; per-instance attributes drive each streak's transform.
  const geometry = useMemo(() => {
    const geo = new THREE.InstancedBufferGeometry();
    // Underlying quad — 2 triangles, UVs (0..1, 0..1).
    const verts = new Float32Array([
      -0.5, -0.5, 0,
       0.5, -0.5, 0,
       0.5,  0.5, 0,
      -0.5,  0.5, 0
    ]);
    const uvs = new Float32Array([
      0, 0,
      1, 0,
      1, 1,
      0, 1
    ]);
    const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);
    geo.setAttribute("position", new THREE.BufferAttribute(verts, 3));
    geo.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
    geo.setIndex(new THREE.BufferAttribute(indices, 1));

    // Per-instance attributes — initialized from streaks ref.
    const instancePositions = new Float32Array(count * 3);
    const instanceDirections = new Float32Array(count * 3);
    const instanceLengths = new Float32Array(count);
    const instanceWidths = new Float32Array(count);
    const instanceAlphas = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const s = streaks.current[i];
      if (!s) continue;
      instancePositions[i * 3 + 0] = s.px;
      instancePositions[i * 3 + 1] = s.py;
      instancePositions[i * 3 + 2] = s.pz;
      instanceDirections[i * 3 + 0] = s.dx;
      instanceDirections[i * 3 + 1] = s.dy;
      instanceDirections[i * 3 + 2] = s.dz;
      instanceLengths[i] = s.length;
      instanceWidths[i] = s.width;
      instanceAlphas[i] = 0;
    }

    geo.setAttribute(
      "instancePosition",
      new THREE.InstancedBufferAttribute(instancePositions, 3)
    );
    geo.setAttribute(
      "instanceDirection",
      new THREE.InstancedBufferAttribute(instanceDirections, 3)
    );
    geo.setAttribute(
      "instanceLength",
      new THREE.InstancedBufferAttribute(instanceLengths, 1)
    );
    geo.setAttribute(
      "instanceWidth",
      new THREE.InstancedBufferAttribute(instanceWidths, 1)
    );
    geo.setAttribute(
      "instanceAlpha",
      new THREE.InstancedBufferAttribute(instanceAlphas, 1)
    );

    geo.instanceCount = count;
    return geo;
  }, [count]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: STREAK_VERT,
        fragmentShader: STREAK_FRAG,
        uniforms: {
          uColor: { value: color.clone() }
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      }),
    [color]
  );

  useFrame((_, delta) => {
    if (reduce) return;
    if (!meshRef.current) return;
    const dt = Math.min(delta, 1 / 30);

    const posAttr = geometry.getAttribute("instancePosition") as THREE.InstancedBufferAttribute;
    const dirAttr = geometry.getAttribute("instanceDirection") as THREE.InstancedBufferAttribute;
    const lenAttr = geometry.getAttribute("instanceLength") as THREE.InstancedBufferAttribute;
    const widAttr = geometry.getAttribute("instanceWidth") as THREE.InstancedBufferAttribute;
    const aAttr = geometry.getAttribute("instanceAlpha") as THREE.InstancedBufferAttribute;

    const positions = posAttr.array as Float32Array;
    const directions = dirAttr.array as Float32Array;
    const lengths = lenAttr.array as Float32Array;
    const widths = widAttr.array as Float32Array;
    const alphas = aAttr.array as Float32Array;

    let posChanged = false;
    let dirChanged = false;

    for (let i = 0; i < count; i++) {
      const s = streaks.current[i];
      if (!s) continue;
      s.age += dt;

      // Slow drift along direction — adds parallax life, not actual hyperspace
      // velocity (we want the streaks legible, not whoosh-fast).
      const drift = 1.4 * dt;
      s.px += s.dx * drift;
      s.py += s.dy * drift;
      s.pz += s.dz * drift;

      // Lifecycle envelope: fade-in (0..1s) → hold → fade-out (last 1s).
      const lifeRemaining = s.lifetime - s.age;
      let env = 1;
      if (s.age < 1) env = s.age;
      else if (lifeRemaining < 1) env = Math.max(0, lifeRemaining);

      alphas[i] = Math.max(0, env * 0.55);

      positions[i * 3 + 0] = s.px;
      positions[i * 3 + 1] = s.py;
      positions[i * 3 + 2] = s.pz;
      lengths[i] = s.length;
      widths[i] = s.width;
      posChanged = true;

      // Respawn when life is exhausted.
      if (s.age >= s.lifetime) {
        const next = initStreak(i + Math.floor(s.age * 100), radius, false);
        streaks.current[i] = next;
        directions[i * 3 + 0] = next.dx;
        directions[i * 3 + 1] = next.dy;
        directions[i * 3 + 2] = next.dz;
        dirChanged = true;
      }
    }

    if (posChanged) {
      posAttr.needsUpdate = true;
      lenAttr.needsUpdate = true;
      widAttr.needsUpdate = true;
      aAttr.needsUpdate = true;
    }
    if (dirChanged) dirAttr.needsUpdate = true;
  });

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  if (gl.capabilities.isWebGL2 === false) return null;

  return <mesh ref={meshRef} geometry={geometry} material={material} frustumCulled={false} />;
}

/** Build a fresh streak. `initial=true` randomizes age inside lifetime so the
 *  field looks populated from frame 1 instead of fading in en masse. */
function initStreak(seedHint: number, radius: number, initial: boolean): {
  px: number;
  py: number;
  pz: number;
  dx: number;
  dy: number;
  dz: number;
  length: number;
  width: number;
  age: number;
  lifetime: number;
} {
  const seed = seedHint * 0.137 + 1.31;
  const h = (n: number) => fract(Math.sin(seed * n) * 43758.5453);

  // Random spawn within an annulus around origin so streaks aren't all on top
  // of the figure; bias slightly out from center.
  const r = radius * (0.4 + h(11.2) * 0.7);
  const theta = h(13.9) * Math.PI * 2;
  const px = r * Math.cos(theta);
  const py = (h(7.3) - 0.5) * radius * 0.9;
  const pz = r * Math.sin(theta);

  // Direction: tangential drift, slight inward/outward bias.
  const tx = -Math.sin(theta);
  const tz = Math.cos(theta);
  const swing = (h(4.7) - 0.5) * 0.6;
  const dx = tx + swing * Math.cos(theta);
  const dy = (h(2.1) - 0.5) * 0.2;
  const dz = tz + swing * Math.sin(theta);
  const dnorm = Math.hypot(dx, dy, dz) || 1;

  const lifetime = 3 + h(19.7) * 3; // 3..6s
  const age = initial ? h(23.1) * lifetime : 0;

  return {
    px,
    py,
    pz,
    dx: dx / dnorm,
    dy: dy / dnorm,
    dz: dz / dnorm,
    length: 22 + h(31.7) * 26, // long
    width: 0.32 + h(37.1) * 0.24, // thin
    age,
    lifetime
  };
}

function fract(x: number): number {
  return x - Math.floor(x);
}
