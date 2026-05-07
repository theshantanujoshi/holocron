import { notFound } from "next/navigation";
import { loadKb, planetsFrom } from "@/lib/data/loadKb";
import { loadLanes } from "@/lib/data/loadLanes";
import { loadLineageGraph } from "@/lib/data/loadLineage";
import { loadWars } from "@/lib/data/loadWars";
import { loadPersonImages } from "@/lib/data/loadPersonImages";
import { loadPlanetImages } from "@/lib/data/loadPlanetImages";
import { placePlanets } from "@/lib/data/positions";
import { CANON_EVENTS } from "@/lib/data/canon-events";
import { AppShell } from "@/components/explorer/AppShell";

export const dynamic = "force-static";
export const revalidate = false;

export default async function ExplorePage() {
  const kb = await loadKb();
  if (!kb) return notFound();

  const planets = placePlanets(planetsFrom(kb));
  const [lanes, lineage, warsData, personImages, planetImages] = await Promise.all([
    loadLanes(),
    loadLineageGraph(),
    loadWars(),
    loadPersonImages(),
    loadPlanetImages()
  ]);

  return (
    <AppShell
      entities={kb.entities}
      planets={planets}
      lanes={lanes ?? []}
      events={CANON_EVENTS}
      lineage={lineage}
      wars={warsData?.wars ?? []}
      battles={warsData?.battles ?? []}
      personImages={personImages}
      planetImages={planetImages}
    />
  );
}
