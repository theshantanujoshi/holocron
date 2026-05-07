"use client";

import { useMemo } from "react";
import { useSelection } from "@/lib/store";
import type { PlacedPlanet } from "@/lib/data/positions";
import type { Hyperlane } from "@/lib/schema";
import { findRoute } from "@/lib/data/lane-graph";

type Props = {
  planets: PlacedPlanet[];
  lanes: Hyperlane[];
};

/**
 * Top-center HUD overlay for the Plot-the-route mechanic.
 *
 * Renders different content based on `route.mode`:
 *   - idle: nothing.
 *   - picking-origin: instructive caption.
 *   - picking-destination: caption with origin name.
 *   - shown: full route summary (lanes, parsecs, ETA, jump count) plus
 *     "Reverse route" and "Clear route" actions.
 *
 * The HUD lives outside the R3F canvas so all interaction is regular DOM.
 */
export function PlotRouteHud({ planets, lanes }: Props) {
  const route = useSelection((s) => s.route);
  const clearRoute = useSelection((s) => s.clearRoute);
  const reverseRoute = useSelection((s) => s.reverseRoute);

  const originPlanet = useMemo(
    () => (route.originId ? planets.find((p) => p.id === route.originId) ?? null : null),
    [planets, route.originId]
  );
  const destinationPlanet = useMemo(
    () =>
      route.destinationId
        ? planets.find((p) => p.id === route.destinationId) ?? null
        : null,
    [planets, route.destinationId]
  );

  const computed = useMemo(() => {
    if (route.mode !== "shown" || !route.originId || !route.destinationId) return null;
    return findRoute(route.originId, route.destinationId, planets, lanes);
  }, [route.mode, route.originId, route.destinationId, planets, lanes]);

  if (route.mode === "idle") return null;

  return (
    <div
      className="pointer-events-none absolute left-1/2 top-4 z-40 flex w-[min(720px,calc(100%-2rem))] -translate-x-1/2 justify-center"
      role="status"
      aria-live="polite"
    >
      {route.mode === "picking-origin" && (
        <Caption>Pick origin · click any planet · esc to cancel</Caption>
      )}

      {route.mode === "picking-destination" && (
        <Caption>
          Origin: <strong className="text-fg-strong">{originPlanet?.name ?? "—"}</strong> · pick
          destination · esc to cancel
        </Caption>
      )}

      {route.mode === "shown" && computed && originPlanet && destinationPlanet && (
        <RouteSummary
          originName={originPlanet.name}
          destinationName={destinationPlanet.name}
          route={computed}
          onReverse={reverseRoute}
          onClear={clearRoute}
        />
      )}

      {route.mode === "shown" && !computed && originPlanet && destinationPlanet && (
        <NoRouteCard
          originName={originPlanet.name}
          destinationName={destinationPlanet.name}
          onClear={clearRoute}
        />
      )}
    </div>
  );
}

function Caption({ children }: { children: React.ReactNode }) {
  return (
    <div className="pointer-events-auto rounded-md border border-border-faint bg-bg-overlay/95 px-4 py-2 font-mono text-2xs uppercase tracking-[0.16em] text-fg-muted backdrop-blur-md">
      {children}
    </div>
  );
}

type RouteSummaryProps = {
  originName: string;
  destinationName: string;
  route: ReturnType<typeof findRoute> & object;
  onReverse: () => void;
  onClear: () => void;
};

function RouteSummary({
  originName,
  destinationName,
  route,
  onReverse,
  onClear
}: RouteSummaryProps) {
  // Collapse consecutive segments on the same lane into a single label
  // and ignore short sublight spurs in the lane name list (they're a
  // nice-to-have data point, not a hyperspace lane).
  const laneNames = useMemo(() => {
    const seen: string[] = [];
    for (const seg of route.segments) {
      if (seg.laneId === "spur") continue;
      if (seen[seen.length - 1] !== seg.lane) seen.push(seg.lane);
    }
    return seen;
  }, [route.segments]);

  const jumps = laneNames.length;
  const parsecsRounded = Math.round(route.totalParsecs);

  return (
    <div className="pointer-events-auto flex max-w-full flex-col gap-3 rounded-md border border-border-line bg-bg-overlay/95 px-5 py-4 backdrop-blur-md">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 font-mono text-2xs uppercase tracking-[0.14em] text-fg-muted">
        <span className="text-fg-strong">{originName}</span>
        <span aria-hidden>→</span>
        <span className="text-fg-strong">{destinationName}</span>
        <span className="text-fg-dim">·</span>
        <span>via {laneNames.length > 0 ? laneNames.join(" + ") : "sublight"}</span>
      </div>

      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 font-mono text-xs tracking-[0.06em] text-fg-primary">
        <span>
          <span className="text-fg-dim">distance</span>{" "}
          <span className="tabular-nums">{parsecsRounded.toLocaleString()} pc</span>
        </span>
        <span>
          <span className="text-fg-dim">eta</span>{" "}
          <span className="tabular-nums">{route.etaDays.toFixed(1)} days</span>
        </span>
        <span>
          <span className="text-fg-dim">jumps</span>{" "}
          <span className="tabular-nums">{jumps}</span>
        </span>
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="button"
          onClick={onReverse}
          className="rounded-md border border-border-faint bg-bg-panel/60 px-3 py-1.5 font-mono text-2xs uppercase tracking-[0.12em] text-fg-primary transition-colors hover:border-border-line hover:text-fg-strong"
        >
          Reverse route
        </button>
        <button
          type="button"
          onClick={onClear}
          className="rounded-md border border-accent/60 bg-accent-bg/60 px-3 py-1.5 font-mono text-2xs uppercase tracking-[0.12em] text-fg-strong transition-colors hover:border-accent hover:bg-accent-bg/80"
          style={{ color: "oklch(0.94 0.005 80)" }}
        >
          Clear route
        </button>
      </div>
    </div>
  );
}

function NoRouteCard({
  originName,
  destinationName,
  onClear
}: {
  originName: string;
  destinationName: string;
  onClear: () => void;
}) {
  return (
    <div className="pointer-events-auto flex max-w-full flex-col gap-2 rounded-md border border-border-line bg-bg-overlay/95 px-5 py-4 backdrop-blur-md">
      <div className="font-mono text-2xs uppercase tracking-[0.14em] text-fg-muted">
        No charted route between{" "}
        <span className="text-fg-strong">{originName}</span> and{" "}
        <span className="text-fg-strong">{destinationName}</span>
      </div>
      <div className="font-mono text-2xs text-fg-dim">
        Off the lane network · sublight transit only.
      </div>
      <div className="pt-1">
        <button
          type="button"
          onClick={onClear}
          className="rounded-md border border-border-faint bg-bg-panel/60 px-3 py-1.5 font-mono text-2xs uppercase tracking-[0.12em] text-fg-primary transition-colors hover:border-border-line hover:text-fg-strong"
        >
          Clear route
        </button>
      </div>
    </div>
  );
}
