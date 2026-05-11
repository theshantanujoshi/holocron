# Holocron Demo (Remotion)

A 30-second Remotion composition that renders the demo MP4 / GIF for the README and social posts. Pure code, deterministic — no manual screen recording required.

## Composition

| Scene | Frames | Seconds | Content |
|---|---|---|---|
| Title | 0–90 | 3s | Wordmark + cube glyph spring-in |
| Galaxy | 90–360 | 9s | Starfield + 8 named planets + 4 hyperspace lanes + traversing ship glyphs + headline copy swap |
| Story Mode + Order 66 | 360–720 | 12s | Era scrubber animates, hologram color shifts, **Order 66 cinematic fires with 14 staggered red pulses + title card**, redemption beat at 4 ABY |
| End card | 720–900 | 6s | Wordmark + URLs + "★ Star on GitHub" CTA |

30 frames per second × 30 seconds = 900 frames total. Output: 1280×720.

## Render

```bash
cd remotion
npm install
npm run render          # → demo.mp4 (~2 MB, web-friendly)
npm run render:gif      # → demo.gif  (~4–8 MB, README-friendly)
npm run render:webm     # → demo.webm (smallest for web)
```

First render takes ~3–5 min (Chromium download + frame rendering). Subsequent renders use the cached browser.

## Live preview

```bash
npm run studio          # Opens Remotion Studio at http://localhost:3000
```

You can scrub through the timeline, tweak any scene, hot-reload.

## Drop into the main README

After rendering, copy `remotion/demo.gif` to the main project root and reference it from the top-level `README.md`:

```markdown
![Holocron demo](./demo.gif)
```

Or upload to a CDN (Imgur, Cloudinary, GitHub release attachment) for a faster first paint.

## Files

```
remotion/
├── package.json            # Standalone deps (Remotion + React 18)
├── tsconfig.json
├── remotion.config.ts      # Codec + pixel format defaults
└── src/
    ├── index.ts            # registerRoot
    ├── Root.tsx            # Composition declaration
    ├── HolocronDemo.tsx    # Main composition (4 sequences)
    ├── tokens.ts           # OKLCH-equivalent colors mirrored from globals.css
    └── scenes/
        ├── TitleScene.tsx
        ├── GalaxyScene.tsx
        ├── StoryScene.tsx
        ├── EndScene.tsx
        ├── HolocronGlyph.tsx   # Reusable cube glyph SVG
        └── Grain.tsx           # Film-grain overlay
```

## Notes

- Remotion uses React 18 here (the main project uses React 19) to avoid version surprises with Remotion's reconciler. Standalone subdirectory keeps deps isolated.
- Color tokens are RGB equivalents of the main project's OKLCH palette so the demo matches the live site's brand.
- Reduce-motion is irrelevant here — the entire composition is rendered video, not live-running motion. The user-facing site respects `prefers-reduced-motion` independently.
