# Todos

Concrete actionable items, ranked. Update as you finish.

## Now (P0)

- [ ] **Verify GitHub Pages deploy** — open https://adhit-r.github.io/holocron/, confirm both `/` and `/explore/` render, hyperspace search opens, vectors.bin loads from `/holocron/data/vectors.bin`
- [ ] **Visual critique pass on deployed site** — capture screenshots desktop + mobile, list everything that looks off, fix top 5
- [ ] **Surface clip links in Datapad** — film entities have `media.officialClipUrl` populated for the 6 canon films, but the UI doesn't show them yet. Add a "Watch official clip" button next to "Crawl" in the Datapad header for film entities.

## Soon (P1)

- [ ] **Sequel-era planets** — add anchor entries for Jakku, Takodana, Ahch-To, Crait, Kef Bir, D'Qar in `lib/data/positions.ts` so post-ROTJ ship voyages and First Order war theatres render fully
- [ ] **Datapad "shipsInvolved" interactivity** — when a battle is selected, render the `shipsInvolved` array as clickable chips. Resolve each ship name against `kb.json`; click → cross-pivot to ship.
- [ ] **Galaxy view: war theatre toggle** — currently only timeline shows war regions. Optionally project them into the galaxy at the active era too (toggleable via NavRail).
- [ ] **Search palette: filter by entity type** — chips at the top (`person / planet / ship / film / comic / game / event`) that narrow results. Hybrid score recomputed against the filtered set.
- [ ] **Datapad: media gallery** — entity has `media.gallery: string[]` slot already in the schema but it's empty for everything. Pick a curated CC-licensed image set per major character / planet, populate, and render a small gallery grid.

## Later (P2)

- [ ] **Books / novels** as a new entity type — top 50 canon + Legends novels with publisher, era, summary
- [ ] **Faction insignia 3D medallions** — when an entity has a primary faction, render a 3D extruded insignia rotating slowly above its hologram
- [ ] **Story-mode tours** — guided cross-pivot sequences for canonical narratives ("the rise of Vader" steps through Anakin → Tatooine → Coruscant → Mustafar → Death Star)
- [ ] **WebGPU stars** — 1M particles via R3F WebGPU renderer; fall back to current InstancedMesh on WebGL2-only devices
- [ ] **Programmatic faction cartography** — derive war / faction polygons from parzivail per-sector affiliation data via alpha-shape; replace hand-curated `lib/data/faction-territories.ts` and `lib/data/wars-battles.ts` theatre polygons
- [ ] **Per-entity event annotations** — events should be linkable to multiple entities, not just one location; surface event chains on entity timelines

## Tech debt

- [ ] **AudioCueDispatcher dedup** — pivot cue fires both on view switch and on selection; double-fire feels noisy
- [ ] **3d-force-graph teardown** — destructor occasionally throws on HMR; the swallow is fine for dev but should be cleaner
- [ ] **lib/data/quotes.ts JSDoc URL collision** — earlier reports mentioned a parsing issue with a URL inside a JSDoc block; verify it's resolved on the deployed build
- [ ] **build-kb idempotency** — running `npm run build:kb` overwrites `kb.json`, dropping any enrichment from `build:descriptions` and `build:legends`. Consider a single `build:all` that orchestrates the full pipeline in dependency order.
- [ ] **Galaxy SceneController vs route mode** — currently the camera lerp is suppressed during route mode. Verify the user can still inspect a planet via single-click during route picking without firing a route pick by accident
- [ ] **Reduced-motion audit** — every animated component claims to respect `prefers-reduced-motion`; do a single sweep verifying nothing slipped (Holocard parallax, ForcePulse rings, ShipVoyage glyph, FactionTerritory opacity transitions, BattleMarker pulse)
- [ ] **`out/` gitignore caveat** — `out/` is gitignored so local builds don't pollute the working tree, but the GitHub Actions workflow uploads it as the deploy artifact

## Ideas (no commitment)

- [ ] **Aurebesh decoder mini-game** — hover over Aurebesh-cipher decoration → reveals the Latin-letter equivalent. Pure delight, doesn't change architecture.
- [ ] **Per-entity holo-glyph variant** — different shader patterns for Force users (smoke/whorl), droids (data-flicker), Sith (dark-side red shift)
- [ ] **Era-aware lineage view** — currently classifies Anakin as Sith permanently; an era slider on the lineage view could show his Jedi → Sith → Redeemed transition
- [ ] **"Random vergence" button** — pick a random Force user and run the full demo cross-pivot sequence
- [ ] **Galaxy-as-poster export** — render the current galaxy view at print resolution and download as a PNG/PDF

## Notes for future contributors

- Read `PRODUCT.md`, `DESIGN.md`, `SHAPE.md` before any UI work
- All data is real public data; **never** insert mock or placeholder content (per the project's working rules)
- The visual critique loop requires browser screenshots — set up automation if it isn't already, or do it manually
- New components must respect `prefers-reduced-motion`, dispose Three.js geometries on unmount, and avoid `#000` / `#fff` (OKLCH-only palette)
