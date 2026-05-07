"use client";

import { motion, AnimatePresence } from "motion/react";
import { useEffect, useState } from "react";
import { useSelection } from "@/lib/store";

const PIVOT_DURATION = 720;

export function HyperspaceOverlay() {
  const pivoting = useSelection((s) => s.pivoting);
  const setPivoting = useSelection((s) => s.setPivoting);
  const [show, setShow] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!pivoting) return;
    if (reduced) {
      const t = setTimeout(() => setPivoting(false), 80);
      return () => clearTimeout(t);
    }
    setShow(true);
    const t1 = setTimeout(() => setShow(false), PIVOT_DURATION);
    const t2 = setTimeout(() => setPivoting(false), PIVOT_DURATION);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [pivoting, reduced, setPivoting]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          aria-hidden
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="pointer-events-none absolute inset-0 z-30 mix-blend-screen"
        >
          {Array.from({ length: 18 }).map((_, i) => (
            <Streak key={i} index={i} />
          ))}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.55, 0] }}
            transition={{ duration: PIVOT_DURATION / 1000, ease: "easeOut", times: [0, 0.4, 1] }}
            className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,oklch(0.78_0.13_235/0.22)_0%,transparent_55%)]"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Streak({ index }: { index: number }) {
  const top = `${(index * 137 + 17) % 100}%`;
  const delay = (index % 5) * 0.04;
  const len = 24 + ((index * 7) % 60);
  return (
    <motion.div
      initial={{ x: "-20vw", opacity: 0 }}
      animate={{ x: "120vw", opacity: [0, 1, 1, 0] }}
      transition={{ duration: 0.55, delay, ease: [0.19, 1, 0.22, 1], times: [0, 0.15, 0.6, 1] }}
      className="absolute h-px"
      style={{
        top,
        width: `${len}vw`,
        background:
          "linear-gradient(90deg, transparent 0%, oklch(0.84 0.14 235 / 0.85) 60%, oklch(0.94 0.005 80 / 0.95) 100%)"
      }}
    />
  );
}

function useReducedMotion(): boolean {
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
