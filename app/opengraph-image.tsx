import { ImageResponse } from "next/og";

/**
 * Open Graph card. Rendered at build time (output: 'export') and served
 * statically. Twitter, Slack, Discord, iMessage, Reddit, X all read this
 * when the URL is shared. 1200×630 is the standard size.
 *
 * Visual: full-bleed tinted-near-black bg with a faint isometric-cube
 * watermark + sector-grid lines, the Holocron wordmark + tagline + the
 * featured stats row + a faint "by Adhithya Rajasekaran" credit.
 */

export const runtime = "nodejs";
export const dynamic = "force-static";
export const revalidate = false;

export const alt = "Holocron — A 3D Star Wars universe explorer. Galaxy, timeline, lineage, datapad — one selection drives all four.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BG = "rgb(15, 18, 28)"; // oklch(0.13 0.005 240) approximation
const BG_DEEP = "rgb(10, 12, 20)";
const ACCENT = "rgb(95, 191, 255)"; // oklch(0.78 0.13 235)
const ACCENT_FAINT = "rgba(95, 191, 255, 0.18)";
const FG = "rgb(236, 232, 216)"; // oklch(0.94 0.005 80)
const FG_MUTED = "rgb(150, 158, 175)";
const FG_DIM = "rgb(95, 105, 124)";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: `radial-gradient(ellipse at 65% 50%, ${BG} 0%, ${BG_DEEP} 75%)`,
          padding: "72px 96px",
          fontFamily: "Inter, system-ui, sans-serif",
          position: "relative"
        }}
      >
        {/* Sector grid overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `
              linear-gradient(${ACCENT_FAINT} 1px, transparent 1px),
              linear-gradient(90deg, ${ACCENT_FAINT} 1px, transparent 1px)
            `,
            backgroundSize: "120px 120px",
            opacity: 0.25
          }}
        />

        {/* Holocron cube glyph (large, on the right) */}
        <div
          style={{
            position: "absolute",
            top: 144,
            right: 128,
            display: "flex"
          }}
        >
          <svg viewBox="0 0 32 32" width="280" height="280">
            <g
              stroke={ACCENT}
              strokeWidth="0.7"
              fill="none"
              strokeLinejoin="round"
              opacity="0.9"
            >
              <path d="M16 3 L27 9 L27 23 L16 29 L5 23 L5 9 Z" />
              <path d="M5 9 L16 14 L27 9" />
              <path d="M16 14 L16 29" />
            </g>
            <circle cx="16" cy="14" r="0.9" fill={ACCENT} />
          </svg>
        </div>

        {/* Top label row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            color: FG_DIM,
            fontSize: 18,
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            fontFamily: "ui-monospace, monospace",
            position: "relative"
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              background: ACCENT,
              display: "flex"
            }}
          />
          <span>Galactic archive · v0.10</span>
        </div>

        {/* Wordmark + tagline */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 28,
            marginTop: 80,
            position: "relative"
          }}
        >
          <h1
            style={{
              color: FG,
              fontSize: 130,
              fontWeight: 600,
              letterSpacing: "-0.02em",
              lineHeight: 1,
              margin: 0,
              display: "flex"
            }}
          >
            HOLOCRON
          </h1>
          <p
            style={{
              color: FG_MUTED,
              fontSize: 38,
              fontWeight: 400,
              letterSpacing: "-0.01em",
              lineHeight: 1.2,
              margin: 0,
              maxWidth: 760,
              display: "flex"
            }}
          >
            The galaxy, indexed.
            <br />
            Across space, time, and lineage.
          </p>
        </div>

        {/* Stats row at bottom */}
        <div
          style={{
            display: "flex",
            gap: 64,
            marginTop: "auto",
            position: "relative"
          }}
        >
          {[
            { label: "Entities", value: "318" },
            { label: "Hyperspace lanes", value: "5" },
            { label: "Cinematic stories", value: "4" },
            { label: "Era span", value: "25 kyr" }
          ].map((s) => (
            <div
              key={s.label}
              style={{ display: "flex", flexDirection: "column", gap: 4 }}
            >
              <div
                style={{
                  color: FG_DIM,
                  fontSize: 16,
                  letterSpacing: "0.24em",
                  textTransform: "uppercase",
                  fontFamily: "ui-monospace, monospace",
                  display: "flex"
                }}
              >
                {s.label}
              </div>
              <div
                style={{
                  color: FG,
                  fontSize: 40,
                  fontFamily: "ui-monospace, monospace",
                  fontWeight: 500,
                  display: "flex"
                }}
              >
                {s.value}
              </div>
            </div>
          ))}
        </div>

        {/* Footer credit */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 44,
            paddingTop: 24,
            borderTop: `1px solid ${ACCENT_FAINT}`,
            color: FG_DIM,
            fontSize: 16,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            fontFamily: "ui-monospace, monospace",
            position: "relative"
          }}
        >
          <span>Next.js · React Three Fiber · Tailwind v4</span>
          <span>github.com/adhit-r/holocron</span>
        </div>
      </div>
    ),
    {
      ...size
    }
  );
}
