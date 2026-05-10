import { COLORS } from "../tokens";

/**
 * The isometric holocron-cube glyph used in the wordmark.
 * Pure SVG; takes a size and stroke-width.
 */
export function HolocronGlyph({
  size = 96,
  stroke = 1.2,
  color = COLORS.accent
}: {
  size?: number;
  stroke?: number;
  color?: string;
}) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size}>
      <g
        stroke={color}
        strokeWidth={stroke}
        fill="none"
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        <path d="M16 3 L27 9 L27 23 L16 29 L5 23 L5 9 Z" />
        <path d="M5 9 L16 14 L27 9" />
        <path d="M16 14 L16 29" />
      </g>
      <circle cx="16" cy="14" r="1.7" fill={color} />
    </svg>
  );
}
