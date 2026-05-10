"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Hyperlane, Coords3D } from "@/lib/schema";
import { SHIP_CLASSES, type ShipClass } from "@/lib/data/ship-classes";

/**
 * Ambient ship traffic on the hyperspace lane network.
 *
 * Renders small instanced cone glyphs that traverse each lane's polyline at
 * varied speeds, era-filtered by `ShipClass.activeFrom/activeTo`. The intent
 * is texture, not focus — the galaxy should feel inhabited without competing
 * with the planets, selection visuals, or active route overlay.
 *
 * Architecture
 * ────────────
 * Ships are bucketed by CSS-color variable (≤ 4 buckets in practice:
 * civilian cream, accent blue, alarm red, legends amber). Each bucket
 * renders a single THREE.InstancedMesh with one shared cone geometry; per-
 * frame we walk every active ship, advance its arc-length parameter `t`,
 * compute its world position by lerping along its lane's polyline, and
 * write the result into the instance matrix.
 *
 * Per-lane arc-length tables and segment lengths are precomputed once when
 * the lanes prop changes — the per-frame work is purely O(N) instances
 * with one cumulative-array binary scan each.
 *
 * Reduced motion
 * ──────────────
 * When `prefers-reduced-motion: reduce` is set, ships still exist but do
 * not animate. They are placed at deterministic, evenly-distributed
 * arc-length positions per lane and stay there.
 *
 * Disposal
 * ────────
 * The instanced meshes, geometry, and materials are owned by this
 * component and disposed in the cleanup of the effect that constructs
 * them — i.e. whenever the active ship-class set changes (era window
 * shifts) or the component unmounts.
 */

// ── tuning ────────────────────────────────────────────────────────────────

const SHIPS_PER_LANE_PER_CLASS = 8; // 6-12 range per spec
/** Three.js units per second at speedMul = 1. ~22 unit/s ≈ 1 lane crossing in
 *  10–60s depending on lane length. Visible movement without distraction. */
const BASE_SPEED_UPS = 22;
/** Cone geometry — small elongated glyph. */
const CONE_RADIUS = 0.08;
const CONE_HEIGHT = 0.5;
const CONE_RADIAL_SEGMENTS = 6;
/** Three.js cones point along +Y by default; we rotate to align with +Z so
 *  the lane-tangent quaternion below maps cleanly. */
const CONE_BASE_AXIS = new THREE.Vector3(0, 0, 1);
/** Cap on instances per material so a runaway era window can't blow past
 *  the budget (5 lanes × 12 ships × 5 active classes = 300 — well under). */
const MAX_INSTANCES_PER_BUCKET = 1024;

// ── types ─────────────────────────────────────────────────────────────────

type Props = {
  lanes: Hyperlane[];
  era: number;
};

type LaneRuntime = {
  lane: Hyperlane;
  /** Cumulative arc length at each waypoint; cumulative[0] = 0. */
  cumulative: number[];
  /** Total polyline length. */
  totalLength: number;
};

type Ship = {
  laneIndex: number;
  /** Normalised arc-length position in [0, 1). */
  t: number;
  /** Units per second along the lane. */
  speedUps: number;
};

type Bucket = {
  cssVar: ShipClass["colorVar"];
  ships: Ship[];
  mesh: THREE.InstancedMesh;
  geometry: THREE.ConeGeometry;
  material: THREE.MeshBasicMaterial;
};

// ── color resolution (mirrors ForcePulse pattern) ────────────────────────

function resolveCSSColorToThree(cssVar: string): THREE.Color {
  if (typeof document === "undefined") {
    // SSR fallback — fg-muted approximation. Never actually rendered:
    // ShipTraffic is "use client" and hidden until WebGL is available.
    return new THREE.Color("rgb(160, 162, 178)");
  }
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(cssVar)
    .trim();
  const probe = document.createElement("div");
  probe.style.color = raw;
  probe.style.display = "none";
  document.body.appendChild(probe);
  const computed = getComputedStyle(probe).color;
  document.body.removeChild(probe);
  const color = new THREE.Color();
  color.set(computed);
  return color;
}

// ── lane geometry helpers ────────────────────────────────────────────────

function buildLaneRuntime(lane: Hyperlane): LaneRuntime {
  const cumulative: number[] = [0];
  let total = 0;
  for (let i = 0; i < lane.path.length - 1; i++) {
    const a = lane.path[i];
    const b = lane.path[i + 1];
    if (!a || !b) {
      cumulative.push(total);
      continue;
    }
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dz = b.z - a.z;
    total += Math.sqrt(dx * dx + dy * dy + dz * dz);
    cumulative.push(total);
  }
  return { lane, cumulative, totalLength: total };
}

/** Resolve normalised arc-length t∈[0,1) to a world position + tangent. */
function sampleLane(
  runtime: LaneRuntime,
  t: number,
  outPos: THREE.Vector3,
  outTangent: THREE.Vector3
): void {
  const { lane, cumulative, totalLength } = runtime;
  if (totalLength <= 0 || lane.path.length < 2) {
    outPos.set(0, 0, 0);
    outTangent.set(0, 0, 1);
    return;
  }
  const target = totalLength * Math.max(0, Math.min(1, t));
  // Linear walk — segment count is tiny (< 10 per lane).
  for (let i = 0; i < lane.path.length - 1; i++) {
    const segStart = cumulative[i] ?? 0;
    const segEnd = cumulative[i + 1] ?? segStart;
    // Skip degenerate (zero-length) segments — Corellian Trade Spine has a
    // duplicate first waypoint, and using its zero tangent would produce a
    // garbage quaternion in setFromUnitVectors.
    if (segEnd - segStart < 1e-6 && i !== lane.path.length - 2) continue;
    if (target <= segEnd || i === lane.path.length - 2) {
      const a = lane.path[i];
      const b = lane.path[i + 1];
      if (!a || !b) {
        outPos.set(0, 0, 0);
        outTangent.set(0, 0, 1);
        return;
      }
      const segLen = Math.max(segEnd - segStart, 1e-6);
      const local = (target - segStart) / segLen;
      outPos.set(
        a.x + (b.x - a.x) * local,
        a.y + (b.y - a.y) * local,
        a.z + (b.z - a.z) * local
      );
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dz = b.z - a.z;
      const mag = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (mag < 1e-6) {
        outTangent.set(0, 0, 1);
      } else {
        outTangent.set(dx / mag, dy / mag, dz / mag);
      }
      return;
    }
  }
  // Should be unreachable given the loop above.
  const last = lane.path[lane.path.length - 1] as Coords3D;
  outPos.set(last.x, last.y, last.z);
  outTangent.set(0, 0, 1);
}

// ── component ────────────────────────────────────────────────────────────

export function ShipTraffic({ lanes, era }: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const bucketsRef = useRef<Bucket[]>([]);

  const reduceMotion = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    []
  );

  // Lane runtimes only depend on the lanes prop, not the era.
  const laneRuntimes = useMemo(() => lanes.map(buildLaneRuntime), [lanes]);

  // Active ship classes for the current era. Memoize the *signature* (set of
  // ids) so we don't tear down and rebuild buckets every frame the user
  // scrubs within the same window.
  const activeClasses = useMemo(
    () => SHIP_CLASSES.filter((c) => era >= c.activeFrom && era <= c.activeTo),
    [era]
  );
  const activeClassesKey = useMemo(
    () => activeClasses.map((c) => c.id).join("|"),
    [activeClasses]
  );

  // Build / rebuild buckets whenever the active class set or lanes change.
  // The cleanup disposes everything we created — this is the single
  // disposal site.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const group = groupRef.current;
    if (!group || laneRuntimes.length === 0 || activeClasses.length === 0) {
      return;
    }

    // Bucket ship classes by css-var (so each bucket = one InstancedMesh).
    const byColor = new Map<ShipClass["colorVar"], ShipClass[]>();
    for (const cls of activeClasses) {
      const list = byColor.get(cls.colorVar) ?? [];
      list.push(cls);
      byColor.set(cls.colorVar, list);
    }

    const newBuckets: Bucket[] = [];
    for (const [cssVar, classes] of byColor.entries()) {
      const ships: Ship[] = [];
      for (const cls of classes) {
        for (let laneIndex = 0; laneIndex < laneRuntimes.length; laneIndex++) {
          const runtime = laneRuntimes[laneIndex];
          if (!runtime || runtime.totalLength <= 0) continue;
          for (let i = 0; i < SHIPS_PER_LANE_PER_CLASS; i++) {
            // Deterministic-ish initial spread: each ship gets a unique t
            // so they never start clustered. Random jitter makes the
            // pattern feel organic without being floaty.
            const t = (i / SHIPS_PER_LANE_PER_CLASS + Math.random() * 0.05) % 1;
            ships.push({
              laneIndex,
              t,
              speedUps: BASE_SPEED_UPS * cls.speedMul
            });
          }
        }
      }
      if (ships.length === 0) continue;

      const count = Math.min(ships.length, MAX_INSTANCES_PER_BUCKET);
      const geometry = new THREE.ConeGeometry(
        CONE_RADIUS,
        CONE_HEIGHT,
        CONE_RADIAL_SEGMENTS
      );
      // Default cone points along +Y; rotate the geometry so the apex
      // points along +Z. Then we can orient each instance by aligning
      // CONE_BASE_AXIS with the lane tangent.
      geometry.rotateX(Math.PI / 2);

      const color = resolveCSSColorToThree(cssVar);
      const material = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.78,
        depthWrite: false
      });

      const mesh = new THREE.InstancedMesh(geometry, material, count);
      mesh.frustumCulled = false; // ships span the whole sector; cheaper to skip
      mesh.renderOrder = 4; // beneath active route (renderOrder 5–6), above grid
      group.add(mesh);

      newBuckets.push({
        cssVar,
        ships: ships.slice(0, count),
        mesh,
        geometry,
        material
      });
    }

    bucketsRef.current = newBuckets;

    return () => {
      for (const b of newBuckets) {
        group.remove(b.mesh);
        b.mesh.dispose();
        b.geometry.dispose();
        b.material.dispose();
      }
      bucketsRef.current = [];
    };
    // We intentionally key on the activeClassesKey signature, not the
    // activeClasses array itself, so era changes within the same window
    // don't rebuild instance buffers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeClassesKey, laneRuntimes]);

  // ── per-frame integrator ──────────────────────────────────────────────
  // Reused scratch objects: one allocation, mutated each frame across all
  // ships. R3F best practice — never new() inside useFrame.
  const tmpPos = useMemo(() => new THREE.Vector3(), []);
  const tmpTangent = useMemo(() => new THREE.Vector3(), []);
  const tmpQuat = useMemo(() => new THREE.Quaternion(), []);
  const tmpScale = useMemo(() => new THREE.Vector3(1, 1, 1), []);
  const tmpMatrix = useMemo(() => new THREE.Matrix4(), []);

  // Initial static placement for reduced-motion case (and first frame in
  // animated case). Drains an InstancedMesh's needsUpdate flag once when
  // buckets are rebuilt.
  useEffect(() => {
    const buckets = bucketsRef.current;
    if (buckets.length === 0) return;
    for (const bucket of buckets) {
      writeBucketMatrices(bucket, laneRuntimes, tmpPos, tmpTangent, tmpQuat, tmpScale, tmpMatrix);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeClassesKey, laneRuntimes]);

  useFrame((_, deltaRaw) => {
    if (reduceMotion) return;
    const buckets = bucketsRef.current;
    if (buckets.length === 0) return;
    // Clamp delta — if the tab was backgrounded, a giant delta would
    // teleport every ship and look like a glitch on resume.
    const delta = Math.min(deltaRaw, 0.1);
    for (const bucket of buckets) {
      for (const ship of bucket.ships) {
        const runtime = laneRuntimes[ship.laneIndex];
        if (!runtime || runtime.totalLength <= 0) continue;
        ship.t += (ship.speedUps * delta) / runtime.totalLength;
        if (ship.t >= 1) ship.t -= Math.floor(ship.t); // wrap to [0,1)
        if (ship.t < 0) ship.t += 1;
      }
      writeBucketMatrices(bucket, laneRuntimes, tmpPos, tmpTangent, tmpQuat, tmpScale, tmpMatrix);
    }
  });

  return <group ref={groupRef} renderOrder={4} />;
}

/**
 * Walk every ship in a bucket, sample its lane, compose a TRS matrix from
 * (position, lane-tangent quaternion, unit scale), and stamp it into the
 * instance matrix buffer. Marks the InstancedMesh as needing a GPU upload
 * for the next frame.
 */
function writeBucketMatrices(
  bucket: Bucket,
  laneRuntimes: LaneRuntime[],
  tmpPos: THREE.Vector3,
  tmpTangent: THREE.Vector3,
  tmpQuat: THREE.Quaternion,
  tmpScale: THREE.Vector3,
  tmpMatrix: THREE.Matrix4
): void {
  for (let i = 0; i < bucket.ships.length; i++) {
    const ship = bucket.ships[i];
    if (!ship) continue;
    const runtime = laneRuntimes[ship.laneIndex];
    if (!runtime) continue;
    sampleLane(runtime, ship.t, tmpPos, tmpTangent);
    tmpQuat.setFromUnitVectors(CONE_BASE_AXIS, tmpTangent);
    tmpMatrix.compose(tmpPos, tmpQuat, tmpScale);
    bucket.mesh.setMatrixAt(i, tmpMatrix);
  }
  bucket.mesh.instanceMatrix.needsUpdate = true;
}
