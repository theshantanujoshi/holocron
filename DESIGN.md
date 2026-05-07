# Design

## Theme

**Dark, single mode.** Scene sentence: *A Star Wars researcher at a 27" monitor at night in a low-lit study, deep in flow, scrubbing through 25,000 years of galactic history to verify a citation.* That sentence forces dark — the alternative breaks the scene.

No light-mode variant in v1. Adding one later would require re-designing depth cues and the holographic accent, not a token swap.

## Color strategy

**Committed.** A single saturated accent (electric/holo blue, desaturated below 80% sat per design-taste-frontend) carries 30–60% of every active surface against tinted near-black. Justification: a 3D galaxy with hyperspace lanes and live data emphasis demands an emissive accent; Restrained would feel under-confident; Full palette / Drenched would feel game-y (an anti-reference).

### Palette (OKLCH)

All neutrals tinted toward the brand hue (`240`, slate-cool) at 0.005–0.01 chroma per impeccable rules. No `#000` or `#fff` anywhere.

```css
/* Surfaces */
--bg-canvas:    oklch(0.13 0.005 240);   /* root surface, tinted near-black */
--bg-panel:     oklch(0.16 0.005 240);   /* elevated panel, datapad */
--bg-overlay:   oklch(0.19 0.005 240);   /* tooltip, command palette */
--bg-deep:      oklch(0.09 0.005 240);   /* the void of space */

/* Borders */
--border-faint: oklch(0.22 0.005 240);   /* hairlines */
--border-line:  oklch(0.30 0.008 240);   /* dividers, panel edges */
--border-bright:oklch(0.42 0.012 240);   /* hover borders */

/* Foreground */
--fg-primary:   oklch(0.94 0.005 80);    /* archive cream, body */
--fg-strong:    oklch(0.98 0.003 80);    /* headings */
--fg-muted:     oklch(0.66 0.010 240);   /* secondary */
--fg-dim:       oklch(0.44 0.012 240);   /* tertiary, captions */

/* Accent — electric holo-blue, desaturated */
--accent:       oklch(0.78 0.13 235);    /* primary action, selection */
--accent-strong:oklch(0.84 0.14 235);    /* hover state */
--accent-faint: oklch(0.30 0.05 235);    /* dim accent borders, lane glow at distance */
--accent-bg:    oklch(0.22 0.04 235);    /* selected-row background */

/* Canonicity */
--canon:        oklch(0.94 0.02 80);     /* canon text — archive cream */
--legends:      oklch(0.82 0.10 60);     /* Legends — warm amber, distinct from canon */

/* States */
--alarm:        oklch(0.64 0.18 25);     /* Imperial red, caution */
--success:      oklch(0.72 0.13 155);    /* desaturated green, rare use */
```

### Usage rules

- The accent is **functional**: primary action, current selection, active hyperspace lane, scrubber position. Never decorative glow.
- Canon entities use cream foreground; Legends use the amber. Both have a leading icon glyph (square = canon, diamond = Legends) so the channel is shape-redundant.
- Imperial red is reserved for caution states (Sith / Empire faction polygons in the temporal view, error states).
- No gradient text. No `background-clip: text` anywhere. (Per impeccable absolute bans + design-taste-frontend Lila Ban.)
- Panel-on-panel: the datapad sits on the canvas; nested cards are forbidden.

## Typography

### Font stack

- **Display + Body**: `Geist` (variable, 100–900). Inter is banned per design-taste-frontend.
- **Mono / Numerics**: `Geist Mono`. All BBY/ABY dates, parsec readouts, coordinates render in mono — they're technical data and should look it.
- **Decorative cipher**: Aurebesh appears only as section watermark glyphs (1px-tall, low contrast) and as the H of "Holocron" in the wordmark — never as readable UI text.

Both Geist faces self-hosted via `next/font/local`; no external font loads.

### Scale

Fixed rem scale — product UIs don't fluid-clamp. Ratio tighter than brand surfaces (~1.18 between steps).

```
Caption / mono       11px / 0.6875rem  (axis ticks, metadata)
Micro                12px / 0.75rem    (chip labels, badges)
Body small           13px / 0.8125rem  (UI labels)
Body                 14px / 0.875rem   (default, datapad lore)
Body large           16px / 1rem       (hero blurb, intro copy)
H4                   18px / 1.125rem   (panel headers)
H3                   22px / 1.375rem   (section titles)
H2                   28px / 1.75rem    (page titles)
H1 (rare)            44px / 2.75rem    (hero only)
Display (rare)       64px / 4rem       (cinematic moments only)
```

- Body line-length capped at 65–75ch in lore prose; data tables can run to 120ch+.
- Hierarchy via weight + tracking, never via decorative effects.
- Tracking-tight on display sizes (`-0.02em`); tracking-normal on body; tracking-wide (+0.06em) on UPPERCASE labels.

## Layout

- Asymmetric by default (DESIGN_VARIANCE 7). Hero is split: content left (40-50%), 3D canvas right.
- Container: `max-w-[1400px] mx-auto` for chrome; the 3D canvas can break out to full bleed.
- Spacing rhythm: vary deliberately. `gap-2` (8px) inside dense panels, `gap-6` (24px) between sections, `gap-12` (48px) between major regions. No uniform `p-4` everywhere.
- No `h-screen` for hero — `min-h-[100dvh]` to avoid iOS Safari layout jump.
- Grid over flex-math everywhere: `grid grid-cols-12 gap-4` for app shell, `grid-cols-[280px_1fr_360px]` for explorer layout.
- Mobile collapse: below `md` (768px), explorer collapses to a vertical stack — galaxy → datapad → timeline → lineage as scrolled sections, not a 3D canvas with floating panels.
- Cards used only when elevation has a job. Datapad and command palette earn cards. Most surfaces are spacing + 1px hairline + negative space.
- No nested cards, ever.

## Motion

MOTION_INTENSITY 7. Every transition is purposeful.

- **Easing**: ease-out exponential (`cubic-bezier(0.16, 1, 0.3, 1)`) for UI state changes, 180–280ms.
- **Hyperspace transitions** (cross-pivot): 600–900ms, GSAP-orchestrated camera dolly + accent-line streak overlay. Only when the user changes the global selection.
- **Spring physics**: Motion (Framer) `{ type: "spring", stiffness: 100, damping: 20 }` for buttons, panels, magnetic micro-physics on primary CTA.
- **Perpetual micro-motion**: scrubber thumb breathes (0.4s pulse, ±2% scale); active hyperspace lane has a slow flowing dash (4s linear loop); status dots pulse. All isolated in their own memoized client components.
- **Layout transitions**: `layout` and `layoutId` for reflows in the datapad and lineage graph reordering.
- **Forbidden**: bounce easing, elastic, animated `top`/`left`/`width`/`height`, `box-shadow` color glows, decorative parallax for its own sake.
- **Reduced motion**: scrubber transitions become instant; hyperspace transitions become 80ms cross-fades; perpetual motion stops; lineage graph layout is static-resolved.

## Components

Every interactive element ships with default / hover / focus / active / disabled / loading / error states. No exceptions.

- **Buttons**: 32px / 40px / 48px heights. 1px hairline border + accent-faint background on primary. Active state: `translate-y-[1px]`. Magnetic micro-physics (Motion `useMotionValue`) on primary CTA only.
- **Inputs**: label above, helper below, 1px border, focus = 1px accent ring (no double border). Error inline below.
- **Datapad cards**: `rounded-2xl`, 1px `--border-line`, `--bg-panel`, generous `p-8`. Inside: subdued dividers (`divide-y`), no nested cards.
- **Tooltips / popovers**: 1px hairline + 8px corner radius + 12px padding. No glassmorphism.
- **Tables**: row height 36px; first column sticky on horizontal scroll; alternating rows ARE NOT used (visual noise). Selected row gets `--accent-bg` + 2px left accent stripe (this is the *only* allowed left-stripe usage — and only for active table selection, never decorative).
- **Skeletons**: skeletal loaders shaped like the final content; never circular spinners.
- **Empty states**: a single sentence + a single primary action. No illustrations of empty boxes.

## Iconography

- Library: `@phosphor-icons/react` — `weight="regular"` everywhere (1.5px stroke equivalent). Standardize.
- No mixing of icon styles. No emojis ever (anti-emoji policy).
- Custom SVG only for: Holocron wordmark, canon/Legends glyph (square / diamond), faction insignia (Empire cog, Rebel starbird, Republic crest, Jedi / Sith Order), Aurebesh letterforms.

## 3D / Canvas conventions

- Renderer: WebGPU when available (R3F r160+), WebGL2 fallback.
- Stars: instanced point cloud, count tied to GPU tier; ≥500k on desktop, 100k on mobile, gracefully degrades.
- Planets: shader-driven from SWAPI `climate` + `terrain` fields — no per-planet textures (saves bandwidth, defeats the IP issue around real Star Wars planet art).
- Hyperspace lanes: animated dashed lines, accent at full sat for active route, faint accent for rest.
- Sector grid: 1500-parsec cells, drawn as 2px hairlines at far zoom, fades out near zoom-in.
- Camera: orbit + zoom, never free-look in v1 (avoids motion sickness, keeps "console" feel).
- Labels: HTML overlays (drei `Html`) with collision-aware visibility — only ~30 visible at a time max.
