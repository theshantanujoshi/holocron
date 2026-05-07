# Shape — Holocron v1 Design Brief

## 1. Feature Summary

Holocron is a unified Star Wars universe explorer with four coupled views — 3D galaxy, temporal scrubber, Force-lineage graph, and datapad — driven by a single shared selection state. v1 ships four killer mechanics: temporal galaxy (faction territories morph across 25,000 BBY → 35 ABY), Force lineage tree (3D master/apprentice graph), semantic search (in-browser embeddings, natural-language queries), and cross-pivot (one selection animates all four views in sub-second hyperspace transitions).

## 2. Primary User Action

Pick an entity (anywhere) → see it situated in space, time, and relationships simultaneously.

The cross-pivot is the user's primary lever and the demo moment. Every other interaction is in service of getting them to or from a cross-pivot.

## 3. Design Direction

- **Color strategy**: Committed (single saturated holo-blue accent against tinted near-black). Per DESIGN.md.
- **Theme**: Dark only. Scene sentence: *"A Star Wars researcher at a 27\" monitor at night, deep in flow, scrubbing through 25,000 years of galactic history to verify a citation."*
- **Anchor references** (3 named):
  1. **Apple Vision Pro Maps + NASA Eyes on the Solar System** — atmospheric 3D navigation with overlaid data, no game UI feel.
  2. **Linear** — app structure, type discipline, command palette, density.
  3. **Teenage Engineering OP-1 + Are.na** — restraint, archive-quality typography, anti-flashy editorial bones.
- **Visual probes**: skipped — this harness has no native image generation tool. Direction is anchored by references and DESIGN.md tokens instead.

## 4. Scope

- **Fidelity**: production-ready.
- **Breadth**: full surface — landing/intro + four-view explorer + entity datapad.
- **Interactivity**: shipped-quality, real data from real APIs, real network calls, real animations.
- **Time intent**: polish until ready to demo. No throwaway scaffolding allowed in shipped code.

## 5. Layout Strategy

### Landing / intro (single screen, asymmetric split)
- Left 45%: wordmark + one-sentence positioning + primary CTA (`Enter the archive`) + small canon/Legends data-source attributions in mono caption.
- Right 55%: live 3D galaxy preview, slowly rotating, with 6–10 named planets visible at low LOD.
- No "features grid," no "how it works," no AI-slop hero. The galaxy IS the pitch.

### Explorer (the core surface — what users live in)
Three-column app shell:
```
┌──────────┬───────────────────────────┬──────────┐
│ NAV      │ PRIMARY VIEW              │ DATAPAD  │
│ rail     │ (galaxy/timeline/lineage) │ entity   │
│ 64px     │ flex-grow                 │ panel    │
│          │                           │ 360px    │
│          │ Below primary view:       │          │
│          │ TIMELINE SCRUBBER 80px    │          │
└──────────┴───────────────────────────┴──────────┘
```
- Nav rail (64px) — view-switcher icons + search trigger + canon/Legends toggle.
- Primary view — fills remaining space; switches between Galaxy / Timeline / Lineage modes (all share selection state).
- Timeline scrubber (80px tall, full width below primary) — always visible; drives temporal layer of whichever primary view is active.
- Datapad (360px right rail) — entity detail; collapsible to 0 on small viewports; pinnable.

### Mobile (<768px)
Single-column stacked: Galaxy → current entity datapad → Timeline → Lineage. Cross-pivots scroll between sections rather than animate within a single canvas.

### Visual rhythm
- Hairline 1px dividers separate columns; no heavy borders.
- The galaxy canvas bleeds to its column edges (no inset padding); chrome around it has 24px gutters.
- Hierarchy through type weight + accent placement, not size.

## 6. Key States

| Surface | States to design |
|---|---|
| Landing | default, loading-galaxy, low-perf-fallback (static SVG instead of WebGL), error (data load failure with retry), reduced-motion (no rotation) |
| Galaxy view | far / mid / close zoom levels (LOD), hovered planet, selected planet, no-selection, era-filtered (planet hidden because not yet discovered in current era), loading-3D, WebGL-unsupported fallback |
| Timeline scrubber | default, dragging, snapping-to-event, era-filtered (faction polygon visible/not), reduced-motion (instant scrubs) |
| Lineage view | default tree, single subject focused, expanded ancestry, expanded descendants, isolated (no relationships found), loading |
| Datapad | empty (no selection — explainer text + "pick anything"), loading (skeleton matching final shape), populated, canon, Legends, both-have-data (canon/Legends toggle visible inside the card) |
| Search palette | closed, focused, typing, empty results, results, embedding-model-loading (one-time first-open), error |
| Cross-pivot transition | the sub-second choreography itself is a state — beginning, mid, settled |

Empty states never use generic "no results" stock illustrations. Each is composed: e.g. lineage-empty for a non-Force user shows a faint datapad echo with the line "No Force-sensitive lineage on record."

## 7. Interaction Model

- **Selection**: any clickable entity (planet pin, timeline event card, lineage node, datapad cross-link) writes to a global Zustand store. All four views subscribe and animate to the new state.
- **Cross-pivot transition** (the demo): 600–900ms hyperspace dolly. GSAP runs the camera; an accent-line streak overlay sweeps across the canvas; the datapad layout-animates to the new entity (`layoutId`); the timeline scrubber slides to the entity's anchor date.
- **Search** (keyboard `/` or `cmd+k`): command-palette slides up from bottom; first open lazy-loads the embedding model with a deliberate "Loading semantic index" status; subsequent opens are instant. Results are entity chips with kind/canon/era metadata. Enter selects → triggers cross-pivot.
- **Timeline scrubbing**: drag the playhead; faction territory polygons morph; planets fade in/out per their first-appearance era; events that intersect the playhead surface as floating chips with leader-lines to the planet they happened on.
- **Galaxy interaction**: orbit (drag), zoom (wheel/pinch), no free-look. Click a planet → datapad updates. Right-click / long-press → contextual mini-menu (`Show on lineage`, `Filter timeline by this planet`).
- **Lineage view**: the 3d-force-graph from vasturiano. Click a node → cross-pivot. Hover → highlight ancestry path. Toggle to switch between master/apprentice / blood / faction-membership relation types.
- **Canon/Legends toggle**: in the nav rail. Adds Legends entities to all views; canon entities are unchanged. Indicator chip appears when Legends is active.
- **Reduced motion**: cross-pivot becomes 80ms cross-fade; perpetual motion stops; scrubbing is instant.

## 8. Content Requirements

All copy must be:
- Direct, technical, archive-voice.
- No "Elevate / Seamless / Unleash / Next-Gen" filler (per design-taste-frontend Forbidden Patterns).
- No em dashes (per impeccable). Use commas, colons, semicolons, parens, periods.
- No exclamation marks anywhere.

### Copy inventory (initial draft)

- **Wordmark**: `HOLOCRON`
- **Tagline**: `Archive of the galaxy. Canon and Legends, mapped.`
- **Primary CTA**: `Enter the archive`
- **Empty datapad**: `Pick a planet, person, ship, or event. The archive responds across space, time, and lineage.`
- **Search placeholder**: `Search the archive — planets, people, events, "Jedi who fell after Order 66"…`
- **Loading semantic index**: `Loading semantic index. First-open only. ~3s.`
- **Canon toggle on**: `Canon`
- **Legends toggle on**: `+ Legends`
- **Era display format**: `41 BBY`, `19 BBY`, `0 ABY` (always with the suffix in mono)
- **Coord format**: `Outer Rim · Arkanis sector · M-19` (interpunct separators, mono numerics)
- **No-results semantic search**: `No archive match. Try a planet, person, ship, or event.`
- **WebGL unavailable**: `3D rendering not available. Showing 2D archive view.` + auto-fallback.
- **Data freshness footer (mono caption)**: `Built [build-date] · Sources: SWAPI, Wookieepedia (CC-BY-SA), open community datasets`

Dynamic content ranges (worth designing for):
- Datapad lore: 0 (placeholder) → 5 paragraphs typical → 50+ for major characters. Truncate with `Read more` after 3 paragraphs.
- Lineage tree: 1 node (isolated character) → 40+ nodes (Skywalker / Sith Order full unfurl).
- Timeline events at one moment: 0 → 200+ at 19 BBY. Cluster + zoom for >12 simultaneous.
- Galaxy planet count visible: 6 (far) → 200 (close) — LOD enforced.

## 9. Recommended References (impeccable docs to consult during build)

- `spatial-design.md` — the three-column shell + responsive collapse.
- `motion-design.md` — cross-pivot choreography, perpetual micro-motion, reduced-motion handling.
- `interaction-design.md` — command palette, drag-scrub, multi-state selection.
- `color-and-contrast.md` — Committed strategy, accent functional usage rules.
- `responsive-design.md` — desktop-first 3D collapse to mobile stack.
- `ux-writing.md` — archive voice, technical microcopy.

## 10. Open Questions (to resolve in build)

- **Image assets**: starting with shader-driven procedural planets (no IP exposure). If the user later wants illustrated planet portraits, that's a separate asset commission.
- **Audio**: off in v1; opt-in ambient layer is a v1.1 candidate, gated on a final UX call about non-music-Williams sound.
- **Plane integration**: the user's CLAUDE.md mentions Plane as their tracker; not wiring it into Holocron unless asked. This project is treated as a standalone build, not a FairMind sub-project.
- **Build pipeline performance**: if `transformers.js` build-time embedding takes >2 minutes, switch to a smaller model (`gte-tiny` instead of `gte-small`) — decided based on first run's actual timing, not pre-emptively.

## Confirmation

Treating "you decide" + "everything at one go" as the user's explicit delegation per shape.md ("If the user delegates, pick the strongest direction and explain the decision using the brief, not personal taste"). Brief considered confirmed for craft to proceed; user can interrupt at any time and I will pivot.

`shape=pass` (delegated). `mutation=open`. Proceeding to Step 2 (load references) and Step 5 (build).
