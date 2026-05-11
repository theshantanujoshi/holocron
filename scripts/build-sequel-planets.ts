/**
 * build-sequel-planets.ts
 *
 * Adds canonical sequel-era planets to kb.json that aren't in SWAPI.
 * Run AFTER `build:kb` and `build:legends`. The planets get stub Entity
 * records — the placement system reads `lib/data/positions.ts`'s ANCHORS
 * for their 3D coordinates.
 *
 * Sources (Wookieepedia):
 *   https://starwars.fandom.com/wiki/Jakku
 *   https://starwars.fandom.com/wiki/Takodana
 *   https://starwars.fandom.com/wiki/Ahch-To
 *   https://starwars.fandom.com/wiki/Crait
 *   https://starwars.fandom.com/wiki/Kef_Bir
 *   https://starwars.fandom.com/wiki/D%27Qar
 *   https://starwars.fandom.com/wiki/Exegol
 *   https://starwars.fandom.com/wiki/Starkiller_Base
 */

import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Entity, KnowledgeBase, type Entity as TEntity } from "../lib/schema";

const ROOT = process.cwd();
const KB_PATH = resolve(ROOT, "data/build/kb.json");
const MANIFEST_PATH = resolve(ROOT, "data/build/manifest.json");

type SequelPlanet = {
  slug: string;
  name: string;
  aliases: string[];
  short: string;
  long: string;
  region: string;
  firstAppearance: number;
  films: string[];
  source: string;
};

const SEQUEL_PLANETS: SequelPlanet[] = [
  {
    slug: "jakku",
    name: "Jakku",
    aliases: [],
    short: "arid · desert · graveyard of ships",
    long: "Jakku is a desert planet in the Inner Rim Western Reaches, scarred by the wreckage of the Battle of Jakku in 5 ABY where the New Republic crushed the Galactic Empire's last fleet. Decades later, the orphaned scavenger Rey grew up among the same wrecks until she fled aboard the Millennium Falcon in 34 ABY.",
    region: "Inner Rim",
    firstAppearance: 5,
    films: ["The Force Awakens", "The Rise of Skywalker"],
    source: "https://starwars.fandom.com/wiki/Jakku"
  },
  {
    slug: "takodana",
    name: "Takodana",
    aliases: [],
    short: "forest · lakes · neutral cantina",
    long: "Takodana is a temperate world of forests and lakes in the Mid Rim, home to Maz Kanata's castle — a watering hole for smugglers and pirates that stood for a thousand years until the First Order razed it in 34 ABY.",
    region: "Mid Rim",
    firstAppearance: 34,
    films: ["The Force Awakens"],
    source: "https://starwars.fandom.com/wiki/Takodana"
  },
  {
    slug: "ahch-to",
    name: "Ahch-To",
    aliases: ["Ach-To"],
    short: "ocean · porg · birthplace of the Jedi Order",
    long: "Ahch-To is an ocean planet in the Unknown Regions where the Jedi Order first formed. Its first temple holds the original Jedi texts. Luke Skywalker exiled himself here in 28 ABY and was found by Rey in 34 ABY.",
    region: "Unknown Regions",
    firstAppearance: 28,
    films: ["The Force Awakens", "The Last Jedi", "The Rise of Skywalker"],
    source: "https://starwars.fandom.com/wiki/Ahch-To"
  },
  {
    slug: "crait",
    name: "Crait",
    aliases: [],
    short: "salt · crystal · abandoned Rebel outpost",
    long: "Crait is a sparsely populated mineral world in the Outer Rim, its salt flats overlying deep red soil. The Rebel Alliance maintained an outpost there during the Galactic Civil War. The Resistance made its last stand against the First Order on Crait in 34 ABY.",
    region: "Outer Rim",
    firstAppearance: 34,
    films: ["The Last Jedi"],
    source: "https://starwars.fandom.com/wiki/Crait"
  },
  {
    slug: "kef-bir",
    name: "Kef Bir",
    aliases: ["Endor's ocean moon"],
    short: "ocean moon · Death Star wreckage",
    long: "Kef Bir is the ocean moon of the gas giant Endor, where the wreckage of the second Death Star fell after the Battle of Endor. In 35 ABY, Rey crossed its turbulent seas to retrieve a Sith wayfinder from the ruined throne room.",
    region: "Outer Rim · Endor System",
    firstAppearance: 35,
    films: ["The Rise of Skywalker"],
    source: "https://starwars.fandom.com/wiki/Kef_Bir"
  },
  {
    slug: "dqar",
    name: "D'Qar",
    aliases: ["D-Qar"],
    short: "temperate · forested · Resistance base",
    long: "D'Qar is a temperate forested world in the Outer Rim that served as the secret headquarters of the Resistance from its founding until the First Order discovered the base in 34 ABY, forcing an evacuation under fire.",
    region: "Outer Rim",
    firstAppearance: 34,
    films: ["The Force Awakens", "The Last Jedi"],
    source: "https://starwars.fandom.com/wiki/D'Qar"
  },
  {
    slug: "exegol",
    name: "Exegol",
    aliases: ["Sith homeworld"],
    short: "hidden Sith world · Final Order shipyard",
    long: "Exegol is a hidden world in the Unknown Regions, a Sith stronghold and home to the resurrected Emperor Palpatine. The Final Order's fleet was assembled here in secret. The Resistance and a galactic citizen fleet destroyed it in 35 ABY.",
    region: "Unknown Regions",
    firstAppearance: 35,
    films: ["The Rise of Skywalker"],
    source: "https://starwars.fandom.com/wiki/Exegol"
  },
  {
    slug: "starkiller-base",
    name: "Starkiller Base",
    aliases: ["Ilum"],
    short: "ice planet · superweapon · former Jedi crystal world",
    long: "Starkiller Base was a converted ice planet in the Unknown Regions — once Ilum, the Jedi Order's primary kyber crystal source. The First Order weaponized it as a superweapon capable of destroying entire star systems. The Resistance destroyed it shortly after it razed the Hosnian system in 34 ABY.",
    region: "Unknown Regions",
    firstAppearance: 34,
    films: ["The Force Awakens"],
    source: "https://starwars.fandom.com/wiki/Starkiller_Base"
  }
];

function toEntity(p: SequelPlanet): TEntity {
  return {
    id: `planet/sequel-${p.slug}`,
    type: "planet",
    name: p.name,
    aliases: p.aliases,
    canonicity: "canon",
    era: { firstAppearance: p.firstAppearance },
    spatial: { region: p.region },
    affiliations: [],
    relations: [],
    short: p.short,
    long: p.long,
    media: { gallery: [] },
    sources: [p.source]
  };
}

async function main() {
  const t0 = Date.now();

  const raw = await readFile(KB_PATH, "utf8");
  const kb = KnowledgeBase.parse(JSON.parse(raw));
  const existingNames = new Set(kb.entities.map((e) => e.name.toLowerCase()));

  const additions: TEntity[] = [];
  let skipped = 0;
  for (const p of SEQUEL_PLANETS) {
    if (existingNames.has(p.name.toLowerCase())) {
      skipped += 1;
      continue;
    }
    const entity = toEntity(p);
    const validated = Entity.safeParse(entity);
    if (!validated.success) {
      console.warn(`[sequel-planets] invalid: ${p.name}`, validated.error.issues.slice(0, 2));
      continue;
    }
    additions.push(validated.data);
  }

  if (additions.length === 0) {
    console.log(`[sequel-planets] no additions (skipped ${skipped} duplicates)`);
    return;
  }

  const merged: KnowledgeBase = {
    ...kb,
    entityCount: kb.entities.length + additions.length,
    entities: [...kb.entities, ...additions]
  };

  await writeFile(KB_PATH, JSON.stringify(merged), "utf8");

  // Update manifest
  try {
    const m = JSON.parse(await readFile(MANIFEST_PATH, "utf8"));
    m.sequelPlanetsAdded = additions.length;
    m.counts = m.counts ?? {};
    m.counts.total = merged.entityCount;
    await writeFile(MANIFEST_PATH, JSON.stringify(m, null, 2), "utf8");
  } catch (err) {
    console.warn("[sequel-planets] manifest update failed:", err);
  }

  const planetCount = merged.entities.filter((e) => e.type === "planet").length;
  console.log(
    `[sequel-planets] added ${additions.length} entities, skipped ${skipped} duplicates ` +
      `→ kb.json now has ${merged.entityCount} entities (${planetCount} planets) in ${Date.now() - t0}ms`
  );
}

main().catch((err) => {
  console.error("[sequel-planets] failed:", err);
  process.exit(1);
});
