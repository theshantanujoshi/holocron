import type { TimelineEvent } from "@/lib/schema";

/**
 * Canonical Star Wars events used by the Timeline view as event markers
 * tethered to planet positions on the galactic projection.
 *
 * Year sources:
 *   • Most years are well-known canon dates from the films and Wookieepedia.
 *   • Less obvious dates link to the Wookieepedia article that anchors them.
 *
 * Locations reference real planet IDs from data/build/kb.json (SWAPI numeric
 * ids). When the canonical site has no matching planet entity (e.g. Ruusan,
 * Mandalore-system battles where Mandalore itself isn't in SWAPI's planet
 * list at the relevant id), `locationId` is omitted and the marker renders
 * at galactic origin.
 */

export const CANON_EVENTS: TimelineEvent[] = [
  // — Pre-Republic / Old Republic —
  {
    id: "event/republic-founding",
    year: -25025,
    title: "Republic founding",
    short: "The Galactic Republic is founded on Coruscant.",
    involves: [],
    locationId: "planet/9", // Coruscant
    category: "founding",
    canonicity: "both",
    sources: []
  },
  {
    id: "event/treaty-of-coruscant",
    year: -3653,
    // https://starwars.fandom.com/wiki/Treaty_of_Coruscant
    title: "Treaty of Coruscant",
    short: "Sith Empire forces sack Coruscant; treaty pauses the Great Galactic War.",
    involves: [],
    locationId: "planet/9", // Coruscant
    category: "treaty",
    canonicity: "legends",
    sources: ["https://starwars.fandom.com/wiki/Treaty_of_Coruscant"]
  },
  {
    id: "event/mandalorian-wars",
    year: -3956,
    // https://starwars.fandom.com/wiki/Mandalorian_Wars
    title: "Mandalorian Wars",
    short: "Revan and Malak lead the Republic against the Mandalorian Neo-Crusaders.",
    involves: [],
    category: "battle",
    canonicity: "legends",
    sources: ["https://starwars.fandom.com/wiki/Mandalorian_Wars"]
  },
  {
    id: "event/ruusan-reformation",
    year: -1000,
    // https://starwars.fandom.com/wiki/Ruusan_Reformation
    title: "Ruusan Reformation",
    short: "Republic restructures after the Battle of Ruusan; the Sith hide for a millennium.",
    involves: [],
    category: "political",
    canonicity: "both",
    sources: ["https://starwars.fandom.com/wiki/Ruusan_Reformation"]
  },

  // — Prequel era —
  {
    id: "event/invasion-of-naboo",
    year: -32,
    // https://starwars.fandom.com/wiki/Invasion_of_Naboo
    title: "Invasion of Naboo",
    short: "Trade Federation blockade and invasion; first appearance of Darth Maul.",
    involves: [],
    locationId: "planet/8", // Naboo
    category: "battle",
    canonicity: "canon",
    sources: ["https://starwars.fandom.com/wiki/Invasion_of_Naboo"]
  },
  {
    id: "event/battle-of-geonosis",
    year: -22,
    // https://starwars.fandom.com/wiki/First_Battle_of_Geonosis
    title: "First Battle of Geonosis",
    short: "Clone Wars begin: Jedi strike team and Grand Army engage Separatist forces.",
    involves: [],
    locationId: "planet/11", // Geonosis
    category: "battle",
    canonicity: "canon",
    sources: ["https://starwars.fandom.com/wiki/First_Battle_of_Geonosis"]
  },
  {
    id: "event/order-66",
    year: -19,
    // https://starwars.fandom.com/wiki/Order_66
    title: "Order 66",
    short: "Palpatine triggers the clone protocol that nearly extinguishes the Jedi Order.",
    involves: [],
    locationId: "planet/9", // Coruscant
    category: "political",
    canonicity: "canon",
    sources: ["https://starwars.fandom.com/wiki/Order_66"]
  },
  {
    id: "event/duel-on-mustafar",
    year: -19,
    // https://starwars.fandom.com/wiki/Duel_on_Mustafar
    title: "Duel on Mustafar",
    short: "Obi-Wan defeats Anakin Skywalker on the lava world; the Empire rises.",
    involves: [],
    locationId: "planet/13", // Mustafar
    category: "personal",
    canonicity: "canon",
    sources: ["https://starwars.fandom.com/wiki/Duel_on_Mustafar"]
  },

  // — Galactic Civil War —
  {
    id: "event/battle-of-yavin",
    year: 0,
    // https://starwars.fandom.com/wiki/Battle_of_Yavin
    title: "Battle of Yavin",
    short: "Rebel fighters destroy the Death Star above the Yavin system.",
    involves: [],
    locationId: "planet/3", // Yavin IV
    category: "battle",
    canonicity: "canon",
    sources: ["https://starwars.fandom.com/wiki/Battle_of_Yavin"]
  },
  {
    id: "event/battle-of-hoth",
    year: 3,
    // https://starwars.fandom.com/wiki/Battle_of_Hoth
    title: "Battle of Hoth",
    short: "Imperial assault on Echo Base scatters the Rebel Alliance.",
    involves: [],
    locationId: "planet/4", // Hoth
    category: "battle",
    canonicity: "canon",
    sources: ["https://starwars.fandom.com/wiki/Battle_of_Hoth"]
  },
  {
    id: "event/battle-of-endor",
    year: 4,
    // https://starwars.fandom.com/wiki/Battle_of_Endor
    title: "Battle of Endor",
    short: "Second Death Star destroyed; the Emperor falls.",
    involves: [],
    locationId: "planet/7", // Endor
    category: "battle",
    canonicity: "canon",
    sources: ["https://starwars.fandom.com/wiki/Battle_of_Endor"]
  },

  // — Sequel era —
  {
    id: "event/hosnian-cataclysm",
    year: 34,
    // https://starwars.fandom.com/wiki/Hosnian_Cataclysm
    title: "Hosnian Cataclysm",
    short: "Starkiller Base destroys the Hosnian system, decapitating the New Republic.",
    involves: [],
    category: "destruction",
    canonicity: "canon",
    sources: ["https://starwars.fandom.com/wiki/Hosnian_Cataclysm"]
  },
  {
    id: "event/battle-of-exegol",
    year: 35,
    // https://starwars.fandom.com/wiki/Battle_of_Exegol
    title: "Battle of Exegol",
    short: "The Resistance and Citizens' Fleet defeat Palpatine's Sith Eternal armada.",
    involves: [],
    category: "battle",
    canonicity: "canon",
    sources: ["https://starwars.fandom.com/wiki/Battle_of_Exegol"]
  }
];
