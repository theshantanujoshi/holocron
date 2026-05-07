# Product

## Register

product

## Users

Star Wars researchers, lore-fluent fans, and curious newcomers who want to navigate the galaxy as a living knowledge graph rather than read a wall of text. Primary context: a desk session at night on a 27" monitor, in flow, cross-referencing characters / planets / events. Secondary: phone, in bed, "who was Mace Windu's master?" The job to be done is *spatial-temporal-relational lookup* — questions whose answers depend on where, when, and who-with — not trivia retrieval.

## Product Purpose

Holocron is a unified explorer for the Star Wars universe. One selection state drives four coupled views — a 3D galaxy, a temporal scrubber, a Force-lineage graph, and a datapad — so any entity can be inspected through space, time, relationships, and lore in a single coherent move. Success looks like: a user picks "Anakin," and within one second the galaxy zooms to Tatooine, the timeline lands on 41 BBY, the lineage tree highlights Qui-Gon→Obi-Wan→Anakin→Luke, and the datapad surfaces canonical lore. No competitor combines all four.

## Brand Personality

**Archival, precise, cinematic.** The voice is a New Republic Archives navigation console — restrained, data-dense, premium. Numbers feel technical (BBY/ABY in mono); typography is editorial-disciplined; transitions are sub-second hyperspace dollies, never cuts. Star Wars-canonical without ever being game-y or fan-art-y.

## Anti-references

- starwars.com / EA Star Wars game UIs — gradient text, faux-metal HUDs, "may the force be with you" microcopy.
- Generic AI-purple SaaS dashboards — neon glow, gradient blobs, lavender accents, decorative motion.
- Wookieepedia article view — endless prose, no spatial sense, sidebar infobox cliché.
- Cluttered Flash-era galactic atlases — too many simultaneous labels, no hierarchy, no LOD.
- Cliché Aurebesh-as-UI-label decoration — Aurebesh appears only as decorative cipher (section markers, watermarks), never as functional text users must read.

## Design Principles

1. **One selection, four views.** No view stands alone. Every interaction propagates through the others; the demo moment is choreography, not a single screen.
2. **Real data or nothing visible.** No placeholder names, no "Lorem", no fake metrics. Until the pipeline lands real entities, surfaces show explicit loading states. Canon entities are tagged; Legends entities are tagged; provenance is visible on demand.
3. **Earned density.** This is a tool for people who care about the details — parsec rulers, sector grids, BBY/ABY dates, canon flags. Density is rewarded, not punished. But density is *layered* via LOD, never dumped at once.
4. **Hyperspace as transition language.** State changes traverse space, never cut. Selecting a new entity should feel like jumping to it. Reduced-motion users get instant equivalents — never a degraded experience.
5. **Accessibility is structural, not bolt-on.** Every 3D state has a 2D textual mirror. Keyboard users get the same paths as mouse users. Color is never the sole carrier of meaning (canon vs Legends has a glyph + label, not just a color).

## Accessibility & Inclusion

- WCAG 2.2 AA target across all surfaces.
- Full keyboard path; visible `:focus-visible` rings on every interactive element.
- `prefers-reduced-motion`: timeline scrubbing, hyperspace transitions, and lineage graph animations all become instant cuts. No essential information is communicated only through motion.
- 2D textual mirror: any 3D selection has a structured table/list equivalent reachable via a single keystroke (`?`).
- Color independence: canon vs Legends uses an icon + label, not hue alone. Faction states use shape variants in addition to color.
- Type scale never goes below 14px for body text; 12px reserved for axis ticks and metadata.
- Respects user-zoom up to 200% without horizontal scroll on the chrome (3D canvas may pan).
