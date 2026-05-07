"use client";

import { motion, useReducedMotion } from "motion/react";
import { useMemo } from "react";
import type { Entity } from "@/lib/schema";
import { useSelection } from "@/lib/store";
import { formatYear } from "@/lib/utils";

/**
 * <FilmAppearances /> — small horizontal row of "appears in" film chips.
 * Mono labels, episode tag, release-year footnote, and a click affordance to
 * cross-pivot to the film entity.
 *
 * Pulls film candidates from `planet.relations` filtered to `appears_in` —
 * SWAPI's planet→film links. Falls back gracefully when the array is empty.
 */
type Props = {
  planet: Entity;
  entities: Entity[];
};

export function FilmAppearances({ planet, entities }: Props) {
  const select = useSelection((s) => s.select);
  const reduced = useReducedMotion() ?? false;

  const films = useMemo(() => {
    const map = new Map<string, Entity>();
    for (const e of entities) map.set(e.id, e);
    return planet.relations
      .filter((r) => r.kind === "appears_in")
      .map((r) => map.get(r.target))
      .filter((e): e is Entity => e !== undefined && e.type === "film");
  }, [planet.relations, entities]);

  if (films.length === 0) return null;

  return (
    <section
      className="flex flex-col gap-3 border-t border-border-faint pt-5"
      aria-label="Film appearances"
    >
      <span className="font-mono text-2xs uppercase tracking-[0.16em] text-fg-dim">
        Appears In
      </span>
      <ul className="flex flex-wrap gap-2">
        {films.map((film) => (
          <li key={film.id}>
            <motion.button
              type="button"
              onClick={() => select(film.id, "film")}
              whileHover={reduced ? undefined : { y: -1 }}
              whileTap={reduced ? undefined : { scale: 0.98 }}
              transition={{ type: "spring", stiffness: 360, damping: 24 }}
              className="flex flex-col items-start gap-0.5 rounded border border-border-faint bg-bg-overlay/40 px-3 py-1.5 text-left transition-colors hover:border-accent-faint hover:bg-accent-bg/30 focus-visible:outline-1 focus-visible:outline-accent"
              aria-label={`Select ${film.name}`}
            >
              <span className="text-sm text-fg-primary">{film.name}</span>
              <span className="font-mono text-[0.625rem] uppercase tracking-[0.16em] text-fg-dim">
                {film.aliases[0] ?? "Film"}
                {film.era?.firstAppearance != null && (
                  <>
                    <span aria-hidden="true"> · </span>
                    {formatYear(film.era.firstAppearance)}
                  </>
                )}
              </span>
            </motion.button>
          </li>
        ))}
      </ul>
    </section>
  );
}
