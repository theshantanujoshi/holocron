# Roadmap

## Vision

A single tool for navigating the Star Wars universe through space, time, relationships, and lore. The wedge: no other product couples a 3D galaxy, temporal scrubber, lineage graph, and entity detail under one selection state. The cross-pivot — pick anything, watch all four views animate to it — is the demo moment.

Holocron is built around an offline-first static-export model. Data ingest happens at build time; the runtime is just the browser and the precomputed artifacts.

## Released

### v0.1 — Foundation (Phase 0–3)
- Next.js 15 + React 19 + R3F + Tailwind v4 scaffolding
- 260 entities ingested from SWAPI
- Galaxy view with deterministic planet placement, orbit camera, hover/select labels
- Datapad with canon/Legends glyph, era data, cross-linkable relations
- Hyperspace cross-pivot streak overlay

### v0.2 — Cross-pivot + Search
- Camera lerp from anywhere to selected planet
- Orama text search palette (`/` or `⌘K`)
- Three-column app shell with NavRail + TimelineScrubber

### v0.3 — Real galaxy + lineage
- 5,444 parzivail Legends planet coords merged into kb.json (57/60 SWAPI matches)
- 5 named hyperspace lanes drawn (Hydian Way, Corellian Run, Perlemian, Rimma, Corellian Trade Spine)
- 33-node Force-lineage graph (Yoda → Dooku → Sidious chain, Skywalker family)
- 3D force-directed lineage view with Sith / Jedi / civilian classification
- Wikipedia-enriched lore on 192/260 entities
- Mobile-responsive DatapadDrawer
- Hybrid lexical + semantic search (Transformers.js MiniLM-L6-v2, 390 KB vectors)

### v0.4 — Visual layers
- HolographicFigure (custom GLSL shader: scanlines + fresnel + flicker)
- ConnectionWeb (3D lines fan out to related entities)
- ForcePulse (concentric rings around selected Force users)
- Holocard (drei `<Html transform>` floating 3D card with parallax tilt)
- AtlasMode (~20 ambient holograms above major homeworlds)
- FactionTerritory (era-aware translucent faction polygons in timeline)
- AudioCueDispatcher + opt-in Web Audio (7 cues + ambient hum)
- EntityCrawl (per-entity Star Wars opening crawl)

### v0.5 — Plot the route + ship voyages
- Dijkstra over 38-waypoint hyperspace lane graph
- Pick origin + destination → animated traversal with parsec / ETA readout
- Ship voyages: Falcon's film-by-film route (68,011 pc, 11 waypoints)

### v0.6 — Wars + Legends content
- 8 in-universe wars + 26 battles (canonical from Wookieepedia)
- WarTheatre convex-hull overlays in timeline view
- BattleMarker compass-stars (distinct from event octahedrons)
- 7 non-Disney films, 24 comics across 6 trilogy eras, 19 video games (all Legends-tagged)
- 100 attributed canonical quotes across 23 speakers
- 6 official YouTube clip links on canon films
- Datapad gains "Memorable quotes" section

### v0.7 — Deploy
- Static export configuration + GitHub Actions workflow
- Logo redesign: isometric holocron-cube glyph
- Live at https://adhit-r.github.io/holocron/

## Next

### v0.8 — Visual critique pass
- Open the deployed site, capture screenshots at desktop and mobile widths
- Audit hierarchy, spacing, type rhythm, motion timing
- Fix what's off
- *Blocker today: Chrome MCP / computer-use offline; needs user-driven inspection or restored automation*

### v0.9 — Sequel-era completeness
- Sequel-era planets (Jakku, Takodana, Ahch-To, Crait, Kef Bir, D'Qar) — anchor table + parzivail backfill
- Unlocks fuller First Order war theatre + post-ROTJ Falcon voyage
- Sequel-trilogy films wired into ship `appears_in` graphs

### v1.0 — Ship-ready polish
- Per-component memo audit (re-render storms eliminated)
- Mobile-first parity check (every state reachable on touch)
- Reduced-motion full coverage audit
- A11y pass: focus-visible everywhere, aria-live on every selection-driven region, skip-link reaches all main regions
- Performance pass: bundle-size tree-shake, lazy-load every layer not needed on first paint
- Sound design refinement: ambient hum mix, cue volumes calibrated against hover/click cadence
- Browser screenshot regression tests if automation comes back online

## Future

### Phase 2 ideas
- **WebGPU stars** — bump particle count from 9k to 1M on supported browsers via R3F's WebGPU renderer + compute shaders
- **Faction territory cartography** — derive war theatres + faction regions programmatically from per-sector affiliation in parzivail data (alpha-shape over member planets), eliminating hand-curated polygons
- **Books & novels** — ingest Star Wars novel publications as a new entity type; ~500+ entries across canon and Legends
- **Music themes per character** — Web Audio synthesis of leitmotifs (still no Williams cues; original procedural compositions instead)
- **Battle ships interactive** — battles' `shipsInvolved` arrays become clickable chips that select the ship entity

### Phase 3 ideas
- **WebXR** — view the galaxy through Vision Pro / Quest headsets
- **Real-time multiplayer cursors** — see other archive visitors' selections live (would require a backend)
- **Ambient TTS narration** — when the entity crawl plays, optionally synthesize the speaker's voice via browser TTS
- **Story-mode tours** — guided cross-pivot sequences ("the rise of Vader," "the fall of the Old Republic")
- **Custom timelines** — user-defined event filtering and bookmarking

### Won't do
- Embedded Lucasfilm video clips (IP risk; we link out instead)
- Star Wars music (copyright)
- AI-generated character likenesses (procedural-only by design)
- A backend, account system, or any user-data persistence

## Decision log

- **Holocron name kept** (instead of renaming to Vergence or similar): canonical Star Wars term, matches the repo URL, already woven through PRODUCT.md / DESIGN.md / opening crawl.
- **Static export over dynamic SSR**: zero-cost hosting on GitHub Pages, no backend to maintain, infinite scale.
- **Procedural holograms over rendered models**: avoids IP exposure and per-character asset commissioning.
- **Hybrid lex + semantic search over either alone**: lexical handles exact-name precision; semantic handles natural-language phrasing. 50/50 weighted-sum lets users see which side a hit came from.
- **Dual-namespace canon + Legends**: canon by default, Legends as a layer toggle. Both are tagged in the Entity schema; the canon/Legends glyph distinguishes them at every UI surface.
- **Quotes as fair-use commentary**: short snippets attributed to canonical speakers. No long passages, no full scenes.
- **No emojis anywhere**: per design system. Phosphor icons only.
