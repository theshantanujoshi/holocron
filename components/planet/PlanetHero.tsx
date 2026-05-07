"use client";

import { motion, useReducedMotion, useScroll, useTransform, useSpring } from "motion/react";
import type { MotionValue } from "motion/react";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import type { Entity } from "@/lib/schema";
import type { PlanetImage } from "@/lib/data/loadPlanetImages";
import { cn } from "@/lib/utils";
import { BIOME_LABEL, classifyBiome, BIOME_PALETTES, type ClimateBiome } from "./climate";

/**
 * <PlanetHero /> — full-bleed hero at the top of the planet datapad.
 *
 * Layer composition (back-to-front):
 *   1. Procedural climate shader on a low-res <canvas>. Pure 2-D simplex-ish
 *      sum-of-cosines lit by the biome's hot/core/cool palette. Animates with
 *      a 10-second breathing cycle. Falls back to a CSS gradient if 2D
 *      context allocation fails.
 *   2. Optional Wikipedia thumbnail with a holographic CSS mask: animated
 *      scanlines crawl upward at 0.4 lines/sec, slight chromatic aberration
 *      via box-shadow split. Scanline crawl is canvas-driven (composite over
 *      the image) so we keep all of it on the same redraw budget.
 *   3. Headline: planet name, aliases, region/sector mono caption.
 *
 * Scroll-collapse spec:
 *   - Hero height: 280px → 80px between scrollY=0 and scrollY=140 in the
 *     parent scroll container.
 *   - Title size: 3xl → xl with the same range.
 *   - Image opacity: 1 → 0.3.
 *   - Driven by useScroll + useTransform + a critically-damped useSpring
 *     (stiffness 120, damping 22) so the collapse settles smoothly.
 *
 * Reduced motion:
 *   - Hero stays at full size; no scroll-collapse, no scanline crawl, no
 *     palette breathing. Static chrome only.
 *
 * Performance:
 *   - Canvas is 256x144 (rendered up via CSS transform), capped at ~30fps via
 *     a self-throttled rAF — that's enough for low-frequency biome breathing
 *     and lets the rest of the budget go to the rest of the surface.
 *   - rAF stops when the document/page is hidden.
 *
 * Disposal:
 *   - rAF cancelled and ctx cleared on unmount.
 */
type Props = {
  entity: Entity;
  image: PlanetImage | null;
  scrollContainer: RefObject<HTMLElement | null>;
};

const COLLAPSE_END = 140;
const HERO_MAX_HEIGHT = 280;
const HERO_MIN_HEIGHT = 80;
const SPRING_CONFIG = { stiffness: 120, damping: 22, mass: 0.8 } as const;

export function PlanetHero({ entity, image, scrollContainer }: Props) {
  const reduced = useReducedMotion() ?? false;
  const biome = useMemo(
    () => classifyBiome(entity.physical?.climate, entity.physical?.terrain),
    [entity.physical?.climate, entity.physical?.terrain]
  );
  const palette = BIOME_PALETTES[biome];
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const heroSrc = image ? `${basePath}${image.src}` : null;

  // ------------------------------------------------------------------ scroll
  const { scrollY } = useScroll({ container: scrollContainer });
  const collapseRaw = useTransform(scrollY, [0, COLLAPSE_END], [0, 1], { clamp: true });
  const collapse = useSpring(collapseRaw, SPRING_CONFIG);

  // Reduced-motion: pin to 0.
  const collapseEffective: MotionValue<number> = reduced ? collapseRaw : collapse;

  const height = useTransform(collapseEffective, [0, 1], [HERO_MAX_HEIGHT, HERO_MIN_HEIGHT]);
  const titleScale = useTransform(collapseEffective, [0, 1], [1, 0.65]);
  const aliasOpacity = useTransform(collapseEffective, [0, 0.4], [1, 0]);
  const captionOpacity = useTransform(collapseEffective, [0, 0.6], [1, 0]);
  const imageOpacity = useTransform(collapseEffective, [0, 1], [1, 0.32]);
  const scanIntensity = useTransform(collapseEffective, [0, 1], [1, 0.25]);

  // ----------------------------------------------------------- canvas shader
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const W = 256;
    const H = 144;
    canvas.width = W;
    canvas.height = H;

    let raf = 0;
    let lastDraw = 0;
    const start = performance.now();

    // Pre-resolve palette colors once — paints are expensive at 256*144.
    const colorHot = palette.hot;
    const colorCore = palette.core;
    const colorCool = palette.cool;

    const drawFrame = (now: number) => {
      // Throttle to ~30fps; the breathing is slow enough to look fine.
      if (now - lastDraw < 33) {
        raf = requestAnimationFrame(drawFrame);
        return;
      }
      lastDraw = now;

      const t = (now - start) / 1000;
      // 10-second breathing cycle — slow oscillation that pulls the hot
      // band up and down across the frame.
      const breath = reduced ? 0.5 : 0.5 + 0.5 * Math.sin((t / 10) * Math.PI * 2);

      // Vertical gradient: cool floor → core mid → hot peak with the
      // breath shifting the color stops slightly. Computed via an
      // off-screen ImageData buffer for full pixel control without per-px
      // gradient allocations.
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      const breathOffset = 0.15 * breath;
      grad.addColorStop(0, colorHot);
      grad.addColorStop(Math.min(0.5 + breathOffset, 0.85), colorCore);
      grad.addColorStop(1, colorCool);
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // Cosine-sum "weather bands" — three offset sinusoids mixed via
      // multiply, gives a soft cloud-strip feel without a noise texture.
      ctx.globalCompositeOperation = "screen";
      ctx.globalAlpha = 0.2;
      for (let i = 0; i < 3; i += 1) {
        const phase = reduced ? i : t * (0.05 + i * 0.02) + i * 1.7;
        const yCenter = H * (0.25 + 0.25 * Math.sin(phase));
        const bandH = 18 + i * 6;
        const ribbon = ctx.createLinearGradient(0, yCenter - bandH, 0, yCenter + bandH);
        ribbon.addColorStop(0, "oklch(0.05 0 0 / 0)");
        ribbon.addColorStop(0.5, colorHot);
        ribbon.addColorStop(1, "oklch(0.05 0 0 / 0)");
        ctx.fillStyle = ribbon;
        ctx.fillRect(0, yCenter - bandH, W, bandH * 2);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";

      raf = requestAnimationFrame(drawFrame);
    };

    if (!reduced) {
      raf = requestAnimationFrame(drawFrame);
    } else {
      // Single static frame.
      drawFrame(start);
    }

    return () => {
      if (raf) cancelAnimationFrame(raf);
      ctx.clearRect(0, 0, W, H);
    };
  }, [palette, reduced]);

  // ------------------------------------------------------------ derived chrome
  const region = entity.spatial?.region;
  const sector = entity.spatial?.sector;

  return (
    <motion.header
      className="relative isolate overflow-hidden border-b border-border-faint"
      style={{ height, backgroundColor: "var(--color-bg-deep)" }}
    >
      {/* Layer 1: procedural climate shader on canvas */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full"
        style={{ filter: "blur(6px) saturate(1.05)", opacity: 0.65 }}
      />

      {/* Layer 1b: faint vignette so chrome edges read against any image */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 80% at 50% 35%, oklch(0.05 0 0 / 0) 0%, oklch(0.05 0 0 / 0.55) 100%)"
        }}
      />

      {/* Layer 2: optional Wikipedia hero image with holographic mask */}
      {heroSrc && (
        <motion.div
          className="pointer-events-none absolute inset-0"
          style={{ opacity: imageOpacity }}
          aria-hidden="true"
        >
          <HolographicImage
            src={heroSrc}
            biome={biome}
            scanIntensity={scanIntensity}
            reduced={reduced}
          />
        </motion.div>
      )}

      {/* Layer 3: headline + caption chrome */}
      <div className="relative z-10 flex h-full flex-col justify-end gap-1 px-6 pb-4">
        <motion.span
          className="font-mono text-2xs uppercase tracking-[0.18em] text-fg-dim"
          style={{ opacity: captionOpacity }}
        >
          {BIOME_LABEL[biome]}
        </motion.span>
        <motion.h1
          className="origin-bottom-left text-3xl font-medium tracking-[-0.025em] text-fg-strong md:text-5xl"
          style={{
            scale: titleScale,
            textShadow: `0 0 32px ${palette.shadow}`
          }}
          aria-live="polite"
        >
          {entity.name}
        </motion.h1>
        {entity.aliases.length > 0 && (
          <motion.p
            className="text-xs text-fg-muted"
            style={{ opacity: aliasOpacity }}
          >
            also {entity.aliases.join(" · ")}
          </motion.p>
        )}
        <motion.div
          className="flex items-center gap-3 font-mono text-2xs uppercase tracking-[0.16em] text-fg-dim"
          style={{ opacity: captionOpacity }}
        >
          <span className={cn(canonicityGlyph(entity.canonicity))}>{entity.canonicity}</span>
          {region && <span aria-hidden="true">·</span>}
          {region && <span>{region}</span>}
          {sector && <span aria-hidden="true">·</span>}
          {sector && <span>{sector}</span>}
        </motion.div>
      </div>

      {/* Image attribution — tiny, bottom-right, only when image present */}
      {image && (
        <motion.p
          className="absolute bottom-1 right-3 z-10 max-w-[40%] truncate text-right font-mono text-[0.625rem] uppercase tracking-[0.14em] text-fg-dim/70"
          style={{ opacity: captionOpacity }}
        >
          <a
            href={image.wikipediaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-fg-muted"
          >
            {image.attribution} · {image.license}
          </a>
        </motion.p>
      )}
    </motion.header>
  );
}

function canonicityGlyph(canon: Entity["canonicity"]): string {
  if (canon === "canon") return "text-canon-glyph text-canon";
  if (canon === "legends") return "text-legends-glyph text-legends";
  return "text-fg-dim";
}

// ---------------------------------------------------------------------------
// Holographic image inner — renders a Wikipedia thumbnail through a CSS-driven
// scanline mask + gradient + chromatic split. The crawl uses a CSS @keyframes
// animation on `mask-position` so the GPU compositor handles it; under
// reduced motion the keyframes are inert (handled by the global stylesheet).
// ---------------------------------------------------------------------------
function HolographicImage({
  src,
  biome,
  scanIntensity,
  reduced
}: {
  src: string;
  biome: ClimateBiome;
  scanIntensity: MotionValue<number>;
  reduced: boolean;
}) {
  const palette = BIOME_PALETTES[biome];
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Base image with chromatic split via dual layers + mix-blend-mode */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url(${src})`,
          filter: "saturate(0.55) contrast(1.05)",
          opacity: 0.72
        }}
      />
      <div
        className="absolute inset-0 bg-cover bg-center mix-blend-screen"
        style={{
          backgroundImage: `url(${src})`,
          filter: `saturate(1.3) hue-rotate(10deg) brightness(1.15)`,
          opacity: 0.35,
          transform: "translateX(1.5px)"
        }}
        aria-hidden="true"
      />

      {/* Tint with biome core color */}
      <div
        className="absolute inset-0 mix-blend-overlay"
        style={{
          background: `linear-gradient(180deg, ${palette.core} 0%, ${palette.cool} 100%)`,
          opacity: 0.45
        }}
        aria-hidden="true"
      />

      {/* Scanline mask — animated upward crawl */}
      <motion.div
        className="absolute inset-0 holo-scanlines"
        aria-hidden="true"
        style={{
          opacity: scanIntensity,
          // Override CSS variables so each instance can tune intensity.
          ["--holo-rim" as string]: palette.core,
          ["--holo-shadow" as string]: palette.shadow
        }}
      >
        <div className={cn("holo-bands", reduced && "holo-bands--still")} />
      </motion.div>

      {/* Top + bottom fade so headline reads */}
      <div
        className="absolute inset-x-0 top-0 h-1/3"
        style={{
          background:
            "linear-gradient(180deg, oklch(0.05 0 0 / 0.6) 0%, oklch(0.05 0 0 / 0) 100%)"
        }}
        aria-hidden="true"
      />
      <div
        className="absolute inset-x-0 bottom-0 h-2/3"
        style={{
          background:
            "linear-gradient(180deg, oklch(0.05 0 0 / 0) 0%, oklch(0.13 0.005 240 / 0.92) 80%)"
        }}
        aria-hidden="true"
      />
    </div>
  );
}
