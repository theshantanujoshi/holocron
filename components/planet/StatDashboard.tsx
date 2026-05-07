"use client";

import { motion, useReducedMotion, animate, useMotionValue, useTransform } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import type { Entity } from "@/lib/schema";
import { BIOME_PALETTES, classifyBiome, tokenizeWords, type ClimateBiome } from "./climate";

/**
 * <StatDashboard /> — a constellation of mini-readouts directly below the
 * planet hero. Every numeric stat counts up on mount over ~700ms with an
 * ease-out-quart curve. Reduced motion: numbers appear at their final value.
 *
 * Uses SVG primitives only — no chart library — so we can keep the visual
 * language consistent with the project's hand-drawn instrument aesthetic.
 *
 * Stats rendered (each gracefully omitted when its source field is absent):
 *   - Climate / terrain word chips with inline SVG biome glyphs
 *   - Gravity (1g reference axis)
 *   - Surface water (radial gauge)
 *   - Population (mono numeric, formatted with SI suffixes)
 *   - Day length / Year length
 *   - Diameter (km)
 */

type Props = {
  entity: Entity;
};

export function StatDashboard({ entity }: Props) {
  const physical = entity.physical;
  const climateLabel = physical?.climate ?? entity.short.split("·")[0]?.trim();
  const terrainLabel = physical?.terrain ?? entity.short.split("·")[1]?.trim();

  const biome = useMemo(() => classifyBiome(climateLabel, terrainLabel), [climateLabel, terrainLabel]);
  const palette = BIOME_PALETTES[biome];

  const climateWords = tokenizeWords(climateLabel);
  const terrainWords = tokenizeWords(terrainLabel);

  // Render even when there's no `physical` payload — at minimum we have
  // climate/terrain words from `short`. The card hides itself only when
  // truly nothing is available.
  const hasAnyContent =
    climateWords.length > 0 ||
    terrainWords.length > 0 ||
    physical?.gravity != null ||
    physical?.surfaceWater != null ||
    physical?.population != null ||
    physical?.diameter != null ||
    physical?.rotationHours != null ||
    physical?.orbitalDays != null;

  if (!hasAnyContent) return null;

  return (
    <section
      className="flex flex-col gap-4 border-t border-border-faint pt-5"
      aria-label="Planetary stats"
    >
      <span className="font-mono text-2xs uppercase tracking-[0.16em] text-fg-dim">
        Field Survey
      </span>

      {(climateWords.length > 0 || terrainWords.length > 0) && (
        <ChipRow climate={climateWords} terrain={terrainWords} biome={biome} />
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {physical?.gravity != null && (
          <GravityInstrument value={physical.gravity} accent={palette.core} />
        )}
        {physical?.surfaceWater != null && (
          <SurfaceWaterGauge percent={physical.surfaceWater} accent={palette.core} />
        )}
        {physical?.population != null && (
          <PopulationReadout value={physical.population} accent={palette.core} />
        )}
        {physical?.diameter != null && (
          <NumericReadout
            label="Diameter"
            value={physical.diameter}
            unit="km"
            decimals={0}
            accent={palette.core}
          />
        )}
        {physical?.rotationHours != null && (
          <NumericReadout
            label="Day length"
            value={physical.rotationHours}
            unit="std h"
            decimals={1}
            accent={palette.core}
          />
        )}
        {physical?.orbitalDays != null && (
          <NumericReadout
            label="Year length"
            value={physical.orbitalDays}
            unit="std d"
            decimals={0}
            accent={palette.core}
          />
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Inline biome glyphs — 16x16, stroke-only so they pick up `currentColor`.
// No emoji, no third-party icon for these specific terrain markers.
// ---------------------------------------------------------------------------
function BiomeGlyph({ biome, size = 14 }: { biome: ClimateBiome; size?: number }) {
  const sx = { width: size, height: size };
  const stroke = { stroke: "currentColor", strokeWidth: 1.25, fill: "none" } as const;
  switch (biome) {
    case "desert":
      return (
        <svg viewBox="0 0 16 16" style={sx} aria-hidden="true">
          <circle cx="8" cy="6" r="2.5" {...stroke} />
          {[0, 60, 120, 180, 240, 300].map((deg) => (
            <line
              key={deg}
              x1={8 + Math.cos((deg * Math.PI) / 180) * 4}
              y1={6 + Math.sin((deg * Math.PI) / 180) * 4}
              x2={8 + Math.cos((deg * Math.PI) / 180) * 5.5}
              y2={6 + Math.sin((deg * Math.PI) / 180) * 5.5}
              {...stroke}
            />
          ))}
          <path d="M2 13 q 3 -2 6 0 t 6 0" {...stroke} />
        </svg>
      );
    case "ice":
      return (
        <svg viewBox="0 0 16 16" style={sx} aria-hidden="true">
          {[0, 60, 120].map((deg) => (
            <line
              key={deg}
              x1={8 - Math.cos((deg * Math.PI) / 180) * 6}
              y1={8 - Math.sin((deg * Math.PI) / 180) * 6}
              x2={8 + Math.cos((deg * Math.PI) / 180) * 6}
              y2={8 + Math.sin((deg * Math.PI) / 180) * 6}
              {...stroke}
            />
          ))}
        </svg>
      );
    case "forest":
      return (
        <svg viewBox="0 0 16 16" style={sx} aria-hidden="true">
          <path d="M8 2 L4 7 L6 7 L3 11 L6 11 L8 14 L10 11 L13 11 L10 7 L12 7 Z" {...stroke} />
        </svg>
      );
    case "ocean":
      return (
        <svg viewBox="0 0 16 16" style={sx} aria-hidden="true">
          <path d="M1 6 q 2 -2 4 0 t 4 0 t 4 0 t 4 0" {...stroke} />
          <path d="M1 10 q 2 -2 4 0 t 4 0 t 4 0 t 4 0" {...stroke} />
          <path d="M1 14 q 2 -2 4 0 t 4 0 t 4 0 t 4 0" {...stroke} />
        </svg>
      );
    case "city":
      return (
        <svg viewBox="0 0 16 16" style={sx} aria-hidden="true">
          <rect x="2" y="6" width="2.5" height="8" {...stroke} />
          <rect x="6" y="3" width="2.5" height="11" {...stroke} />
          <rect x="10" y="8" width="2.5" height="6" {...stroke} />
        </svg>
      );
    case "swamp":
      return (
        <svg viewBox="0 0 16 16" style={sx} aria-hidden="true">
          <path d="M2 12 q 3 -3 6 0 t 6 0" {...stroke} />
          <line x1="5" y1="9" x2="5" y2="6" {...stroke} />
          <line x1="9" y1="9" x2="9" y2="4" {...stroke} />
          <line x1="12" y1="10" x2="12" y2="7" {...stroke} />
        </svg>
      );
    case "volcanic":
      return (
        <svg viewBox="0 0 16 16" style={sx} aria-hidden="true">
          <path d="M2 13 L7 5 L9 8 L14 13 Z" {...stroke} />
          <path d="M7 5 L8 2 L9 5" {...stroke} />
        </svg>
      );
    case "gas":
      return (
        <svg viewBox="0 0 16 16" style={sx} aria-hidden="true">
          <ellipse cx="8" cy="5" rx="6" ry="1.5" {...stroke} />
          <ellipse cx="8" cy="9" rx="5" ry="1.2" {...stroke} />
          <ellipse cx="8" cy="13" rx="4" ry="1" {...stroke} />
        </svg>
      );
    case "temperate":
    default:
      return (
        <svg viewBox="0 0 16 16" style={sx} aria-hidden="true">
          <circle cx="8" cy="8" r="6" {...stroke} />
          <line x1="2" y1="8" x2="14" y2="8" {...stroke} />
        </svg>
      );
  }
}

function ChipRow({
  climate,
  terrain,
  biome
}: {
  climate: string[];
  terrain: string[];
  biome: ClimateBiome;
}) {
  const palette = BIOME_PALETTES[biome];
  return (
    <div className="flex flex-wrap items-center gap-2">
      {[...climate, ...terrain].map((word, i) => (
        <span
          key={`${word}-${i}`}
          className="inline-flex h-6 items-center gap-1.5 rounded border border-border-faint bg-bg-overlay/40 px-2 font-mono text-2xs uppercase tracking-[0.14em]"
          style={{ color: palette.hot, borderColor: palette.whisper }}
        >
          {i === 0 && <BiomeGlyph biome={biome} size={11} />}
          {word}
        </span>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Number animation hook. Uses motion's `animate` driver for an ease-out-quart
// count-up over 700ms. Returns the current animated value and signals
// completion so we can render a final crisp string.
// ---------------------------------------------------------------------------
function useCountUp(target: number, duration = 0.7): number {
  const reduced = useReducedMotion() ?? false;
  const mv = useMotionValue(reduced ? target : 0);
  const [val, setVal] = useState(reduced ? target : 0);

  useEffect(() => {
    if (reduced) {
      mv.set(target);
      setVal(target);
      return;
    }
    const controls = animate(mv, target, {
      duration,
      ease: [0.16, 1, 0.3, 1] // ease-out-quart
    });
    const unsub = mv.on("change", (v) => setVal(v));
    return () => {
      controls.stop();
      unsub();
    };
  }, [target, duration, mv, reduced]);

  return val;
}

// ---------------------------------------------------------------------------
// Gravity instrument — horizontal axis with a marker at the planet's gravity
// relative to 1 standard. Range clamped to 0..2.5g for visual readability.
// ---------------------------------------------------------------------------
function GravityInstrument({ value, accent }: { value: number; accent: string }) {
  const animated = useCountUp(value);
  const range = 2.5;
  const pct = Math.max(0, Math.min(100, (animated / range) * 100));
  const refPct = (1 / range) * 100;

  return (
    <Card label="Gravity">
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-lg tabular-nums text-fg-strong">
          {animated.toFixed(2)}
        </span>
        <span className="font-mono text-2xs uppercase tracking-[0.14em] text-fg-dim">std g</span>
      </div>
      <div className="relative mt-2 h-1.5 overflow-hidden rounded-full border border-border-faint bg-bg-deep">
        <motion.div
          className="absolute inset-y-0 left-0"
          style={{ background: accent, width: `${pct}%` }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        />
        {/* 1g reference tick */}
        <span
          aria-hidden="true"
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
          style={{ left: `${refPct}%` }}
        >
          <span
            className="block h-3 w-px"
            style={{ background: "var(--color-fg-dim)", opacity: 0.7 }}
          />
        </span>
      </div>
      <div className="mt-1 flex justify-between font-mono text-[0.625rem] uppercase tracking-[0.14em] text-fg-dim">
        <span>0</span>
        <span>1g ref</span>
        <span>{range.toFixed(1)}</span>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Surface water — radial gauge, 0..100%, animated arc on mount.
// ---------------------------------------------------------------------------
function SurfaceWaterGauge({ percent, accent }: { percent: number; accent: string }) {
  const animated = useCountUp(percent);
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const dash = (animated / 100) * circumference;

  return (
    <Card label="Surface water">
      <div className="flex items-center gap-3">
        <svg width="56" height="56" viewBox="-28 -28 56 56" aria-hidden="true">
          <circle
            cx="0"
            cy="0"
            r={radius}
            fill="none"
            stroke="var(--color-border-faint)"
            strokeWidth="3"
          />
          <circle
            cx="0"
            cy="0"
            r={radius}
            fill="none"
            stroke={accent}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference - dash}`}
            transform="rotate(-90)"
          />
        </svg>
        <div className="flex flex-col">
          <span className="font-mono text-lg tabular-nums text-fg-strong">
            {Math.round(animated)}%
          </span>
          <span className="font-mono text-2xs uppercase tracking-[0.14em] text-fg-dim">
            hydrosphere
          </span>
        </div>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Population readout — large mono number with SI-style suffix. Counts up on
// mount via animated motion value passed to `useTransform`.
// ---------------------------------------------------------------------------
function PopulationReadout({ value, accent }: { value: number; accent: string }) {
  const reduced = useReducedMotion() ?? false;
  const mv = useMotionValue(reduced ? value : 0);
  const [display, setDisplay] = useState(reduced ? formatPopulation(value) : "0");

  useEffect(() => {
    if (reduced) {
      setDisplay(formatPopulation(value));
      return;
    }
    const controls = animate(mv, value, {
      duration: 0.9,
      ease: [0.16, 1, 0.3, 1]
    });
    const unsub = mv.on("change", (v) => setDisplay(formatPopulation(v)));
    return () => {
      controls.stop();
      unsub();
    };
  }, [value, mv, reduced]);

  // The accent prop is rendered as a tiny line accent on the card — keeps
  // the colors consistent across all readouts without adding heavy chrome.
  const _underlineWidth = useTransform(mv, [0, value], ["0%", "100%"]);

  return (
    <Card label="Population">
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-lg tabular-nums text-fg-strong">{display}</span>
        <span className="font-mono text-2xs uppercase tracking-[0.14em] text-fg-dim">
          inhabitants
        </span>
      </div>
      <motion.div
        className="mt-2 h-px"
        style={{ background: accent, width: _underlineWidth }}
        aria-hidden="true"
      />
    </Card>
  );
}

function formatPopulation(n: number): string {
  if (n <= 0) return "0";
  if (n >= 1e12) return `~${(n / 1e12).toFixed(1)} trillion`;
  if (n >= 1e9) return `~${(n / 1e9).toFixed(1)} billion`;
  if (n >= 1e6) return `~${(n / 1e6).toFixed(1)} million`;
  if (n >= 1e3) return `~${(n / 1e3).toFixed(1)}k`;
  return Math.round(n).toLocaleString();
}

// ---------------------------------------------------------------------------
// NumericReadout — small generic readout for diameter/day/year stats.
// ---------------------------------------------------------------------------
function NumericReadout({
  label,
  value,
  unit,
  decimals = 0,
  accent
}: {
  label: string;
  value: number;
  unit: string;
  decimals?: number;
  accent: string;
}) {
  const animated = useCountUp(value);
  const formatted =
    value >= 10000
      ? Math.round(animated).toLocaleString()
      : animated.toFixed(decimals);

  return (
    <Card label={label}>
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-lg tabular-nums text-fg-strong">{formatted}</span>
        <span className="font-mono text-2xs uppercase tracking-[0.14em] text-fg-dim">{unit}</span>
      </div>
      {/* Tiny accent stripe — matches population readout */}
      <div
        className="mt-2 h-px w-full"
        style={{ background: accent, opacity: 0.5 }}
        aria-hidden="true"
      />
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Card primitive — compact instrument frame.
// ---------------------------------------------------------------------------
function Card({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 rounded border border-border-faint bg-bg-overlay/30 px-3 py-2.5">
      <span className="font-mono text-2xs uppercase tracking-[0.14em] text-fg-dim">{label}</span>
      {children}
    </div>
  );
}
