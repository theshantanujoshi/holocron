"use client";

import { useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import type { PlacedPlanet } from "@/lib/data/positions";
import type { Entity } from "@/lib/schema";
import { useSelection } from "@/lib/store";

type Props = {
  planet: PlacedPlanet;
  entity?: Entity;
  era: number;
  showLabel?: boolean;
};

/**
 * Variant of <Planet> that fades opacity based on the global era scrubber.
 * A planet is "present" when its entity.era.firstAppearance is unknown
 * (always-on) or when era >= firstAppearance. The transition between
 * present/absent eases over ~400ms via a useFrame opacity lerp.
 *
 * Click → cross-pivot select(planet.id, "planet"), identical to
 * components/galaxy/Planet.tsx.
 *
 * Reduced motion respect: the lerp still runs, but at <300ms the change
 * appears effectively instant; the global @media (prefers-reduced-motion)
 * rule in globals.css does not apply to GL state, so we keep the
 * implementation simple. Visibility correctness is what matters for users
 * with reduced motion preferences.
 */
export function EraPlanet({ planet, entity, era, showLabel = true }: Props) {
  const ref = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshBasicMaterial | null>(null);
  const haloRef = useRef<THREE.MeshBasicMaterial | null>(null);
  const [hovered, setHovered] = useState(false);
  const select = useSelection((s) => s.select);
  const selectedId = useSelection((s) => s.entityId);
  const isSelected = selectedId === planet.id;

  const present = useMemo(() => {
    const fa = entity?.era?.firstAppearance;
    if (fa === undefined || fa === null) return true;
    return era >= fa;
  }, [entity, era]);

  const baseColor = useMemo(() => hashColor(planet.id), [planet.id]);

  const material = useMemo(() => {
    const m = new THREE.MeshBasicMaterial({
      color: baseColor,
      transparent: true,
      opacity: present ? 0.95 : 0.0
    });
    matRef.current = m;
    return m;
  }, [baseColor, present]);

  const haloMaterial = useMemo(() => {
    const m = new THREE.MeshBasicMaterial({
      color: 0x5fbfff,
      transparent: true,
      opacity: 0.0
    });
    haloRef.current = m;
    return m;
  }, []);

  const targetOpacity = present ? 0.95 : 0.0;

  useFrame((_, delta) => {
    if (!ref.current) return;
    ref.current.rotation.y += delta * 0.18;
    // ~400ms opacity ease toward target. lerpRate=1-pow(0.001, delta) gives
    // an ease-out exponential at roughly the requested duration.
    if (matRef.current) {
      const lerpRate = 1 - Math.pow(0.0006, delta);
      matRef.current.opacity += (targetOpacity - matRef.current.opacity) * lerpRate;
    }
    if (haloRef.current) {
      const haloTarget = isSelected ? 0.45 : hovered ? 0.22 : 0;
      // Halo only if planet is present.
      const cap = present ? haloTarget : 0;
      const lerpRate = 1 - Math.pow(0.001, delta);
      haloRef.current.opacity += (cap - haloRef.current.opacity) * lerpRate;
    }
  });

  const [x, y, z] = planet.position;

  // When fully faded out, planets remain in the scene graph but become
  // non-interactive (pointer-events disabled by setting raycast to null
  // would also work; here we just guard the click handler).
  const handleClick = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    if (!present) return;
    select(planet.id, "planet");
  };

  return (
    <group position={[x, y, z]}>
      <mesh
        ref={ref}
        material={material}
        onPointerOver={(e) => {
          e.stopPropagation();
          if (!present) return;
          setHovered(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = "default";
        }}
        onClick={handleClick}
      >
        <sphereGeometry args={[planet.size, 24, 24]} />
      </mesh>
      <mesh material={haloMaterial}>
        <sphereGeometry args={[planet.size * 1.9, 16, 16]} />
      </mesh>

      {showLabel && present && (hovered || isSelected) && (
        <Html
          position={[0, planet.size * 1.5, 0]}
          center
          distanceFactor={48}
          style={{ pointerEvents: "none" }}
        >
          <div
            className="whitespace-nowrap font-mono text-2xs uppercase tracking-[0.18em]"
            style={{
              color: isSelected ? "oklch(0.94 0.005 80)" : "oklch(0.78 0.13 235)",
              textShadow: "0 1px 2px oklch(0.09 0.005 240 / 0.9)"
            }}
          >
            {planet.name}
          </div>
        </Html>
      )}
    </group>
  );
}

function hashColor(id: string): THREE.Color {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const hue = (h % 360) / 360;
  return new THREE.Color().setHSL(hue, 0.18, 0.7);
}
