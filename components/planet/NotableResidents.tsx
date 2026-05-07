"use client";

import { motion, useReducedMotion } from "motion/react";
import { useMemo } from "react";
import type { Entity } from "@/lib/schema";
import type { PersonImage } from "@/lib/data/loadPersonImages";
import { useSelection } from "@/lib/store";

/**
 * <NotableResidents /> — horizontally scrolling row of clickable resident
 * chips. Driven by `relations[].kind === "located_in"` on the planet entity.
 *
 * Per chip:
 *   - 64x64 portrait thumbnail when `person-images.json` provides one;
 *     otherwise an "H" glyph fallback in faint accent.
 *   - Name in mono caption underneath.
 *   - Click → `select(personId, "person")` triggers cross-pivot.
 *   - Hover: spring scale 1.0 → 1.05, accent border glow.
 *   - Holographic scanline mask on the portrait, matching the hero.
 *
 * Empty state: a single mono caption "No known residents in the archive."
 * Reduced motion: hover scale removed, scanlines static.
 */

type Props = {
  planet: Entity;
  entities: Entity[];
  personImages: Map<string, PersonImage> | null;
};

export function NotableResidents({ planet, entities, personImages }: Props) {
  const select = useSelection((s) => s.select);
  const reduced = useReducedMotion() ?? false;
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

  const residents = useMemo(() => {
    const map = new Map<string, Entity>();
    for (const e of entities) map.set(e.id, e);
    return planet.relations
      .filter((r) => r.kind === "located_in")
      .map((r) => map.get(r.target))
      .filter((e): e is Entity => e !== undefined && e.type === "person")
      .slice(0, 20);
  }, [planet.relations, entities]);

  return (
    <section
      className="flex flex-col gap-3 border-t border-border-faint pt-5"
      aria-label="Notable residents"
    >
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-2xs uppercase tracking-[0.16em] text-fg-dim">
          Notable Residents
        </span>
        {residents.length > 0 && (
          <span className="font-mono text-2xs uppercase tracking-[0.14em] text-fg-dim">
            {residents.length} on file
          </span>
        )}
      </div>

      {residents.length === 0 ? (
        <p className="font-mono text-2xs uppercase tracking-[0.14em] text-fg-dim">
          No known residents in the archive.
        </p>
      ) : (
        <ul
          className="-mx-1 flex snap-x gap-3 overflow-x-auto pb-2 pl-1 pr-1"
          style={{ scrollbarWidth: "thin" }}
        >
          {residents.map((person) => {
            const image = personImages?.get(person.id) ?? null;
            const portraitSrc = image ? `${basePath}${image.thumbnailSrc}` : null;
            return (
              <li key={person.id} className="flex-shrink-0 snap-start">
                <ResidentChip
                  person={person}
                  portraitSrc={portraitSrc}
                  reduced={reduced}
                  onSelect={() => select(person.id, "person")}
                />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function ResidentChip({
  person,
  portraitSrc,
  reduced,
  onSelect
}: {
  person: Entity;
  portraitSrc: string | null;
  reduced: boolean;
  onSelect: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onSelect}
      whileHover={reduced ? undefined : { scale: 1.05 }}
      whileTap={reduced ? undefined : { scale: 0.97 }}
      transition={{ type: "spring", stiffness: 320, damping: 22 }}
      className="group relative flex w-20 flex-col items-center gap-1.5 rounded p-1 text-left focus-visible:outline-1 focus-visible:outline-accent"
      aria-label={`Select ${person.name}`}
    >
      <span
        className="relative block h-16 w-16 overflow-hidden rounded border border-border-faint transition-colors group-hover:border-accent-faint"
        style={{ background: "var(--color-bg-deep)" }}
      >
        {portraitSrc ? (
          <span
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${portraitSrc})`,
              filter: "saturate(0.6) brightness(0.95)"
            }}
            aria-hidden="true"
          />
        ) : (
          <FallbackGlyph />
        )}
        {/* Holographic scanline mask */}
        <span
          aria-hidden="true"
          className="holo-scanlines"
          style={{
            ["--holo-rim" as string]: "var(--color-accent)",
            ["--holo-shadow" as string]: "var(--color-accent-faint)"
          }}
        >
          <span className={`holo-bands${reduced ? " holo-bands--still" : ""}`} />
        </span>
        {/* Sweep-flicker only when motion allowed */}
        {!reduced && <span aria-hidden="true" className="holo-flicker" />}
        {/* Hover rim glow */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded transition-opacity duration-200 group-hover:opacity-100"
          style={{
            opacity: 0,
            boxShadow: "inset 0 0 14px var(--color-accent)"
          }}
        />
      </span>
      <span className="line-clamp-2 w-full text-center font-mono text-2xs uppercase tracking-[0.12em] text-fg-muted transition-colors group-hover:text-fg-strong">
        {person.name}
      </span>
    </motion.button>
  );
}

/** Fallback glyph — simple "H" (for "human/holocron entry") in faint accent. */
function FallbackGlyph() {
  return (
    <span
      className="absolute inset-0 flex items-center justify-center"
      style={{
        background:
          "radial-gradient(60% 60% at 50% 45%, var(--color-accent-bg) 0%, var(--color-bg-deep) 100%)"
      }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" width="24" height="24">
        <path
          d="M7 4 V20 M17 4 V20 M7 12 H17"
          stroke="var(--color-accent-faint)"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}
