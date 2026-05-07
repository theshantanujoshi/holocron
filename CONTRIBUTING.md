# Contributing to Holocron

Holocron is an open archive built by Star Wars fans who happen to be engineers. If that's you, welcome.

> Live: **https://adhit-r.github.io/holocron/**
>
> Issues: **https://github.com/adhit-r/holocron/issues**

## Quick paths in

If you have ~2 hours, pick from the [`good first issue`](https://github.com/adhit-r/holocron/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22) label:

- [#1 Lightsaber colors per Force user](https://github.com/adhit-r/holocron/issues/1) — Three.js shader, lore-heavy
- [#4 Aurebesh tooltip decoder](https://github.com/adhit-r/holocron/issues/4) — pure CSS + lookup table
- [#5 May the Fourth landing takeover](https://github.com/adhit-r/holocron/issues/5) — date-gated UI flourish

If you want a real challenge, pick from [`advanced`](https://github.com/adhit-r/holocron/issues?q=is%3Aissue+is%3Aopen+label%3Aadvanced):

- [#11 WebGPU compute-shader starfield](https://github.com/adhit-r/holocron/issues/11) — 1M particles via WGSL
- [#13 WebXR mode](https://github.com/adhit-r/holocron/issues/13) — Vision Pro / Quest galaxy walk
- [#15 Local LLM-driven entity descriptions](https://github.com/adhit-r/holocron/issues/15) — Phi-3 / Gemma via Transformers.js

If you love GLSL: [`area: shader`](https://github.com/adhit-r/holocron/issues?q=is%3Aissue+is%3Aopen+label%3A%22area%3A+shader%22).

If you love Star Wars canon: [`lore-heavy`](https://github.com/adhit-r/holocron/issues?q=is%3Aissue+is%3Aopen+label%3Alore-heavy).

## Local setup

```bash
git clone https://github.com/adhit-r/holocron.git
cd holocron
npm install
```

Build the data pipeline (in dependency order — only needs to run once or after data changes):

```bash
npm run build:lanes        # parzivail planet coords + hyperspace lanes
npm run build:kb           # SWAPI ingestion + parzivail merge
npm run build:descriptions # Wikipedia summary enrichment
npm run build:lineage      # Force lineage graph
npm run build:wars         # in-universe wars + battles
npm run build:legends      # non-Disney films + comics + games
npm run build:planet-images
npm run build:person-images
npm run build:embeddings   # semantic search vectors (rerun after any kb.json change)
```

Then run dev:

```bash
npm run dev
```

Open http://localhost:3000.

## Stack

| Layer | Tool |
|---|---|
| Framework | Next.js 15 (App Router, static export) |
| Language | TypeScript (strict, `noUncheckedIndexedAccess`) |
| 3D | React Three Fiber 9 + Three.js + drei |
| Styling | Tailwind v4 (CSS-first `@theme` tokens, OKLCH only) |
| Animation | Motion (Framer) + GSAP |
| State | Zustand + Zod |
| Search | Orama (lex) + Transformers.js (semantic) hybrid |
| Audio | Web Audio API (procedural; no samples) |

No backend. Everything ships as a static export.

## Conventions you must follow

These are non-negotiable. They keep the project's design coherent and IP-safe.

- **OKLCH-only colors.** No `#000` or `#fff`. Tint every neutral toward the brand hue. See [`DESIGN.md`](DESIGN.md).
- **No Inter font.** Use Geist + Geist Mono only. The brand depends on this.
- **No emojis.** Anywhere. Use Phosphor icons.
- **No mock data.** Every entity, image, quote, and statistic must come from a real public source. Cite it.
- **No copyrighted assets.** No film clips embedded (link out to Lucasfilm's official YouTube channel only). No music samples (procedural Web Audio only). No commissioned character likenesses (procedural shaders only).
- **Reduced-motion respected.** Every animated component MUST honor `prefers-reduced-motion: reduce`.
- **Three.js disposal.** Every geometry, material, and texture you create must be disposed on unmount. Memory leaks in long-running R3F sessions are easy and lethal.

See [`PRODUCT.md`](PRODUCT.md), [`DESIGN.md`](DESIGN.md), and [`SHAPE.md`](SHAPE.md) for the full design language.

## Pull request flow

1. Fork the repo, create a branch off `main` named like `issue-12-hyperspace-tunnel`.
2. Make your changes. Run `npx tsc --noEmit` before pushing (CI will reject otherwise).
3. Open a PR referencing the issue number.
4. The deploy preview URL auto-builds via the GitHub Actions workflow.
5. Once approved, your branch squash-merges into `main` and deploys to GitHub Pages immediately.

For UI changes, attach screenshots at desktop (1440px) and mobile (375px) widths.

For 3D / shader changes, attach a short screen recording.

## Lore standards

When working on lore-heavy issues:

- Cite Wookieepedia as the primary source. Use canon by default; tag Legends content with `canonicity: 'legends'`.
- For ambiguous canonicity, prefer canon and document the disambiguation in a comment.
- Quotes should be ≤200 chars (fair-use commentary). Always attribute to speaker + film + year.
- Battle / event years use the canonical BBY/ABY system.

## Star Wars and related marks

Star Wars and related marks (characters, vehicles, planets, films, games, comics) are property of Lucasfilm Ltd. Holocron is an independent, non-commercial educational archive. We use public data under fair-use commentary. We do not embed copyrighted media.

If you are at Lucasfilm and would like us to remove or adjust anything, open an issue and we will respond promptly.
