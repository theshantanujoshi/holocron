import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { COLORS, FONTS } from "../tokens";

/**
 * Galaxy scene — 9 seconds. Pure CSS / SVG (no R3F) for fast Remotion render.
 *
 *   0 ─ 30f   hero copy fades in
 *  30 ─ 90f   starfield expands + planets pop in (staggered)
 *  90 ─ 180f  hyperspace lanes draw
 * 180 ─ 270f  ships traverse the lanes; subtitle swap
 */

const STARS = generateStars(220);
const PLANETS = [
  { name: "Coruscant", x: 50, y: 50, size: 12, color: COLORS.accent, delay: 30 },
  { name: "Tatooine", x: 72, y: 65, size: 10, color: "rgb(214, 168, 110)", delay: 38 },
  { name: "Hoth", x: 28, y: 28, size: 9, color: "rgb(180, 220, 240)", delay: 46 },
  { name: "Endor", x: 78, y: 22, size: 8, color: "rgb(120, 180, 130)", delay: 54 },
  { name: "Mustafar", x: 60, y: 75, size: 10, color: COLORS.alarm, delay: 62 },
  { name: "Geonosis", x: 64, y: 38, size: 8, color: "rgb(220, 150, 110)", delay: 70 },
  { name: "Naboo", x: 42, y: 70, size: 9, color: "rgb(140, 180, 220)", delay: 78 },
  { name: "Yavin IV", x: 70, y: 28, size: 9, color: "rgb(150, 180, 130)", delay: 86 }
];

const LANES = [
  { from: { x: 50, y: 50 }, to: { x: 72, y: 65 }, name: "Hydian Way", drawAt: 90 },
  { from: { x: 50, y: 50 }, to: { x: 78, y: 22 }, name: "Perlemian Trade Route", drawAt: 110 },
  { from: { x: 50, y: 50 }, to: { x: 28, y: 28 }, name: "Corellian Run", drawAt: 130 },
  { from: { x: 50, y: 50 }, to: { x: 60, y: 75 }, name: "Rimma Trade Route", drawAt: 150 }
];

function generateStars(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    x: ((i * 137 + 23) % 1000) / 10,
    y: ((i * 71 + 47) % 1000) / 10,
    r: i % 23 === 0 ? 2.4 : i % 11 === 0 ? 1.6 : 0.8,
    op: i % 17 === 0 ? 0.9 : 0.5
  }));
}

export function GalaxyScene() {
  const frame = useCurrentFrame();

  // Camera-style slow zoom-out
  const zoom = interpolate(frame, [0, 270], [1.06, 1], { extrapolateRight: "clamp" });

  // Subtitle swap at f=180
  const subtitle1Op = interpolate(frame, [0, 18, 170, 180], [0, 1, 1, 0], { extrapolateRight: "clamp" });
  const subtitle2Op = interpolate(frame, [180, 200, 260, 270], [0, 1, 1, 0.4], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.bgDeep,
        overflow: "hidden",
        transform: `scale(${zoom})`,
        transformOrigin: "55% 50%"
      }}
    >
      {/* Galactic backdrop radial gradient */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at 55% 50%, rgba(95, 191, 255, 0.05), transparent 60%)`
        }}
      />

      {/* Starfield */}
      <svg
        viewBox="0 0 1000 562"
        preserveAspectRatio="xMidYMid slice"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      >
        {STARS.map((s, i) => {
          const op = interpolate(frame, [Math.min(i % 30, 30), 30 + (i % 30)], [0, s.op], {
            extrapolateRight: "clamp"
          });
          return (
            <circle
              key={i}
              cx={s.x * 10}
              cy={s.y * 5.62}
              r={s.r}
              fill={COLORS.fgPrimary}
              opacity={op}
            />
          );
        })}

        {/* Hyperspace lanes */}
        {LANES.map((l, i) => {
          const t = interpolate(frame, [l.drawAt, l.drawAt + 30], [0, 1], {
            extrapolateRight: "clamp"
          });
          const x1 = (l.from.x / 100) * 1000;
          const y1 = (l.from.y / 100) * 562;
          const x2 = (l.to.x / 100) * 1000;
          const y2 = (l.to.y / 100) * 562;
          const cx = x1 + (x2 - x1) * t;
          const cy = y1 + (y2 - y1) * t;
          return (
            <g key={i}>
              <line
                x1={x1}
                y1={y1}
                x2={cx}
                y2={cy}
                stroke={COLORS.accent}
                strokeWidth={1.2}
                strokeDasharray="6 4"
                opacity={0.55}
              />
              {/* Ship glyph traversing */}
              {frame > l.drawAt + 30 && (
                <polygon
                  points={`${cx - 3},${cy + 3} ${cx + 4},${cy} ${cx - 3},${cy - 3}`}
                  fill={COLORS.accent}
                  opacity={Math.sin((frame - l.drawAt) * 0.1) * 0.3 + 0.7}
                />
              )}
            </g>
          );
        })}

        {/* Planets */}
        {PLANETS.map((p, i) => {
          const popIn = interpolate(frame, [p.delay, p.delay + 14], [0, 1], {
            extrapolateRight: "clamp"
          });
          const cx = (p.x / 100) * 1000;
          const cy = (p.y / 100) * 562;
          return (
            <g key={i} opacity={popIn}>
              {/* Halo */}
              <circle cx={cx} cy={cy} r={p.size * 1.8} fill={p.color} opacity={0.18} />
              <circle cx={cx} cy={cy} r={p.size} fill={p.color} />
              <text
                x={cx}
                y={cy + p.size + 14}
                fill={COLORS.fgMuted}
                fontSize={11}
                fontFamily={FONTS.mono}
                textAnchor="middle"
                letterSpacing="0.08em"
                style={{ textTransform: "uppercase" }}
              >
                {p.name}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Top-left HUD label */}
      <div
        style={{
          position: "absolute",
          top: 32,
          left: 48,
          fontFamily: FONTS.mono,
          fontSize: 14,
          color: COLORS.fgDim,
          letterSpacing: "0.24em",
          textTransform: "uppercase"
        }}
      >
        Galaxy view · sector grid · 1500 pc
      </div>

      {/* Headline */}
      <div
        style={{
          position: "absolute",
          left: 64,
          bottom: 72,
          maxWidth: 580
        }}
      >
        <h2
          style={{
            fontFamily: FONTS.sans,
            fontSize: 56,
            fontWeight: 600,
            color: COLORS.fgStrong,
            letterSpacing: "-0.02em",
            lineHeight: 1.05,
            margin: 0,
            opacity: subtitle1Op
          }}
        >
          The galaxy,
          <br />
          indexed.
        </h2>

        <p
          style={{
            fontFamily: FONTS.mono,
            fontSize: 14,
            color: COLORS.fgMuted,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            margin: "20px 0 0",
            opacity: subtitle1Op
          }}
        >
          318 entities · 5 hyperspace lanes · 240 ships in motion
        </p>

        <p
          style={{
            position: "absolute",
            top: 0,
            fontFamily: FONTS.sans,
            fontSize: 36,
            color: COLORS.accent,
            fontWeight: 500,
            letterSpacing: "-0.01em",
            lineHeight: 1.1,
            margin: 0,
            opacity: subtitle2Op
          }}
        >
          Click anything.
          <br />
          See it everywhere.
        </p>
      </div>
    </AbsoluteFill>
  );
}
