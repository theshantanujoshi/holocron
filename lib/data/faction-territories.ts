import type { FactionId } from "@/lib/schema";

/**
 * Faction territory data for the temporal galaxy view.
 *
 * Each entry describes the approximate galactic footprint of a major faction
 * during a specific era window (BBY/ABY). Coordinates live on the XZ plane
 * (top-down projection), in the same Three.js unit space as the planet
 * placements in `lib/data/positions.ts` and `data/build/planets.parzivail.json`
 * — roughly ±260 units, with Coruscant at the origin.
 *
 * Polygon vertex order matters: the perimeter is walked sequentially and
 * closed implicitly (the last vertex connects back to the first). All
 * polygons are simple (non-self-intersecting); winding direction does not
 * matter for `THREE.Shape` triangulation.
 *
 * These polygons are deliberate visual approximations — Star Wars canon does
 * not publish treaty-grade cartography, and Wookieepedia infoboxes describe
 * territory in qualitative terms ("most of the Mid Rim", "scattered Outer
 * Rim systems"). Each polygon below cites the canon Wookieepedia article it
 * was derived from. Where a faction's territory was famously *not* a
 * contiguous blob (CIS, Rebel Alliance, First Order), the polygon
 * approximates a convex hull around the major member systems and accepts
 * that some Republic/Imperial space is enclosed within it visually.
 *
 * If higher-fidelity cartography is ever needed, the right move is to drive
 * these from the per-sector `affiliation` data on the parzivail dataset,
 * not to hand-tune more vertices here.
 */

export type TerritoryEra = {
  factionId: FactionId;
  /** Inclusive start of the era window in galactic dating (BBY = negative, ABY = positive). */
  eraStart: number;
  /** Inclusive end of the era window. */
  eraEnd: number;
  /**
   * Polygon perimeter in galaxy coords on the XZ plane (Y is always 0).
   * Order matters — walked sequentially, closed implicitly.
   */
  polygon: Array<[number, number]>;
  /** Optional XZ position for the floating faction label (defaults to polygon centroid). */
  centerLabel?: [number, number];
  /** Display name for the territory band, shown in the floating label. */
  name: string;
};

/**
 * Approximate a roughly-circular territory as an N-gon perimeter.
 * Used for the Galactic Republic / New Republic / Galactic Empire shells,
 * which canon describes as encompassing the Core, Colonies, Inner Rim, and
 * most of the Mid Rim — i.e. a broad disk centered on Coruscant.
 */
function ring(
  cx: number,
  cz: number,
  radius: number,
  vertices = 24,
  /** Per-vertex radial wobble, in [0, 1). Adds organic edge variance. */
  wobble = 0.06,
  /** Deterministic seed so the same era window shapes the same way every render. */
  seed = 1
): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  // Mulberry32 — small deterministic PRNG. Bounded to one polygon at a time
  // so different territory entries don't share coupled noise.
  let s = seed >>> 0;
  const rand = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = 0; i < vertices; i++) {
    const theta = (i / vertices) * Math.PI * 2;
    const r = radius * (1 + (rand() - 0.5) * 2 * wobble);
    out.push([cx + Math.cos(theta) * r, cz + Math.sin(theta) * r]);
  }
  return out;
}

export const FACTION_TERRITORIES: TerritoryEra[] = [
  // ──────────────────────────────────────────────────────────────────────
  // Galactic Republic (Old / High / Late) — 25,025 BBY → 19 BBY.
  // Per Wookieepedia: https://starwars.fandom.com/wiki/Galactic_Republic
  // "At its height the Republic encompassed the Core, Colonies, Inner Rim,
  // Expansion Region, and most of the Mid Rim, with sparse holdings in the
  // Outer Rim." We split this into three coarse shells so the visualization
  // *grows* as the user scrubs from 25 kya forward — matching the canon
  // narrative of expansion from a Core-only state to galaxy-spanning power.
  // ──────────────────────────────────────────────────────────────────────
  {
    factionId: "old_republic",
    eraStart: -25025,
    eraEnd: -5000,
    name: "Old Republic",
    // Early Republic — Core + Colonies only. ~75-unit radius around Coruscant.
    polygon: ring(0, 0, 75, 22, 0.05, 11),
    centerLabel: [0, -55]
  },
  {
    factionId: "old_republic",
    eraStart: -5000,
    eraEnd: -1000,
    name: "Galactic Republic",
    // Mid-period Republic, post-Sith Wars. Core through Mid Rim, ~150 units.
    polygon: ring(0, 0, 150, 28, 0.08, 17),
    centerLabel: [0, -110]
  },
  {
    factionId: "galactic_republic",
    eraStart: -1000,
    eraEnd: -22,
    name: "Galactic Republic",
    // Late Republic at full extent — most of the Mid Rim + Outer Rim
    // membership. ~210 unit radius covers the canonical "vast majority of
    // the galaxy" claim from the Naboo crisis era.
    polygon: ring(0, 0, 210, 32, 0.1, 23),
    centerLabel: [0, -155]
  },

  // ──────────────────────────────────────────────────────────────────────
  // Confederacy of Independent Systems (Separatists) — 24 BBY → 19 BBY.
  // Per Wookieepedia: https://starwars.fandom.com/wiki/Confederacy_of_Independent_Systems
  // The CIS was *not* contiguous. Its core members were Outer Rim and Mid
  // Rim industrial worlds: Geonosis (Outer Rim, ~+62, -46), Mustafar (Outer
  // Rim, ~-22, +256), Felucia (~+62, +70), Mygeeto (~-58, +38), Cato
  // Neimoidia (~-22, -36), Utapau (~+88, -88) — though Utapau was occupied
  // not member. We draw an irregular hull around the genuine member worlds.
  // ──────────────────────────────────────────────────────────────────────
  {
    factionId: "cis",
    eraStart: -24,
    eraEnd: -19,
    name: "Separatist Alliance",
    polygon: [
      [-90, 30], // northwest mining belt (Mygeeto / Foundry of the Confederacy)
      [-58, 60],
      [-22, 110],
      [10, 200], // Mustafar lava worlds reach
      [40, 240],
      [85, 180],
      [110, 90],
      [120, 0],
      [88, -50], // Geonosis sector
      [40, -70],
      [-10, -50],
      [-40, -20]
    ],
    centerLabel: [40, 60]
  },

  // ──────────────────────────────────────────────────────────────────────
  // Galactic Empire — 19 BBY → 4 ABY.
  // Per Wookieepedia: https://starwars.fandom.com/wiki/Galactic_Empire
  // The Empire absorbed the Republic's territory wholesale and pushed
  // farther — into Hutt Space, the Corporate Sector, and the deep Outer
  // Rim. Modeled as a slightly larger Republic shell with an asymmetric
  // bulge into Outer Rim positive-X (Tatooine direction) and negative-X
  // (Hoth / Anoat sector).
  // ──────────────────────────────────────────────────────────────────────
  {
    factionId: "galactic_empire",
    eraStart: -19,
    eraEnd: 4,
    name: "Galactic Empire",
    polygon: [
      ...ring(0, 0, 220, 28, 0.09, 41).slice(0, 10),
      [220, 60], // Outer Rim eastern push
      [240, 0],
      [220, -60],
      [180, -130],
      [80, -220], // Outer Rim southern reach (Tatooine area)
      [-30, -240],
      [-140, -200],
      [-220, -100],
      [-235, 0],
      [-220, 90], // Anoat / Hoth approach
      [-160, 180],
      [-60, 230],
      [80, 220],
      [180, 130]
    ],
    centerLabel: [0, -170]
  },

  // ──────────────────────────────────────────────────────────────────────
  // Rebel Alliance — 2 BBY → 4 ABY (formal Alliance to Restore the Republic).
  // Per Wookieepedia: https://starwars.fandom.com/wiki/Alliance_to_Restore_the_Republic
  // Mobile, decentralized — never a true territorial power. We model it as
  // a small irregular region whose centroid moves with the canonical
  // headquarters: Yavin IV (4 BBY → 0 ABY) at (~+42, +38), Hoth (1 ABY) at
  // (~-90, -70), then redeployed to mobile fleet (3-4 ABY) at Endor
  // (~+110, +92). One polygon per HQ era.
  // ──────────────────────────────────────────────────────────────────────
  {
    factionId: "rebel_alliance",
    eraStart: -2,
    eraEnd: 0,
    name: "Rebel Alliance · Yavin",
    polygon: ring(42, 38, 35, 14, 0.18, 53),
    centerLabel: [42, 5]
  },
  {
    factionId: "rebel_alliance",
    eraStart: 1,
    eraEnd: 2,
    name: "Rebel Alliance · Hoth",
    polygon: ring(-90, -70, 32, 14, 0.2, 59),
    centerLabel: [-90, -105]
  },
  {
    factionId: "rebel_alliance",
    eraStart: 3,
    eraEnd: 4,
    name: "Rebel Alliance · Endor",
    polygon: ring(110, 92, 38, 14, 0.18, 67),
    centerLabel: [110, 55]
  },

  // ──────────────────────────────────────────────────────────────────────
  // New Republic — 4 ABY → 28 ABY.
  // Per Wookieepedia: https://starwars.fandom.com/wiki/New_Republic
  // Restored Core + Colonies + Inner Rim + most of Mid Rim, but with a far
  // less complete Outer Rim presence than the late Republic — many sectors
  // remained semi-independent or under Imperial Remnant influence until
  // 5 ABY (Battle of Jakku). Modeled as a slightly smaller, wobblier
  // Republic shell. After Jakku the territory broadens toward the canonical
  // Galactic Concordance settlement.
  // ──────────────────────────────────────────────────────────────────────
  {
    factionId: "new_republic",
    eraStart: 4,
    eraEnd: 5,
    name: "New Republic",
    polygon: ring(0, 0, 175, 28, 0.12, 71),
    centerLabel: [0, -130]
  },
  {
    factionId: "new_republic",
    eraStart: 5,
    eraEnd: 28,
    name: "New Republic",
    polygon: ring(0, 0, 200, 30, 0.1, 79),
    centerLabel: [0, -150]
  },

  // ──────────────────────────────────────────────────────────────────────
  // First Order — 28 ABY → 35 ABY.
  // Per Wookieepedia: https://starwars.fandom.com/wiki/First_Order
  // Built up secretly in the Unknown Regions (canonically west / negative-X
  // edge of the galactic map per the Star Wars Atlas), then erupted into
  // the Outer Rim after the Hosnian Cataclysm (34 ABY). Modeled as a band
  // hugging the negative-X / Unknown Regions edge that grows eastward into
  // Outer Rim space across the era window.
  // ──────────────────────────────────────────────────────────────────────
  {
    factionId: "first_order",
    eraStart: 28,
    eraEnd: 33,
    name: "First Order",
    polygon: [
      [-260, -160],
      [-200, -200],
      [-130, -210],
      [-90, -160],
      [-110, -80],
      [-150, -20],
      [-200, 40],
      [-240, 100],
      [-260, 60]
    ],
    centerLabel: [-180, -100]
  },
  {
    factionId: "first_order",
    eraStart: 34,
    eraEnd: 35,
    name: "First Order",
    // Post-Hosnian expansion — pushes into the Outer Rim and the former
    // New Republic's western frontier (Sinta Glacier, Pasaana, Kijimi).
    polygon: [
      [-260, -180],
      [-180, -230],
      [-60, -240],
      [40, -200],
      [80, -130],
      [50, -40],
      [-20, 20],
      [-100, 60],
      [-180, 130],
      [-240, 180],
      [-260, 80]
    ],
    centerLabel: [-100, -120]
  },

  // ──────────────────────────────────────────────────────────────────────
  // Sith Empire (ancient, Old Republic era) — 5000 BBY → 3500 BBY.
  // Per Wookieepedia: https://starwars.fandom.com/wiki/Sith_Empire_(original)
  // Centered on Korriban in the Esstran sector (Outer Rim east). The Sith
  // Empire of Naga Sadow / Marka Ragnos held the Stygian Caldera and the
  // eastern Outer Rim territory. Approximated as an irregular blob in the
  // positive-X positive-Z quadrant near canonical Korriban.
  // ──────────────────────────────────────────────────────────────────────
  {
    factionId: "sith_order",
    eraStart: -5000,
    eraEnd: -3500,
    name: "Sith Empire",
    polygon: [
      [80, 60],
      [110, 40],
      [160, 50],
      [210, 80],
      [240, 130],
      [230, 180],
      [200, 220],
      [150, 230],
      [110, 200],
      [85, 150],
      [70, 100]
    ],
    centerLabel: [160, 130]
  }
];
