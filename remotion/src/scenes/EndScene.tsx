import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, FONTS } from "../tokens";
import { HolocronGlyph } from "./HolocronGlyph";

/**
 * End scene — 6 seconds.
 *
 *   0 ─ 24f   wordmark + tagline spring in
 *  24 ─ 60f   stats row staggers in
 *  60 ─ 120f  CTA pulses
 * 120 ─ 180f  hold, then gentle fade
 */

const STATS = [
  { label: "Repo", value: "github.com/adhit-r/holocron" },
  { label: "Live", value: "adhit-r.github.io/holocron" },
  { label: "Issues", value: "26 open · 5 good first" }
];

export function EndScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const heroSpring = spring({ frame, fps, config: { stiffness: 130, damping: 18 } });
  const fadeOut = interpolate(frame, [150, 180], [1, 0], { extrapolateRight: "clamp" });

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
      {/* Backdrop fade */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse at 50% 50%, rgba(95, 191, 255, 0.06) 0%, transparent 60%)`
        }}
      />

      {/* Glyph + wordmark */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 24,
          opacity: heroSpring,
          transform: `translateY(${(1 - heroSpring) * 12}px)`
        }}
      >
        <HolocronGlyph size={72} stroke={1.2} />
        <h1
          style={{
            fontFamily: FONTS.sans,
            fontSize: 80,
            fontWeight: 600,
            color: COLORS.fgStrong,
            letterSpacing: "0.06em",
            margin: 0
          }}
        >
          HOLOCRON
        </h1>
      </div>

      <p
        style={{
          fontFamily: FONTS.mono,
          fontSize: 16,
          color: COLORS.fgMuted,
          letterSpacing: "0.4em",
          textTransform: "uppercase",
          marginTop: 24,
          opacity: heroSpring
        }}
      >
        The galaxy, indexed.
      </p>

      {/* Stats grid */}
      <div
        style={{
          display: "flex",
          gap: 64,
          marginTop: 64
        }}
      >
        {STATS.map((s, i) => {
          const start = 24 + i * 8;
          const op = interpolate(frame, [start, start + 18], [0, 1], { extrapolateRight: "clamp" });
          const y = interpolate(frame, [start, start + 18], [12, 0], { extrapolateRight: "clamp" });
          return (
            <div
              key={s.label}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                opacity: op,
                transform: `translateY(${y}px)`
              }}
            >
              <div
                style={{
                  fontFamily: FONTS.mono,
                  fontSize: 11,
                  color: COLORS.fgDim,
                  letterSpacing: "0.32em",
                  textTransform: "uppercase"
                }}
              >
                {s.label}
              </div>
              <div
                style={{
                  fontFamily: FONTS.mono,
                  fontSize: 16,
                  color: COLORS.accent,
                  letterSpacing: "0.04em"
                }}
              >
                {s.value}
              </div>
            </div>
          );
        })}
      </div>

      {/* CTA */}
      <div
        style={{
          marginTop: 56,
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 24px",
          border: `1px solid ${COLORS.accentFaint}`,
          borderRadius: 999,
          fontFamily: FONTS.mono,
          fontSize: 14,
          color: COLORS.accent,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          opacity: interpolate(frame, [60, 84], [0, 1], { extrapolateRight: "clamp" }),
          transform: `scale(${1 + Math.sin((frame - 60) * 0.08) * 0.02})`
        }}
      >
        ★ Star on GitHub
      </div>
    </AbsoluteFill>
  );
}
