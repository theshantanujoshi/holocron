/**
 * Design tokens mirrored from the main project's globals.css.
 * Remotion renders in PNG via Chromium so we use rgb() / hex equivalents
 * of the OKLCH values used in the live site.
 */

export const COLORS = {
  bgCanvas: "rgb(15, 18, 28)", // oklch(0.13 0.005 240)
  bgPanel: "rgb(20, 24, 34)",
  bgDeep: "rgb(10, 12, 20)",
  bgOverlay: "rgb(26, 30, 42)",
  borderFaint: "rgba(95, 105, 124, 0.18)",
  borderLine: "rgba(95, 105, 124, 0.32)",
  fgPrimary: "rgb(236, 232, 216)", // oklch(0.94 0.005 80) — archive cream
  fgStrong: "rgb(248, 244, 232)",
  fgMuted: "rgb(150, 158, 175)",
  fgDim: "rgb(95, 105, 124)",
  accent: "rgb(95, 191, 255)", // oklch(0.78 0.13 235) — holo blue
  accentStrong: "rgb(135, 210, 255)",
  accentFaint: "rgba(95, 191, 255, 0.22)",
  alarm: "rgb(220, 60, 70)", // oklch(0.64 0.18 25) — Imperial red
  legends: "rgb(204, 168, 100)", // oklch(0.82 0.10 60) — amber
  canon: "rgb(236, 232, 216)"
};

export const FONTS = {
  sans: "Inter, system-ui, sans-serif",
  mono: "ui-monospace, 'SF Mono', Menlo, monospace"
};

export const EASE_OUT_QUART: [number, number, number, number] = [0.16, 1, 0.3, 1];
export const EASE_OUT_EXPO: [number, number, number, number] = [0.19, 1, 0.22, 1];
