"use client";

import { useMemo } from "react";
import * as THREE from "three";

type Props = {
  size?: number;
  divisions?: number;
};

export function SectorGrid({ size = 600, divisions = 16 }: Props) {
  const geometry = useMemo(() => {
    const positions: number[] = [];
    const half = size / 2;
    const step = size / divisions;

    for (let i = 0; i <= divisions; i++) {
      const v = -half + i * step;
      positions.push(-half, 0, v, half, 0, v);
      positions.push(v, 0, -half, v, 0, half);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    return geo;
  }, [size, divisions]);

  const material = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: 0x5fbfff,
        transparent: true,
        opacity: 0.06
      }),
    []
  );

  return <lineSegments geometry={geometry} material={material} />;
}
