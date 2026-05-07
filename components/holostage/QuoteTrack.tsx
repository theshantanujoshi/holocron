"use client";

import { motion, AnimatePresence } from "motion/react";
import { useEffect, useState } from "react";
import type { Quote } from "@/lib/data/quotes";

/**
 * <QuoteTrack /> — kinetic typography ticker for the holo-stage.
 *
 * Cycles through a person's memorable quotes one at a time. Each quote drifts
 * right → left across a single line over `slideMs` (default 8s) with a
 * `gapMs` (default 2s) of silence between quotes. The component owns a single
 * "active index" timer; AnimatePresence cross-fades the entering/leaving line.
 *
 * Reduced motion: quotes appear stacked, statically — no horizontal drift, no
 * AnimatePresence cycling. We render every quote as plain text and rely on
 * the parent's vertical layout to truncate.
 *
 * Returns null when `quotes` is empty so the parent can omit the slot
 * gracefully.
 */
type Props = {
  quotes: Quote[];
  slideMs?: number;
  gapMs?: number;
};

export function QuoteTrack({ quotes, slideMs = 8000, gapMs = 2000 }: Props) {
  const reduce = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);

  // Reset to 0 when the quote set changes (entity switch).
  useEffect(() => {
    setIndex(0);
  }, [quotes]);

  useEffect(() => {
    if (reduce) return;
    if (quotes.length <= 1) return;
    const cycle = slideMs + gapMs;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % quotes.length);
    }, cycle);
    return () => window.clearInterval(id);
  }, [quotes.length, slideMs, gapMs, reduce]);

  if (quotes.length === 0) return null;

  // Reduced motion: stacked, static, top three.
  if (reduce) {
    const visible = quotes.slice(0, 3);
    return (
      <ul className="pointer-events-none flex flex-col items-center gap-2 px-6 text-center">
        {visible.map((q) => (
          <li key={q.id} className="max-w-[68ch]">
            <QuoteLine quote={q} />
          </li>
        ))}
      </ul>
    );
  }

  const active = quotes[index] ?? quotes[0];
  if (!active) return null;

  return (
    <div
      className="pointer-events-none relative h-[68px] w-[min(78vw,1100px)] overflow-hidden"
      aria-live="off"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={active.id}
          initial={{ x: "60%", opacity: 0 }}
          animate={{
            x: "-60%",
            opacity: [0, 1, 1, 0],
            transition: {
              x: { duration: slideMs / 1000, ease: "linear" },
              opacity: {
                duration: slideMs / 1000,
                times: [0, 0.12, 0.85, 1],
                ease: "linear"
              }
            }
          }}
          exit={{ opacity: 0, transition: { duration: 0.32 } }}
          className="absolute inset-0 flex items-center justify-center whitespace-nowrap"
        >
          <QuoteLine quote={active} />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function QuoteLine({ quote }: { quote: Quote }) {
  return (
    <span className="inline-flex items-baseline gap-3">
      <span className="font-mono text-2xs uppercase tracking-[0.2em] text-fg-dim">
        {quote.filmName}
      </span>
      <span className="text-lg italic leading-tight text-fg-strong/90">
        <span className="not-italic text-fg-dim" aria-hidden="true">&ldquo;</span>
        {quote.text}
        <span className="not-italic text-fg-dim" aria-hidden="true">&rdquo;</span>
      </span>
    </span>
  );
}

function usePrefersReducedMotion(): boolean {
  const [r, setR] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setR(m.matches);
    update();
    m.addEventListener("change", update);
    return () => m.removeEventListener("change", update);
  }, []);
  return r;
}
