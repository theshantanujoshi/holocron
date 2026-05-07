"use client";

import { useEffect } from "react";
import type { Battle, Entity, Hyperlane, TimelineEvent, War } from "@/lib/schema";
import type { PlacedPlanet } from "@/lib/data/positions";
import type { LineageGraph } from "@/lib/data/loadLineage";
import { useSelection } from "@/lib/store";
import dynamic from "next/dynamic";
import { GalaxyCanvas } from "@/components/galaxy/GalaxyCanvas";
import { TimelineView } from "@/components/timeline/TimelineView";

const LineageView = dynamic(
  () => import("@/components/lineage").then((m) => m.LineageView),
  {
    ssr: false,
    loading: () => null
  }
);
import { NavRail } from "./NavRail";
import { Datapad } from "./Datapad";
import { DatapadDrawer } from "./DatapadDrawer";
import { TimelineScrubber } from "./TimelineScrubber";
import { LineagePlaceholder } from "./LineagePlaceholder";
import { SearchPalette } from "./SearchPalette";
import { HyperspaceOverlay } from "./HyperspaceOverlay";
import { AudioCueDispatcher } from "./AudioCueDispatcher";

type Props = {
  entities: Entity[];
  planets: PlacedPlanet[];
  lanes: Hyperlane[];
  events: TimelineEvent[];
  lineage: LineageGraph | null;
  wars?: War[];
  battles?: Battle[];
};

export function AppShell({
  entities,
  planets,
  lanes,
  events,
  lineage,
  wars = [],
  battles = []
}: Props) {
  const view = useSelection((s) => s.view);
  const setSearchOpen = useSelection((s) => s.setSearchOpen);
  const startRoute = useSelection((s) => s.startRoute);
  const clearRoute = useSelection((s) => s.clearRoute);
  const routeMode = useSelection((s) => s.route.mode);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "/" && !isTypingTarget(e.target)) {
        e.preventDefault();
        setSearchOpen(true);
      }
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen(true);
      }
      // 'r' toggles plot-route mode in galaxy view; safe to ignore in other
      // views since the HUD only renders inside GalaxyCanvas.
      if (
        (e.key === "r" || e.key === "R") &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey &&
        !isTypingTarget(e.target)
      ) {
        e.preventDefault();
        startRoute();
      }
      if (e.key === "Escape" && routeMode !== "idle") {
        e.preventDefault();
        clearRoute();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setSearchOpen, startRoute, clearRoute, routeMode]);

  return (
    <div id="main-content" className="relative h-[100dvh] w-full bg-bg-canvas">
      {/* Desktop layout (md+): three-column grid + timeline row */}
      <div className="hidden h-full flex-col md:flex">
        <div className="grid min-h-0 flex-1 grid-cols-[64px_1fr_360px] overflow-hidden">
          <NavRail />
          <div className="relative overflow-hidden">
            {view === "galaxy" && (
              <GalaxyCanvas
                planets={planets}
                lanes={lanes}
                entities={entities}
                lineage={lineage}
              />
            )}
            {view === "timeline" && (
              <TimelineView
                planets={planets}
                lanes={lanes}
                events={events}
                entities={entities}
                wars={wars}
                battles={battles}
              />
            )}
            {view === "lineage" &&
              (lineage ? <LineageView graph={lineage} /> : <LineagePlaceholder />)}
          </div>
          <Datapad entities={entities} />
        </div>
        <TimelineScrubber />
      </div>

      {/* Mobile layout (< md): stacked column */}
      <div className="flex h-full flex-col md:hidden">
        <NavRail />
        <div className="relative min-h-0 flex-1 overflow-hidden">
          {view === "galaxy" && (
            <GalaxyCanvas
              planets={planets}
              lanes={lanes}
              entities={entities}
              lineage={lineage}
              mobile
            />
          )}
          {view === "timeline" && (
            <TimelineView
              planets={planets}
              lanes={lanes}
              events={events}
              entities={entities}
              wars={wars}
              battles={battles}
            />
          )}
          {view === "lineage" && <LineagePlaceholder />}
        </div>
        <TimelineScrubber />
        <DatapadDrawer entities={entities} />
      </div>

      <SearchPalette entities={entities} />
      <HyperspaceOverlay />
      <AudioCueDispatcher />
    </div>
  );
}

function isTypingTarget(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false;
  const tag = t.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || t.isContentEditable;
}
