"use client";

import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";
import { useSelection } from "@/lib/store";
import {
  EVENT_CINEMATICS,
  resolveCinematic,
  toneColor,
  type EventCinematic
} from "@/lib/data/event-cinematics";
import { play, isEnabled as audioEnabled } from "@/lib/audio";

const FADE_IN = 0.18;
const FADE_OUT = 0.32;
const EASE_OUT = [0.16, 1, 0.3, 1] as const;

/**
 * Watches the era scrubber + active story state. When the era crosses any
 * registered cinematic's `triggerYear`, fires that cinematic via the store.
 * Also checks pending-fire on story beat advance (for stories that jump
 * across years rather than scrubbing through them continuously).
 */
export function EventInterruptDispatcher() {
  const era = useSelection((s) => s.era);
  const fired = useSelection((s) => s.cinematic.fired);
  const fire = useSelection((s) => s.fireCinematic);
  const prevEraRef = useRef(era);

  useEffect(() => {
    const prev = prevEraRef.current;
    const cinematic = resolveCinematic(prev, era, fired);
    if (cinematic) {
      fire(cinematic.id);
      if (audioEnabled() && cinematic.audioCue) {
        play(cinematic.audioCue);
      }
    }
    prevEraRef.current = era;
  }, [era, fired, fire]);

  return null;
}

/**
 * Renders the active cinematic interrupt as a full-bleed overlay.
 * - Lead: subtle scrim fade-in (~180ms)
 * - Title card with display-size mono treatment, holographic flicker
 * - Visual layer: radial pulses (multi-pulse) or focused single pulse
 * - Outro: scrim + title fade-out (~320ms)
 *
 * Reduced motion: title card only, no pulses, no scrim animation.
 */
export function EventInterruptOverlay() {
  const activeId = useSelection((s) => s.cinematic.activeId);
  const clear = useSelection((s) => s.clearCinematic);
  const reduceMotion = useReducedMotion();

  const cinematic = activeId ? EVENT_CINEMATICS.find((c) => c.id === activeId) ?? null : null;

  useEffect(() => {
    if (!cinematic) return;
    const t = window.setTimeout(() => clear(), cinematic.durationMs);
    return () => window.clearTimeout(t);
  }, [cinematic, clear]);

  return (
    <AnimatePresence>
      {cinematic && (
        <motion.div
          key={cinematic.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : FADE_OUT, ease: EASE_OUT }}
          className="pointer-events-none fixed inset-0 z-[85] flex items-center justify-center"
          aria-live="assertive"
          aria-atomic="true"
        >
          {!reduceMotion && (
            <>
              <Scrim />
              <PulseField cinematic={cinematic} />
            </>
          )}
          <TitleCard cinematic={cinematic} reduceMotion={Boolean(reduceMotion)} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Scrim() {
  return (
    <motion.div
      aria-hidden
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 0.4, 0.32, 0] }}
      transition={{ duration: 0.95, ease: "easeOut", times: [0, 0.18, 0.6, 1] }}
      className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,oklch(0.06_0.005_240/0.85)_0%,oklch(0.06_0.005_240/0.4)_55%,transparent_85%)]"
    />
  );
}

function TitleCard({
  cinematic,
  reduceMotion
}: {
  cinematic: EventCinematic;
  reduceMotion: boolean;
}) {
  const color = toneColor(cinematic.tone);
  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 12, scale: 1.02 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.98 }}
      transition={{
        duration: reduceMotion ? 0 : FADE_IN,
        ease: EASE_OUT
      }}
      className="relative flex max-w-[680px] flex-col items-center gap-3 px-8 text-center"
    >
      <span
        className="font-mono text-2xs uppercase tracking-[0.4em]"
        style={{ color: "var(--color-fg-dim)" }}
      >
        Cinematic
      </span>
      <h2
        className="font-sans font-medium uppercase tracking-[0.18em]"
        style={{
          color,
          fontSize: "clamp(28px, 5.5vw, 64px)",
          letterSpacing: "0.18em",
          textShadow: `0 0 24px ${color}20, 0 1px 2px oklch(0.06 0.005 240 / 0.9)`
        }}
      >
        {cinematic.title}
      </h2>
      <p
        className="max-w-[44ch] font-sans italic"
        style={{
          color: "var(--color-fg-primary)",
          fontSize: "clamp(14px, 1.6vw, 20px)",
          opacity: 0.85
        }}
      >
        {cinematic.subtitle}
      </p>
    </motion.div>
  );
}

function PulseField({ cinematic }: { cinematic: EventCinematic }) {
  const color = toneColor(cinematic.tone);

  switch (cinematic.visual) {
    case "multi-pulse": {
      const count = cinematic.pulseCount ?? 8;
      const pulses = Array.from({ length: count }, (_, i) => i);
      return (
        <div aria-hidden className="absolute inset-0 overflow-hidden">
          {pulses.map((i) => {
            const left = (i * 137 + 23) % 92 + 4; // 4-96 vw
            const top = (i * 71 + 17) % 80 + 10; // 10-90 vh
            const delay = (i * 35) / 1000;
            return (
              <motion.div
                key={i}
                initial={{ scale: 0, opacity: 0.85 }}
                animate={{ scale: 6, opacity: 0 }}
                transition={{
                  duration: 0.65,
                  delay,
                  ease: "easeOut"
                }}
                className="absolute h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl"
                style={{
                  left: `${left}%`,
                  top: `${top}%`,
                  background: `radial-gradient(circle, ${color}, transparent 70%)`
                }}
              />
            );
          })}
        </div>
      );
    }
    case "single-pulse": {
      return (
        <motion.div
          aria-hidden
          initial={{ scale: 0, opacity: 0.9 }}
          animate={{ scale: 8, opacity: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="absolute left-1/2 top-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
          style={{ background: `radial-gradient(circle, ${color}, transparent 70%)` }}
        />
      );
    }
    case "double-pulse": {
      return (
        <div aria-hidden className="absolute inset-0">
          <motion.div
            initial={{ scale: 0, opacity: 0.9 }}
            animate={{ scale: 7, opacity: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="absolute left-[58%] top-[42%] h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
            style={{ background: `radial-gradient(circle, ${color}, transparent 70%)` }}
          />
          <motion.div
            initial={{ scale: 0, opacity: 0.9 }}
            animate={{ scale: 5, opacity: 0 }}
            transition={{ duration: 0.65, delay: 0.2, ease: "easeOut" }}
            className="absolute left-[44%] top-[60%] h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
            style={{ background: `radial-gradient(circle, ${color}, transparent 70%)` }}
          />
        </div>
      );
    }
    case "binary-suns": {
      return (
        <div aria-hidden className="absolute inset-0">
          <motion.div
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: [0.4, 1.4, 1.2], opacity: [0, 0.7, 0] }}
            transition={{ duration: 0.85, ease: "easeOut", times: [0, 0.4, 1] }}
            className="absolute left-[46%] top-[50%] h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
            style={{ background: `radial-gradient(circle, ${color}, transparent 60%)` }}
          />
          <motion.div
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: [0.4, 1.2, 1.0], opacity: [0, 0.55, 0] }}
            transition={{ duration: 0.85, delay: 0.05, ease: "easeOut", times: [0, 0.4, 1] }}
            className="absolute left-[54%] top-[50%] h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
            style={{ background: `radial-gradient(circle, ${color}, transparent 60%)` }}
          />
        </div>
      );
    }
  }
}
