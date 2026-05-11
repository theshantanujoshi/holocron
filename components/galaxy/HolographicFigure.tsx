"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Entity } from "@/lib/schema";
import type { LineageGraph } from "@/lib/data/loadLineage";
import { sideAtEra } from "@/lib/data/force-transitions";
import { fragmentShader, vertexShader } from "./HolographicFigure.shaders";

/**
 * <HolographicFigure /> — a stylized 3D figure rendered with a custom
 * holographic shader. The canonical "Help me Obi-Wan Kenobi" aesthetic:
 * scanlines, fresnel rim glow, slow rotation, occasional flicker, additive
 * blending. Procedural geometry only, no copyrighted assets.
 *
 * Body composition:
 *   - Projector base ring (torus) at y = -2.5
 *   - Faint vertical projection cone from base to head
 *   - Body (capsule) for non-droids, dome+antenna for droids
 *   - Head (sphere or droid dome)
 *   - Lightsaber blade for Force users (jedi blue / sith red)
 *
 * Props:
 *   entity     — the person Entity to render (drives droid/Force detection)
 *   position   — world-space anchor; default origin
 *   scale      — uniform scale factor; default 1
 *   intensity  — 0..1 fade-in opacity multiplier; default 1
 *   side       — explicit override for jedi/sith/civilian classification
 *   lineage    — optional lineage graph to auto-classify when `side` is omitted
 *
 * Note on figure scale: SWAPI exposes per-person height, but the project's
 * Entity schema does not currently carry that field. v1 uses a fixed
 * silhouette and trusts the caller's `scale` prop. Driving a per-character
 * height multiplier from SWAPI is a P2 follow-up — see `lib/schema.ts` Entity
 * to extend with `traits.height`.
 */
type Side = "jedi" | "sith" | "civilian";

type Props = {
  entity: Entity;
  position?: [number, number, number];
  scale?: number;
  intensity?: number;
  side?: Side;
  lineage?: LineageGraph;
  /** Current era year (BBY = negative, ABY = positive). When provided, the
   *  era-aware transition table is consulted before the BFS classifier. */
  era?: number;
};

// Holo-blue accent for Jedi / civilians: oklch(0.78 0.13 235) ≈ a luminous
// cyan. Three.js Color can't parse oklch directly, so we encode the visual
// equivalent in linear RGB. These match the design tokens by eye, not by
// roundtrip — close enough for an emissive shader.
const COLOR_HOLO_BLUE = new THREE.Color(0.40, 0.78, 1.0);
// Sith red ≈ oklch(0.64 0.18 25)
const COLOR_SITH_RED = new THREE.Color(1.0, 0.30, 0.28);
// Saber blade cores stay almost white; the fresnel does the coloring.
const COLOR_BLADE_BLUE = new THREE.Color(0.78, 0.92, 1.0);
const COLOR_BLADE_RED = new THREE.Color(1.0, 0.65, 0.62);

/** SWAPI species id used in `member_of` relations to flag droids. */
const DROID_SPECIES_TARGET = "species/2";

function isDroid(entity: Entity): boolean {
  return entity.relations.some(
    (r) => r.kind === "member_of" && r.target === DROID_SPECIES_TARGET
  );
}

const SITH_ORIGINS = new Set<string>([
  "person/darth-bane",
  "person/darth-plagueis",
  "person/darth-revan"
]);

/**
 * Lineage-derived classification, mirroring `LineageView.classify` semantics:
 *   sith     — descendant in the master_of chain from a Sith origin, or
 *              explicit faction === "sith_order"
 *   jedi     — explicit jedi_order, or untagged but appears in any master_of
 *              edge that didn't resolve to Sith
 *   civilian — everyone else
 *
 * Kept inline (not imported) so this component doesn't depend on the lineage
 * view's render code. If no graph is passed, we fall back to civilian.
 */
function classifyFromLineage(entity: Entity, graph: LineageGraph): Side {
  // BFS the Sith descent set the same way LineageView does.
  const sith = new Set<string>();
  for (const n of graph.nodes) {
    if (n.faction === "sith_order") sith.add(n.id);
    if (SITH_ORIGINS.has(n.id)) sith.add(n.id);
  }
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
  if (sith.has(entity.id)) return "sith";

  const node = graph.nodes.find((n) => n.id === entity.id);
  if (node?.faction === "jedi_order") return "jedi";

  const inMaster = new Set<string>();
  for (const e of graph.edges) {
    if (e.kind !== "master_of") continue;
    inMaster.add(e.source);
    inMaster.add(e.target);
  }
  if (inMaster.has(entity.id)) return "jedi";
  return "civilian";
}

function resolveSide(
  entity: Entity,
  override: Side | undefined,
  graph: LineageGraph | undefined,
  era: number | undefined
): Side {
  if (override) return override;
  // Era-aware lookup takes precedence over the BFS classifier when the person
  // has known transition data.
  if (era !== undefined) {
    const eraResolved = sideAtEra(entity.id, era);
    if (eraResolved !== null) return eraResolved;
  }
  if (graph) return classifyFromLineage(entity, graph);
  return "civilian";
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function HolographicFigure({
  entity,
  position = [0, 0, 0],
  scale = 1,
  intensity = 1,
  side,
  lineage,
  era
}: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  const droid = useMemo(() => isDroid(entity), [entity]);
  const resolvedSide = useMemo(
    () => resolveSide(entity, side, lineage, era),
    [entity, side, lineage, era]
  );
  const isForceUser = resolvedSide === "jedi" || resolvedSide === "sith";

  const baseColor =
    resolvedSide === "sith" ? COLOR_SITH_RED : COLOR_HOLO_BLUE;
  const bladeColor =
    resolvedSide === "sith" ? COLOR_BLADE_RED : COLOR_BLADE_BLUE;

  // Per-instance flicker phase so two figures never blink in unison.
  const flickerSeed = useMemo(() => {
    let h = 0;
    for (let i = 0; i < entity.id.length; i++) {
      h = (h * 31 + entity.id.charCodeAt(i)) >>> 0;
    }
    return (h % 1000) / 1000;
  }, [entity.id]);

  // Single ShaderMaterial shared by every body part. Memoized so the GPU
  // program is compiled once per entity, and disposed on unmount.
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: baseColor.clone() },
        uOpacity: { value: intensity },
        uFlickerSeed: { value: flickerSeed }
      },
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
  }, [baseColor, flickerSeed, intensity]);

  // Saber gets its own material so its color tracks the side independently
  // (and so flicker phase can be slightly offset for a "live blade" feel).
  const bladeMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: bladeColor.clone() },
        uOpacity: { value: intensity },
        uFlickerSeed: { value: (flickerSeed + 0.37) % 1 }
      },
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
  }, [bladeColor, flickerSeed, intensity]);

  // Update opacity uniform when the prop changes without rebuilding material.
  useEffect(() => {
    const u = material.uniforms.uOpacity;
    if (u) u.value = intensity;
    const ub = bladeMaterial.uniforms.uOpacity;
    if (ub) ub.value = intensity;
  }, [intensity, material, bladeMaterial]);

  // Cleanup: dispose materials when the component unmounts. Geometries are
  // owned by the JSX-mounted meshes and disposed by R3F automatically.
  useEffect(() => {
    return () => {
      material.dispose();
      bladeMaterial.dispose();
    };
  }, [material, bladeMaterial]);

  const reduce = useMemo(() => prefersReducedMotion(), []);

  useFrame((_, delta) => {
    if (reduce) return;
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.2;
    }
    const tUniform = material.uniforms.uTime;
    if (tUniform) tUniform.value += delta;
    const tBlade = bladeMaterial.uniforms.uTime;
    if (tBlade) tBlade.value += delta;
    if (ringRef.current) {
      const pulse = 1 + Math.sin(tUniform ? tUniform.value * 1.4 : 0) * 0.04;
      ringRef.current.scale.setScalar(pulse);
    }
  });

  return (
    <group position={position} scale={scale}>
      {/* Y-rotation lives on an inner group so the projector base ring and
          beam stay anchored to the world while the figure itself rotates. */}
      <mesh
        ref={ringRef}
        material={material}
        position={[0, -2.5, 0]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <torusGeometry args={[1.2, 0.05, 12, 64]} />
      </mesh>

      {/* Faint projection beam — wide cone from the ring up to head height.
          DoubleSide + additive makes it read as volumetric light, not a wall. */}
      <mesh
        material={material}
        position={[0, -0.55, 0]}
        rotation={[Math.PI, 0, 0]}
      >
        <coneGeometry args={[1.05, 3.9, 32, 1, true]} />
      </mesh>

      <group ref={groupRef}>
        {droid ? (
          <DroidBody material={material} />
        ) : (
          <HumanoidBody
            material={material}
            isForceUser={isForceUser}
            bladeMaterial={bladeMaterial}
          />
        )}
      </group>
    </group>
  );
}

function HumanoidBody({
  material,
  isForceUser,
  bladeMaterial
}: {
  material: THREE.Material;
  isForceUser: boolean;
  bladeMaterial: THREE.Material;
}) {
  return (
    <>
      {/* Body — tapered cylinder, wider at the shoulders.
          radiusTop, radiusBottom, height, radialSegments */}
      <mesh material={material} position={[0, -0.6, 0]}>
        <cylinderGeometry args={[0.55, 0.30, 2.4, 24, 1, true]} />
      </mesh>

      {/* Shoulder cap — small sphere that closes off the cylinder top so the
          silhouette doesn't read as a hollow tube edge-on. */}
      <mesh material={material} position={[0, 0.55, 0]}>
        <sphereGeometry args={[0.55, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>

      {/* Head */}
      <mesh material={material} position={[0, 1.0, 0]}>
        <sphereGeometry args={[0.5, 28, 24]} />
      </mesh>

      {isForceUser && (
        <group position={[0.8, -0.5, 0]} rotation={[0, 0, -Math.PI / 5]}>
          {/* Hilt — short, tucked at the figure's hand */}
          <mesh material={material} position={[0, -0.85, 0]}>
            <cylinderGeometry args={[0.07, 0.07, 0.3, 12]} />
          </mesh>
          {/* Blade — longer cylinder; the additive shader carries the glow */}
          <mesh material={bladeMaterial} position={[0, 0.05, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 1.5, 16]} />
          </mesh>
        </group>
      )}
    </>
  );
}

function DroidBody({ material }: { material: THREE.Material }) {
  return (
    <>
      {/* Stubby body — proportions echo R-series astromechs without copying. */}
      <mesh material={material} position={[0, -0.4, 0]}>
        <cylinderGeometry args={[0.55, 0.55, 1.6, 24]} />
      </mesh>

      {/* Dome head */}
      <mesh material={material} position={[0, 0.7, 0]}>
        <sphereGeometry args={[0.55, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>

      {/* Antenna */}
      <mesh material={material} position={[0, 1.15, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.45, 8]} />
      </mesh>
    </>
  );
}
