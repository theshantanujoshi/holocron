/**
 * Ambient ship-class table for galaxy hyperspace traffic.
 *
 * Each entry describes a class of starship that should appear flying along
 * the named hyperspace lanes during a window of galactic history. The
 * ShipTraffic layer reads this table, filters by the global era scrubber,
 * and instances small glyphs along the lane polylines.
 *
 * The faction → color mapping mirrors DESIGN.md:
 *   civilian   → --color-fg-muted   (cream-dim, neutral)
 *   republic   → --color-accent     (electric holo-blue)
 *   resistance → --color-accent     (the Resistance inherits Rebel/Republic blue)
 *   rebel      → --color-accent     (rebel/republic blue)
 *   empire     → --color-alarm      (Imperial red)
 *   first-order→ --color-alarm      (First Order inherits Imperial red)
 *   cis        → --color-legends    (warm amber, distinct from canon factions)
 *
 * Era windows use the project-wide BBY/ABY convention: negative = BBY,
 * positive = ABY, 0 = Battle of Yavin. Civilian shipping has no temporal
 * window — it's active across the entire scrubber range.
 *
 * Wookieepedia references are linked per entry for traceability.
 */

export type ShipClass = {
  id: string;
  name: string;
  faction:
    | "civilian"
    | "republic"
    | "empire"
    | "rebel"
    | "cis"
    | "first-order"
    | "resistance";
  /** Era window in BBY/ABY years where this class is active. */
  activeFrom: number;
  activeTo: number;
  /** Relative speed multiplier (1 = baseline). */
  speedMul: number;
  /** Color via CSS var name. */
  colorVar: "--color-fg-muted" | "--color-accent" | "--color-alarm" | "--color-legends";
};

export const SHIP_CLASSES: readonly ShipClass[] = [
  // Civilian backbone — always on, every era. The lanes are trade routes
  // first and warzones second, so civilian traffic is the default texture.
  // https://starwars.fandom.com/wiki/YT-1300_light_freighter
  {
    id: "yt-1300-freighter",
    name: "YT-1300 Light Freighter",
    faction: "civilian",
    activeFrom: -25000,
    activeTo: 100,
    speedMul: 1.0,
    colorVar: "--color-fg-muted"
  },
  // https://starwars.fandom.com/wiki/Action_VI_transport
  {
    id: "action-vi-transport",
    name: "Action VI Bulk Transport",
    faction: "civilian",
    activeFrom: -25000,
    activeTo: 100,
    speedMul: 0.7,
    colorVar: "--color-fg-muted"
  },

  // Old/Galactic Republic & Clone Wars-era — active during the late
  // Republic and through the Clone Wars. Republic Venators are the iconic
  // capital ship of the era.
  // https://starwars.fandom.com/wiki/Venator-class_Star_Destroyer
  {
    id: "venator-star-destroyer",
    name: "Venator-class Star Destroyer",
    faction: "republic",
    activeFrom: -22,
    activeTo: -19,
    speedMul: 0.85,
    colorVar: "--color-accent"
  },
  // https://starwars.fandom.com/wiki/Consular-class_space_cruiser
  {
    id: "consular-cruiser",
    name: "Consular-class Cruiser",
    faction: "republic",
    activeFrom: -100,
    activeTo: -19,
    speedMul: 1.1,
    colorVar: "--color-accent"
  },

  // Confederacy of Independent Systems — narrow window matching the
  // Clone Wars (-22 to -19 BBY).
  // https://starwars.fandom.com/wiki/Munificent-class_star_frigate
  {
    id: "munificent-frigate",
    name: "Munificent-class Star Frigate",
    faction: "cis",
    activeFrom: -22,
    activeTo: -19,
    speedMul: 0.9,
    colorVar: "--color-legends"
  },
  // https://starwars.fandom.com/wiki/Vulture-class_droid_starfighter
  {
    id: "vulture-droid",
    name: "Vulture-class Droid Starfighter",
    faction: "cis",
    activeFrom: -22,
    activeTo: -19,
    speedMul: 1.4,
    colorVar: "--color-legends"
  },

  // Galactic Empire — from the rise (~19 BBY) through Endor (4 ABY).
  // https://starwars.fandom.com/wiki/Imperial-class_Star_Destroyer
  {
    id: "imperial-star-destroyer",
    name: "Imperial-class Star Destroyer",
    faction: "empire",
    activeFrom: -19,
    activeTo: 5,
    speedMul: 0.8,
    colorVar: "--color-alarm"
  },
  // https://starwars.fandom.com/wiki/TIE/ln_space_superiority_starfighter
  {
    id: "tie-fighter",
    name: "TIE/ln Starfighter",
    faction: "empire",
    activeFrom: -19,
    activeTo: 5,
    speedMul: 1.5,
    colorVar: "--color-alarm"
  },

  // Rebel Alliance — formal window 2 BBY (Mon Mothma's declaration) to
  // 4 ABY (Endor). We extend slightly so insurgent activity reads earlier.
  // https://starwars.fandom.com/wiki/T-65B_X-wing_starfighter
  {
    id: "x-wing",
    name: "T-65B X-wing Starfighter",
    faction: "rebel",
    activeFrom: -5,
    activeTo: 5,
    speedMul: 1.4,
    colorVar: "--color-accent"
  },
  // https://starwars.fandom.com/wiki/GR-75_medium_transport
  {
    id: "gr-75-transport",
    name: "GR-75 Medium Transport",
    faction: "rebel",
    activeFrom: -3,
    activeTo: 5,
    speedMul: 0.75,
    colorVar: "--color-accent"
  },

  // Sequel-trilogy era — First Order vs Resistance, ~28-35 ABY.
  // https://starwars.fandom.com/wiki/Resurgent-class_Star_Destroyer
  {
    id: "resurgent-star-destroyer",
    name: "Resurgent-class Star Destroyer",
    faction: "first-order",
    activeFrom: 28,
    activeTo: 35,
    speedMul: 0.85,
    colorVar: "--color-alarm"
  },
  // https://starwars.fandom.com/wiki/T-70_X-wing_starfighter
  {
    id: "t70-x-wing",
    name: "T-70 X-wing Starfighter",
    faction: "resistance",
    activeFrom: 28,
    activeTo: 35,
    speedMul: 1.45,
    colorVar: "--color-accent"
  }
];
