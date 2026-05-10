import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, FONTS } from "../tokens";
import { HolocronGlyph } from "./HolocronGlyph";

/**
 * Title scene — 3 seconds.
 *
 *   0 ─ 18f   glyph + wordmark spring in
 *  18 ─ 60f   tagline fades in
 *  60 ─ 90f   everything holds, then fades out
 */
export function TitleScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const glyphSpring = spring({ frame, fps, config: { stiffness: 140, damping: 18 } });
  const taglineOpacity = interpolate(frame, [18, 36], [0, 1], { extrapolateRight: "clamp" });
  const taglineY = interpolate(frame, [18, 36], [12, 0], { extrapolateRight: "clamp" });

  // Hold from 36 to 70, then fade out 70 → 90
  const fadeOut = interpolate(frame, [70, 90], [1, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.bgDeep,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        opacity: fadeOut
      }}
    >
      {/* Sector grid backdrop */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `
            linear-gradient(${COLORS.accentFaint} 1px, transparent 1px),
            linear-gradient(90deg, ${COLORS.accentFaint} 1px, transparent 1px)
          `,
          backgroundSize: "120px 120px",
          opacity: 0.18
        }}
      />

      {/* Glyph spring */}
      <div
        style={{
          transform: `scale(${0.6 + glyphSpring * 0.4})`,
          opacity: glyphSpring
        }}
      >
        <HolocronGlyph size={120} stroke={1.0} />
      </div>

      {/* Wordmark */}
      <h1
        style={{
          fontFamily: FONTS.sans,
          fontSize: 96,
          fontWeight: 600,
          color: COLORS.fgStrong,
          letterSpacing: "0.06em",
          margin: "32px 0 0",
          opacity: glyphSpring,
          transform: `translateY(${(1 - glyphSpring) * 12}px)`
        }}
      >
        HOLOCRON
      </h1>

      {/* Tagline */}
      <p
        style={{
          fontFamily: FONTS.mono,
          fontSize: 18,
          color: COLORS.fgDim,
          letterSpacing: "0.32em",
          textTransform: "uppercase",
          marginTop: 24,
          opacity: taglineOpacity,
          transform: `translateY(${taglineY}px)`
        }}
      >
        Galactic archive · v0.10
      </p>
    </AbsoluteFill>
  );
}
