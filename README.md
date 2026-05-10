# Holocron

**The galaxy, indexed. Across space, time, and lineage.**

![Holocron — 30-second demo](./demo.gif)

[![Deploy](https://github.com/adhit-r/holocron/actions/workflows/deploy.yml/badge.svg)](https://github.com/adhit-r/holocron/actions/workflows/deploy.yml)
[![Open Issues](https://img.shields.io/github/issues/adhit-r/holocron)](https://github.com/adhit-r/holocron/issues)
[![Good first issues](https://img.shields.io/github/issues/adhit-r/holocron/good%20first%20issue?label=good%20first%20issue&color=7057ff)](https://github.com/adhit-r/holocron/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

A unified explorer for the Star Wars universe. Four coupled views — a 3D galaxy, a temporal scrubber across 25,000 years of history, a Force-lineage graph, and an entity datapad — driven by a single shared selection state. Pick anything, see it everywhere.

> **Demo video** above — 30s, rendered with [Remotion](./remotion/). Source in [`remotion/`](./remotion/), MP4 + GIF outputs gitignored, regenerate with `cd remotion && npm install && npm run render:gif`.

> **Live:** Cloudflare Pages (primary, fast). GitHub Pages mirror at https://adhit-r.github.io/holocron/ (fallback).
>
> **Repo:** https://github.com/adhit-r/holocron
>
> **Contribute:** see [CONTRIBUTING.md](CONTRIBUTING.md). 20+ issues open, ~5 marked `good first issue`.

## Contribute (read this first)

We're actively looking for Star Wars fans who write code. The repo has 20+ open issues classified by `area`, `difficulty`, and topic so you can pick one that matches your taste.

- **2 hours** → [`good first issue`](https://github.com/adhit-r/holocron/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22): lightsaber colors, Aurebesh tooltips, sequel-era planets, May the 4th takeover.
- **A weekend** → intermediate: Force-ghost shader, era-aware faction classification, Story Mode "Rise of Vader," procedural climate shaders.
- **A real challenge** → [`advanced`](https://github.com/adhit-r/holocron/issues?q=is%3Aissue+is%3Aopen+label%3Aadvanced): WebGPU 1M-particle starfield, hyperspace tunnel transition, WebXR mode, voice-driven cross-pivot, local LLM-driven entity descriptions.
- **Pure GLSL** → [`area: shader`](https://github.com/adhit-r/holocron/issues?q=is%3Aissue+is%3Aopen+label%3A%22area%3A+shader%22).
- **Lore expertise** → [`lore-heavy`](https://github.com/adhit-r/holocron/issues?q=is%3Aissue+is%3Aopen+label%3Alore-heavy).

Local setup is in [CONTRIBUTING.md](CONTRIBUTING.md). Design language in [DESIGN.md](DESIGN.md). Roadmap in [ROADMAP.md](ROADMAP.md).

## What's inside

- **Galaxy view** — 3D scene with real Legends planet coordinates, sector grid, hyperspace lanes, hover/select labels, orbiting camera. Selected entities project a holographic figure (custom GLSL shader: scanlines, fresnel rim, flicker) above their homeworld; Force users emit concentric resonance pulses; a connection web fans out to every related entity.
- **Timeline view** — top-down galactic projection with hyperspace lanes drawn as animated dashes; planets fade in based on their first appearance vs. the era scrubber; faction territories and war theatres morph as you scrub through 25,025 BBY → 35 ABY; battle markers light up when the era approaches.
- **Lineage view** — 3D force-directed graph of master/apprentice + parent/child relationships, with Sith vs. Jedi vs. civilian classified by BFS over the lineage chain. Hover any node to highlight its ancestry path.
- **Datapad** — selected entity detail with Wikipedia-enriched lore (expandable), era data, cross-link relations, memorable quotes (100+ canonical quotes attributed by speaker / film / year), canon vs. Legends glyph, source provenance, and a per-entity Star Wars opening crawl.
- **Hybrid search** — `/` or `⌘K`. Lexical (Orama) + semantic (Transformers.js + MiniLM-L6-v2 embeddings, ~390 KB precomputed vectors) blended 50/50, results tagged `lex / sem / hybrid`.
- **Plot the route** — pick origin + destination, Dijkstra over the 38-waypoint hyperspace lane graph, animated traversal with parsec readout.
- **Ship voyages** — pick the Falcon, see her route across films (~68,000 parsecs).
- **Atlas mode** — toggle to render every major character as an ambient hologram above their homeworld simultaneously.
- **Audio** — opt-in procedural Web Audio cues (no John Williams, no copyright). Seven cues plus an ambient hum.

## Stack

- Next.js 15 (App Router, static export to GitHub Pages)
- React 19
- React Three Fiber 9 + Three.js + drei
- Tailwind CSS v4 (CSS-first `@theme` tokens, OKLCH-only palette)
- Motion (Framer) + GSAP
- Zustand (selection store) + Zod (schema)
- Orama (lexical search) + Transformers.js (semantic embeddings, in-browser)
- 3d-force-graph

No backend. All data is precomputed at build time and shipped statically.

## Data sources

- [SWAPI](https://swapi.info/) — canon people, planets, ships, vehicles, species, films
- [parzivail/SWGalacticMap](https://github.com/parzivail/SWGalacticMap) — Legends planet coordinates (5,444 planets)
- [Wookieepedia](https://starwars.fandom.com/) — hand-curated wars, battles, lineage, comics, video games, non-Disney films, hyperspace-lane waypoints, quotes
- [Wikipedia REST API](https://en.wikipedia.org/api/rest_v1/) — long-form descriptions for 192/310 entities
- [Hugging Face / Xenova/all-MiniLM-L6-v2](https://huggingface.co/Xenova/all-MiniLM-L6-v2) — 384-dim semantic embedding model

## Local development

```bash
git clone https://github.com/adhit-r/holocron.git
cd holocron
npm install
```

Build the data artifacts (in dependency order):

```bash
npm run build:lanes        # parzivail coords + hyperspace lanes
npm run build:kb           # SWAPI ingestion + parzivail merge
npm run build:descriptions # enrich kb.json with Wikipedia summaries
npm run build:lineage      # Force lineage graph
npm run build:wars         # in-universe wars + battles
npm run build:legends      # non-Disney films + comics + games + clip links
npm run build:embeddings   # semantic vectors (rerun after any kb.json change)
```

Then start the dev server:

```bash
npm run dev
```

Open http://localhost:3000.

## Build for production

The repo ships with a [GitHub Actions workflow](.github/workflows/deploy.yml) that builds and deploys to GitHub Pages on every push to `main`. To build locally:

```bash
NEXT_PUBLIC_BASE_PATH=/holocron npm run build
```

Output is written to `out/`. Drop `NEXT_PUBLIC_BASE_PATH` if you're hosting at a domain root.

## Project layout

```
app/                Next.js App Router routes (/, /explore)
components/         React components grouped by surface
  galaxy/           3D galaxy view + holograms + connection web + voyages
  timeline/         Top-down view + lanes + faction + war theatres
  lineage/          3D force-directed lineage graph
  explorer/         App shell, datapad, search palette, audio toggle
data/build/         Static JSON artifacts (kb, lanes, lineage, wars, …)
lib/                Schema, store, data loaders, search, audio
public/data/        vectors.bin + meta (semantic search index)
scripts/            Build pipelines that emit data/build/
PRODUCT.md          Product brief — register, users, design principles
DESIGN.md           Visual system — color, typography, components
SHAPE.md            Design brief for v1 features
```

## License & Disclaimer

Code in this repository: MIT.

Star Wars and related marks (characters, vehicles, planets, films, games, comics) are the property of Lucasfilm Ltd. Data ingested from public sources is used here under fair-use commentary in a non-commercial educational archive. This project is not affiliated with, endorsed by, or sponsored by Lucasfilm or The Walt Disney Company.

Quotes are short snippets used for commentary. No film clips are embedded; the project links out to Lucasfilm's official YouTube channel where applicable.
