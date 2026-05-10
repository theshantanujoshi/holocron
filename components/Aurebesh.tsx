"use client";

import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * Aurebesh decoder. The interface uses Aurebesh as a decorative cipher in
 * section markers and watermarks; this component wraps a Latin character
 * with a hover/focus tooltip that reveals it. Pure delight, fully a11y.
 *
 * The Aurebesh alphabet is one-to-one with Latin per the canonical table
 * (https://starwars.fandom.com/wiki/Aurebesh). We're not actually rendering
 * Aurebesh glyphs (no licensed font); we're rendering the Latin character
 * styled as if it were a cipher, and revealing the "decoded" form on hover.
 *
 * Use as `<Aurebesh char="H" />` or `<Aurebesh>HOLOCRON</Aurebesh>`.
 *
 * Accessibility:
 * - Latin character is the primary content (screen readers get the real text)
 * - The "decoded" tooltip is decorative, marked aria-hidden
 * - Tooltip activates on hover OR keyboard focus (focusable via tabIndex=0)
 * - Reduced motion: tooltip appears instantly, no spring
 */

const AUREBESH_NAMES: Record<string, string> = {
  A: "Aurek",
  B: "Besh",
  C: "Cresh",
  D: "Dorn",
  E: "Esk",
  F: "Forn",
  G: "Grek",
  H: "Herf",
  I: "Isk",
  J: "Jenth",
  K: "Krill",
  L: "Leth",
  M: "Mern",
  N: "Nern",
  O: "Osk",
  P: "Peth",
  Q: "Qek",
  R: "Resh",
  S: "Senth",
  T: "Trill",
  U: "Usk",
  V: "Vev",
  W: "Wesk",
  X: "Xesh",
  Y: "Yirt",
  Z: "Zerek"
};

type Props = {
  /** A single character. Mutually exclusive with `children`. */
  char?: string;
  /** Multi-character content; each letter gets its own tooltip. */
  children?: string;
  className?: string;
};

export function Aurebesh({ char, children, className }: Props) {
  const text = char ?? children ?? "";
  if (text.length === 0) return null;
  if (text.length === 1) return <AurebeshGlyph char={text} className={className} />;
  return (
    <span className={cn("inline-flex", className)}>
      {Array.from(text).map((c, i) => (
        <AurebeshGlyph key={`${c}-${i}`} char={c} />
      ))}
    </span>
  );
}

function AurebeshGlyph({ char, className }: { char: string; className?: string }) {
  const upper = char.toUpperCase();
  const name = AUREBESH_NAMES[upper];
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);

  // Non-letter (space, punctuation) — render plain, no tooltip
  if (!name) {
    return <span className={className}>{char}</span>;
  }

  return (
    <span
      className={cn("relative inline-block", className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      tabIndex={0}
      // Keep the visible glyph the only readable text for screen readers.
      aria-label={`${char} (Aurebesh: ${name})`}
    >
      <span aria-hidden={false}>{char}</span>
      <AnimatePresence>
        {open && (
          <motion.span
            aria-hidden
            role="tooltip"
            initial={reduceMotion ? false : { opacity: 0, y: 4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 2, scale: 0.98 }}
            transition={{
              duration: reduceMotion ? 0 : 0.16,
              ease: [0.16, 1, 0.3, 1]
            }}
            className="pointer-events-none absolute left-1/2 top-full z-50 mt-1 -translate-x-1/2 whitespace-nowrap rounded border border-border-line bg-bg-overlay/95 px-2 py-1 font-mono text-2xs uppercase tracking-[0.18em] text-fg-primary backdrop-blur-md"
            style={{ textShadow: "0 1px 2px oklch(0.06 0.005 240 / 0.9)" }}
          >
            <span className="text-fg-dim">aurebesh</span>{" "}
            <span className="text-accent">{name}</span>
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}
