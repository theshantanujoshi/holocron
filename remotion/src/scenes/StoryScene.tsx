import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { COLORS, FONTS } from "../tokens";

/**
 * Story Mode scene — 12 seconds.
 *
 *   0 ─ 30f    "PLAY" appears, era scrubber animates from -32 BBY → -22
 *  30 ─ 90f    Anakin beat — name + quote + era ticks forward
 *  90 ─ 180f   era crosses -19 BBY → ORDER 66 cinematic interrupt
 * 180 ─ 240f   era reaches 4 ABY → Anakin redeemed (cream tint), beat caption
 * 240 ─ 360f   beat caption fades; transition into End scene
 */

const BEATS = [
  { from: 0, to: 90, era: "-32 BBY", caption: "32 BBY · Tatooine", quote: "Are you an angel?", speaker: "Anakin Skywalker" },
  { from: 90, to: 180, era: "-22 BBY", caption: "22 BBY · Geonosis", quote: "I truly, deeply love you.", speaker: "Padmé Amidala" },
  { from: 180, to: 270, era: "-19 BBY", caption: null, quote: null, speaker: null }, // Order 66 fires
  { from: 270, to: 360, era: "4 ABY", caption: "4 ABY · Endor", quote: "Tell your sister you were right.", speaker: "Anakin Skywalker" }
];

export function StoryScene() {
  const frame = useCurrentFrame();
  const activeBeat = BEATS.find((b) => frame >= b.from && frame < b.to) ?? BEATS[BEATS.length - 1]!;
  const beatProgress = (frame - activeBeat.from) / (activeBeat.to - activeBeat.from);

  // Order 66 cinematic — fires at f=180, runs 60 frames
  const order66Active = frame >= 180 && frame < 270;
  const order66T = order66Active ? (frame - 180) / 90 : 0;

  // Era scrubber — moves through eras over the full 12s
  const eraT = Math.min(1, frame / 360);

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bgCanvas, overflow: "hidden" }}>
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
          opacity: 0.15
        }}
      />

      {/* "STORY MODE" kicker */}
      <div
        style={{
          position: "absolute",
          top: 40,
          left: 64,
          fontFamily: FONTS.mono,
          fontSize: 14,
          color: COLORS.fgDim,
          letterSpacing: "0.32em",
          textTransform: "uppercase",
          opacity: interpolate(frame, [0, 18], [0, 1], { extrapolateRight: "clamp" })
        }}
      >
        ▶ Story · Rise of Vader
      </div>

      {/* Era display */}
      <div
        style={{
          position: "absolute",
          top: 40,
          right: 64,
          fontFamily: FONTS.mono,
          fontSize: 28,
          color: order66Active ? COLORS.alarm : COLORS.fgStrong,
          fontVariantNumeric: "tabular-nums",
          letterSpacing: "0.04em",
          fontWeight: 500
        }}
      >
        {activeBeat.era}
      </div>

      {/* Era scrubber bar */}
      <div
        style={{
          position: "absolute",
          left: 64,
          right: 64,
          bottom: 80,
          height: 2,
          backgroundColor: COLORS.borderFaint
        }}
      >
        <div
          style={{
            height: "100%",
            backgroundColor: order66Active ? COLORS.alarm : COLORS.accent,
            width: `${eraT * 100}%`,
            transition: "background-color 0.3s"
          }}
        />
        {/* Scrubber thumb */}
        <div
          style={{
            position: "absolute",
            left: `calc(${eraT * 100}% - 6px)`,
            top: "-5px",
            width: 12,
            height: 12,
            borderRadius: "50%",
            backgroundColor: order66Active ? COLORS.alarm : COLORS.accent,
            boxShadow: order66Active
              ? `0 0 18px ${COLORS.alarm}80`
              : `0 0 12px ${COLORS.accent}60`
          }}
        />
      </div>

      {/* Hologram silhouette in the center */}
      <Hologram order66Active={order66Active} frame={frame} />

      {/* Beat caption + quote */}
      {activeBeat.caption && (
        <div
          style={{
            position: "absolute",
            left: "50%",
            bottom: 160,
            transform: "translateX(-50%)",
            textAlign: "center",
            opacity: interpolate(beatProgress, [0, 0.15, 0.85, 1], [0, 1, 1, 0])
          }}
        >
          <p
            style={{
              fontFamily: FONTS.mono,
              fontSize: 12,
              color: COLORS.fgDim,
              letterSpacing: "0.32em",
              textTransform: "uppercase",
              margin: "0 0 12px"
            }}
          >
            {activeBeat.caption}
          </p>
          {activeBeat.quote && (
            <p
              style={{
                fontFamily: FONTS.sans,
                fontStyle: "italic",
                fontSize: 32,
                color: COLORS.fgStrong,
                margin: "0 0 8px",
                maxWidth: 720,
                lineHeight: 1.3
              }}
            >
              &ldquo;{activeBeat.quote}&rdquo;
            </p>
          )}
          {activeBeat.speaker && (
            <p
              style={{
                fontFamily: FONTS.mono,
                fontSize: 12,
                color: COLORS.fgMuted,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                margin: 0
              }}
            >
              — {activeBeat.speaker}
            </p>
          )}
        </div>
      )}

      {/* Order 66 cinematic */}
      {order66Active && <Order66Cinematic t={order66T} />}
    </AbsoluteFill>
  );
}

function Hologram({ order66Active, frame }: { order66Active: boolean; frame: number }) {
  // Color shifts: blue (Jedi) → red (Sith) at Order 66 → cream (redeemed) at f=270
  const isRedeemed = frame >= 270;
  const color = isRedeemed
    ? COLORS.fgPrimary
    : order66Active
    ? COLORS.alarm
    : COLORS.accent;

  const flicker = Math.sin(frame * 0.4) * 0.04 + 0.96;
  const scanline = (frame * 1.2) % 100;

  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "42%",
        transform: "translate(-50%, -50%)",
        width: 280,
        height: 320,
        opacity: interpolate(frame, [0, 18], [0, 0.85], { extrapolateRight: "clamp" }) * flicker
      }}
    >
      {/* Body silhouette */}
      <svg viewBox="0 0 100 130" width={280} height={364}>
        <defs>
          <linearGradient id="holo" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.95" />
            <stop offset="100%" stopColor={color} stopOpacity="0.4" />
          </linearGradient>
          <pattern id="scan" patternUnits="userSpaceOnUse" width="100" height="6" patternTransform={`translate(0 ${scanline})`}>
            <rect width="100" height="3" fill="rgba(0, 0, 0, 0.18)" />
          </pattern>
        </defs>
        {/* Head */}
        <ellipse cx="50" cy="22" rx="11" ry="13" fill="url(#holo)" stroke={color} strokeWidth="0.6" />
        {/* Body */}
        <path
          d="M 36 38 Q 50 32 64 38 L 70 90 Q 50 96 30 90 Z"
          fill="url(#holo)"
          stroke={color}
          strokeWidth="0.6"
        />
        {/* Projector ring */}
        <ellipse
          cx="50"
          cy="120"
          rx="32"
          ry="4"
          fill="none"
          stroke={color}
          strokeWidth="1.2"
          opacity="0.6"
        />
        {/* Beam */}
        <path d="M 30 120 L 36 38 M 70 120 L 64 38" stroke={color} strokeWidth="0.4" opacity="0.3" />
        {/* Scanline overlay */}
        <rect x="0" y="0" width="100" height="130" fill="url(#scan)" opacity="0.6" />
      </svg>
    </div>
  );
}

function Order66Cinematic({ t }: { t: number }) {
  // Pulses fire across the viewport between t=0..0.5; title appears 0.05..0.95
  const titleOp = t < 0.05 ? 0 : t > 0.95 ? 0 : 1;
  const PULSES = Array.from({ length: 14 }, (_, i) => ({
    x: ((i * 137 + 23) % 92) + 4,
    y: ((i * 71 + 47) % 80) + 10,
    delay: (i * 0.025) % 0.4
  }));

  return (
    <>
      {/* Pulse field */}
      {PULSES.map((p, i) => {
        const pt = Math.max(0, Math.min(1, (t - p.delay) * 2.5));
        const scale = pt * 6;
        const opacity = pt < 0.1 ? pt * 8 : 1 - (pt - 0.1) / 0.9;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: 64,
              height: 64,
              borderRadius: "50%",
              transform: `translate(-50%, -50%) scale(${scale})`,
              background: `radial-gradient(circle, ${COLORS.alarm} 0%, transparent 70%)`,
              opacity,
              filter: "blur(8px)",
              pointerEvents: "none"
            }}
          />
        );
      })}

      {/* Title card */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          opacity: titleOp,
          pointerEvents: "none"
        }}
      >
        <div
          style={{
            fontFamily: FONTS.mono,
            fontSize: 14,
            color: COLORS.fgDim,
            letterSpacing: "0.42em",
            textTransform: "uppercase",
            marginBottom: 12
          }}
        >
          Cinematic
        </div>
        <h3
          style={{
            fontFamily: FONTS.sans,
            fontSize: 96,
            fontWeight: 500,
            color: COLORS.alarm,
            letterSpacing: "0.16em",
            margin: 0,
            textShadow: `0 0 32px ${COLORS.alarm}40`
          }}
        >
          ORDER 66
        </h3>
        <p
          style={{
            fontFamily: FONTS.sans,
            fontStyle: "italic",
            fontSize: 22,
            color: COLORS.fgPrimary,
            opacity: 0.85,
            margin: "16px 0 0"
          }}
        >
          Execute. The Jedi must die.
        </p>
      </div>
    </>
  );
}
