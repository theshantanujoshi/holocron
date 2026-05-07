"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { motion, AnimatePresence } from "motion/react";
import * as THREE from "three";
import type { Entity } from "@/lib/schema";
import { formatYear } from "@/lib/utils";

type Props = {
  entity: Entity | null;
  anchorPosition: [number, number, number] | null;
  entities: Entity[];
  scale?: number;
};

const HOLOCARD_SPRING = { type: "spring", stiffness: 240, damping: 28 } as const;
const HOLOCARD_EXIT = { duration: 0.22, ease: [0.16, 1, 0.3, 1] as const } as const;

// Vertical offset above the anchor point, in world units.
const ANCHOR_Y_OFFSET = 6;

// Bound the parallax tilt so the card never feels detached from its anchor.
const TILT_MAX_DEG = 8;

/**
 * Holocard — a Star-Wars-holographic info panel rendered in 3D space next to
 * a selected entity. Distinct from the 2D Datapad: this surfaces only key
 * facts (name, type, era, top 3 relations) with strong visual flair —
 * scanline shader, animated holographic tape, and parallax tilt as the
 * camera orbits.
 *
 * Renders nothing when entity or anchorPosition is null. Mount/unmount
 * fades and per-entity fades use Motion's AnimatePresence inside the
 * drei `<Html>` portal (which lives in real DOM, so exit animations work).
 */
export function Holocard({ entity, anchorPosition, entities, scale = 1 }: Props) {
  // We only render the R3F group while we have *something* to anchor to.
  // Per-entity fades happen inside the group via AnimatePresence keyed on
  // entity id, so swapping selection animates without remounting <Html>.
  if (!entity || !anchorPosition) return null;

  const [ax, ay, az] = anchorPosition;

  return (
    <group position={[ax, ay + ANCHOR_Y_OFFSET, az]}>
      <Html
        transform
        distanceFactor={32}
        center
        // Don't block clicks on planets behind/around the card by default;
        // the inner motion.div re-enables pointer events on the card itself.
        style={{ pointerEvents: "none" }}
        wrapperClass="holocard-wrapper"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={entity.id}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale, transition: HOLOCARD_SPRING }}
            exit={{ opacity: 0, scale: 0.92, transition: HOLOCARD_EXIT }}
            // Outer wrapper carries fade/scale; the inner card div carries
            // parallax tilt (so the two transforms don't fight).
            style={{ pointerEvents: "auto", willChange: "transform, opacity" }}
          >
            <HolocardCard entity={entity} entities={entities} />
          </motion.div>
        </AnimatePresence>
      </Html>
    </group>
  );
}

function HolocardCard({ entity, entities }: { entity: Entity; entities: Entity[] }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { camera } = useThree();
  const reduced = usePrefersReducedMotion();

  const entityMap = useMemo(() => {
    const m = new Map<string, Entity>();
    for (const e of entities) m.set(e.id, e);
    return m;
  }, [entities]);

  // Parallax tilt: project the camera onto the card's local axes and convert
  // azimuth/elevation to small CSS rotateY/rotateX values, bounded to
  // ±TILT_MAX_DEG so the card never looks unmoored from its anchor.
  useEffect(() => {
    if (reduced) return;
    const node = cardRef.current;
    if (!node) return;

    let raf = 0;
    const tmp = new THREE.Vector3();

    const tick = () => {
      camera.getWorldPosition(tmp);
      // Normalized heading from world origin toward camera. The card lives
      // in 3D space; using the camera's world direction gives a usable
      // proxy for "where is the viewer relative to the card's facing".
      const len = Math.hypot(tmp.x, tmp.y, tmp.z) || 1;
      const dx = tmp.x / len;
      const dy = tmp.y / len;
      const dz = tmp.z / len;
      // Math: az = atan2(dx,dz)·180/π → ±180; el = asin(dy)·180/π → ±90.
      const azimuth = Math.atan2(dx, dz) * (180 / Math.PI);
      const elevation = Math.asin(dy) * (180 / Math.PI);
      // Map full ±180° / ±90° into ±TILT_MAX_DEG. The ×2 keeps small camera
      // moves visible without exceeding the cap (clamp does the bounding).
      const ry = clamp((azimuth / 180) * TILT_MAX_DEG * 2, -TILT_MAX_DEG, TILT_MAX_DEG);
      const rx = clamp((-elevation / 90) * TILT_MAX_DEG * 2, -TILT_MAX_DEG, TILT_MAX_DEG);

      node.style.transform = `perspective(800px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [camera, reduced]);

  const topRelations = useMemo(() => entity.relations.slice(0, 3), [entity.relations]);

  const eraLine = useMemo(() => formatEra(entity), [entity]);

  return (
    <div
      ref={cardRef}
      className="scanline relative w-[280px] overflow-hidden rounded-2xl border border-border-line bg-bg-overlay/85 backdrop-blur-md"
      style={{
        // The transform property is mutated each frame by the parallax tick;
        // declare here so initial paint is identity.
        transform: "perspective(800px) rotateX(0deg) rotateY(0deg)",
        transformStyle: "preserve-3d",
        boxShadow: "0 0 0 1px oklch(0.30 0.05 235 / 0.18) inset"
      }}
      role="dialog"
      aria-label={`Holocard for ${entity.name}`}
    >
      <HolocardKeyframes />
      <HolographicTape position="top" />
      <HolographicTape position="bottom" delay="-2s" />

      <div className="flex flex-col gap-3 px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <span className="font-mono text-2xs uppercase tracking-[0.18em] text-fg-dim">
            {entity.type}
          </span>
          <CanonicityChip canonicity={entity.canonicity} />
        </div>

        <h3 className="text-2xl font-medium tracking-tight text-fg-strong">{entity.name}</h3>

        {eraLine && (
          <p className="font-mono text-2xs uppercase tracking-[0.16em] text-fg-muted">
            {eraLine}
          </p>
        )}

        {topRelations.length > 0 && (
          <ul className="flex flex-col divide-y divide-border-faint/60">
            {topRelations.map((r, i) => {
              const target = entityMap.get(r.target);
              return (
                <li
                  key={`${r.kind}-${r.target}-${i}`}
                  className="flex items-center justify-between gap-3 py-1.5"
                >
                  <span className="font-mono text-2xs uppercase tracking-[0.14em] text-fg-dim">
                    {r.kind.replace(/_/g, " ")}
                  </span>
                  <span className="truncate text-right text-sm text-fg-primary">
                    {target?.name ?? r.target}
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        <p className="border-t border-border-faint/60 pt-2 font-mono text-2xs uppercase tracking-[0.16em] text-fg-dim">
          press D to open datapad
        </p>
      </div>
    </div>
  );
}

function CanonicityChip({ canonicity }: { canonicity: Entity["canonicity"] }) {
  const label = canonicity === "both" ? "canon · legends" : canonicity;
  const tone =
    canonicity === "canon"
      ? "text-canon"
      : canonicity === "legends"
      ? "text-legends"
      : "text-fg-muted";
  const glyph = canonicity === "legends" ? "text-legends-glyph" : "text-canon-glyph";
  return (
    <span className={`${glyph} font-mono text-2xs uppercase tracking-[0.16em] ${tone}`}>
      {label}
    </span>
  );
}

/**
 * 2px-tall accent-blue gradient line that sweeps across the top or bottom
 * edge of the card on a 4s linear loop. Pure CSS — a sliding gradient
 * `background-position` is masked by the line itself, giving the
 * Star-Wars holographic-projection-tape look.
 *
 * Reduced motion: handled by the project-wide CSS rule in globals.css
 * which collapses every animation to ~0ms, freezing the gradient at
 * its initial frame.
 */
function HolographicTape({
  position,
  delay = "0s"
}: {
  position: "top" | "bottom";
  delay?: string;
}) {
  const style: CSSProperties = {
    [position]: 0,
    background:
      "linear-gradient(90deg, transparent 0%, oklch(0.78 0.13 235 / 0) 25%, oklch(0.84 0.14 235 / 0.9) 50%, oklch(0.78 0.13 235 / 0) 75%, transparent 100%)",
    backgroundSize: "200% 100%",
    animation: `holocard-tape 4s linear infinite ${delay}`,
    opacity: 0.85
  };
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute left-0 right-0 h-[2px]"
      style={style}
    />
  );
}

/**
 * Keyframes are inlined so this component is self-contained — no edit to
 * globals.css required. The browser deduplicates identical inline rules,
 * so multiple Holocards on screen don't pile up styles.
 */
function HolocardKeyframes() {
  return (
    <style>{`
      @keyframes holocard-tape {
        0%   { background-position: -100% 0; }
        100% { background-position: 200% 0; }
      }
    `}</style>
  );
}

function formatEra(entity: Entity): string | null {
  const era = entity.era;
  if (!era) return null;
  const parts: string[] = [];
  if (era.birthYear != null) parts.push(`born ${formatYear(era.birthYear)}`);
  if (era.deathYear != null) parts.push(`died ${formatYear(era.deathYear)}`);
  if (parts.length === 0 && era.firstAppearance != null) {
    parts.push(
      entity.type === "film"
        ? `first ${era.firstAppearance}`
        : `first ${formatYear(era.firstAppearance)}`
    );
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}
