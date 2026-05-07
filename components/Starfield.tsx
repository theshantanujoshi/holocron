"use client";

import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

type Props = {
  count?: number;
  radius?: number;
  speed?: number;
};

export function Starfield({ count = 12000, radius = 600, speed = 0.0008 }: Props) {
  const meshRef = useRef<THREE.Points>(null);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const r = radius * Math.cbrt(Math.random());
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta) * 0.35;
      const z = r * Math.cos(phi);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      const tier = Math.random();
      const c = tier > 0.985 ? 1.0 : tier > 0.92 ? 0.78 : tier > 0.7 ? 0.55 : 0.34;
      const tint = Math.random() > 0.92 ? 0.85 : 1.0;

      colors[i * 3] = c * tint;
      colors[i * 3 + 1] = c;
      colors[i * 3 + 2] = c * (tint < 1 ? 0.95 : 1.05);

      sizes[i] = tier > 0.985 ? 2.4 : tier > 0.92 ? 1.6 : 1.0;
    }

    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geo.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
    return geo;
  }, [count, radius]);

  const material = useMemo(
    () =>
      new THREE.PointsMaterial({
        size: 1.2,
        sizeAttenuation: true,
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      }),
    []
  );

  const { gl } = useThree();
  const reduce = useMemo(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    []
  );

  useFrame((_, delta) => {
    if (!meshRef.current || reduce) return;
    meshRef.current.rotation.y += speed * (delta * 60);
    meshRef.current.rotation.x += speed * 0.3 * (delta * 60);
  });

  if (gl.capabilities.isWebGL2 === false) {
    return null;
  }

  return <points ref={meshRef} geometry={geometry} material={material} />;
}
