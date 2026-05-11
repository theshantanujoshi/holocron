# OG image regeneration

The Open Graph card lives at `public/og.png` as a committed static asset
(1200×630, image/png). This avoids two GH Pages serving issues that
broke social previews when the OG image was a Next.js dynamic route:

1. The auto-generated `/opengraph-image` URL has no file extension →
   GH Pages serves `application/octet-stream`, which Facebook/LinkedIn/
   Discord/Slack reject as a non-image.
2. Next.js's file-convention OG image override-injects the
   `og:image` meta tag at that bad URL, ignoring any manual override
   in `metadata.openGraph.images`.

So we render the PNG once and commit it. To update the card:

```bash
# 1. Restore the dynamic route temporarily
cp scripts/og/card.tsx app/opengraph-image.tsx

# 2. Edit content (title label, stats, CTA copy, etc.) in either file
#    — keep them in sync.

# 3. Build (dynamic route renders the PNG into out/)
NEXT_PUBLIC_BASE_PATH=/holocron npm run build

# 4. Copy the generated PNG over the committed static asset
cp out/opengraph-image public/og.png

# 5. Remove the dynamic route so it doesn't override the meta tag
rm app/opengraph-image.tsx

# 6. Commit public/og.png (and scripts/og/card.tsx if you edited it)
git add public/og.png scripts/og/card.tsx
git commit -m "og: refresh card"
```

Every visible string on the card lives in `card.tsx` — wordmark, tagline,
v-label, the four stats, the CTA pill, and the bottom credits.

Layout notes (Satori quirks worth knowing):
- `marginTop: "auto"` does NOT reliably push children to the bottom of a
  flex column — use an explicit `<div style={{ flex: 1 }} />` spacer.
- All text-bearing elements need an explicit `display: "flex"` parent or
  Satori throws "Expected `display: flex` on the parent."
- Use `<span>` siblings inside a flex-column `<div>` instead of `<br />`
  for multi-line text.
- The bundled font does not include most decorative Unicode glyphs
  (▷ ▶ ★ → etc.) — render those as inline SVG instead.
