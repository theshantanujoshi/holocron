/**
 * build-lineage.ts
 *
 * Builds Force-lineage graph data for the Holocron 3D force-graph.
 *
 * DATA SOURCES INVESTIGATED:
 *   - fgeorges/star-wars-dataset (raw.githubusercontent.com/fgeorges/star-wars-dataset/master/data/enriched.json)
 *     → Contains only Wikipedia-style text descriptions, no structured master/apprentice data.
 *   - SAP-samples/cloud-cap-hana-swapi (github.com/SAP-samples/cloud-cap-hana-swapi)
 *     → data/ dir contains only a cache/ subdirectory with no relationship JSON.
 *   Neither source yields machine-readable lineage. Falling back to canonical hand-curated data.
 *
 * CANONICAL FALLBACK DATA:
 *   All master/apprentice and parent/child relationships below are sourced from Wookieepedia
 *   (canonical Star Wars wiki). Article URLs are cited inline per chain.
 *
 * OUTPUT:
 *   data/build/lineage.json — { builtAt, nodes, edges } optimized for 3D force-graph.
 *   Only persons participating in at least one lineage edge are included as nodes.
 */

import { readFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";
import { Entity, Relation, RelationKind, type Entity as TEntity, type RelationKind as TRelationKind } from "../lib/schema";

const ROOT = process.cwd();
const OUT = resolve(ROOT, "data/build");
const KB_PATH = resolve(OUT, "kb.json");

// ---------------------------------------------------------------------------
// Lineage graph output schema
// ---------------------------------------------------------------------------

const LineageNode = z.object({
  id: z.string(),
  name: z.string(),
  faction: z.string().optional(),
  canonicity: z.enum(["canon", "legends", "both"]),
  type: z.literal("person")
});
type TLineageNode = z.infer<typeof LineageNode>;

const LineageEdge = z.object({
  source: z.string(),
  target: z.string(),
  kind: RelationKind
});
type TLineageEdge = z.infer<typeof LineageEdge>;

const LineageGraph = z.object({
  builtAt: z.string(),
  nodes: z.array(LineageNode),
  edges: z.array(LineageEdge)
});

// ---------------------------------------------------------------------------
// Raw lineage relationship type (before ID resolution)
// ---------------------------------------------------------------------------

type RawEdge = {
  sourceName: string;
  targetName: string;
  kind: TRelationKind;
  canonicity: "canon" | "legends" | "both";
  /** Wookieepedia article URL evidencing this relationship */
  source: string;
};

type ExtraPersonDef = {
  name: string;
  canonicity: "canon" | "legends" | "both";
  faction?: string;
  /** Wookieepedia article URL */
  wookieeUrl: string;
};

// ---------------------------------------------------------------------------
// Canonical Force-lineage data (Wookieepedia-sourced)
// ---------------------------------------------------------------------------

/**
 * Extra person entities not present in SWAPI (the 82 SWAPI people cover the films).
 * These are Force-users who appear only in The Clone Wars, Rebels, comics, or Legends.
 * All canonicity flags follow current (post-2014 Disney canon) designation.
 */
const EXTRA_PERSONS: ExtraPersonDef[] = [
  // High Republic / ancient Jedi
  {
    name: "Darth Plagueis",
    canonicity: "canon",
    faction: "sith_order",
    // https://starwars.fandom.com/wiki/Darth_Plagueis
    wookieeUrl: "https://starwars.fandom.com/wiki/Darth_Plagueis"
  },
  {
    name: "Darth Bane",
    canonicity: "canon",
    faction: "sith_order",
    // https://starwars.fandom.com/wiki/Darth_Bane
    wookieeUrl: "https://starwars.fandom.com/wiki/Darth_Bane"
  },
  // Rebels-era
  {
    name: "Kanan Jarrus",
    canonicity: "canon",
    faction: "jedi_order",
    // https://starwars.fandom.com/wiki/Kanan_Jarrus
    wookieeUrl: "https://starwars.fandom.com/wiki/Kanan_Jarrus"
  },
  {
    name: "Ezra Bridger",
    canonicity: "canon",
    faction: "jedi_order",
    // https://starwars.fandom.com/wiki/Ezra_Bridger
    wookieeUrl: "https://starwars.fandom.com/wiki/Ezra_Bridger"
  },
  {
    name: "Ahsoka Tano",
    canonicity: "canon",
    faction: "jedi_order",
    // https://starwars.fandom.com/wiki/Ahsoka_Tano
    wookieeUrl: "https://starwars.fandom.com/wiki/Ahsoka_Tano"
  },
  // Clone Wars Jedi
  {
    name: "Depa Billaba",
    canonicity: "canon",
    faction: "jedi_order",
    // https://starwars.fandom.com/wiki/Depa_Billaba
    wookieeUrl: "https://starwars.fandom.com/wiki/Depa_Billaba"
  },
  {
    name: "Caleb Dume",
    canonicity: "canon",
    faction: "jedi_order",
    // Kanan Jarrus's birth name — same person, but tracked as alias only.
    // Not adding as separate node; Kanan Jarrus covers this.
    wookieeUrl: "https://starwars.fandom.com/wiki/Kanan_Jarrus"
  },
  // Sequel era
  {
    name: "Rey Skywalker",
    canonicity: "canon",
    faction: "jedi_order",
    // https://starwars.fandom.com/wiki/Rey_Skywalker
    wookieeUrl: "https://starwars.fandom.com/wiki/Rey_Skywalker"
  },
  {
    name: "Ben Solo",
    canonicity: "canon",
    faction: "sith_order",
    // https://starwars.fandom.com/wiki/Ben_Solo
    wookieeUrl: "https://starwars.fandom.com/wiki/Ben_Solo"
  },
  {
    name: "Snoke",
    canonicity: "canon",
    faction: "sith_order",
    // https://starwars.fandom.com/wiki/Snoke
    wookieeUrl: "https://starwars.fandom.com/wiki/Snoke"
  },
  // High Republic Jedi Masters
  {
    name: "Yaddle",
    canonicity: "canon",
    faction: "jedi_order",
    // https://starwars.fandom.com/wiki/Yaddle
    wookieeUrl: "https://starwars.fandom.com/wiki/Yaddle"
  },
  {
    name: "Oppo Rancisis",
    canonicity: "canon",
    faction: "jedi_order",
    // https://starwars.fandom.com/wiki/Oppo_Rancisis
    wookieeUrl: "https://starwars.fandom.com/wiki/Oppo_Rancisis"
  },
  // Legends only
  {
    name: "Mara Jade Skywalker",
    canonicity: "legends",
    faction: "jedi_order",
    // https://starwars.fandom.com/wiki/Mara_Jade_Skywalker
    wookieeUrl: "https://starwars.fandom.com/wiki/Mara_Jade_Skywalker"
  },
  {
    name: "Darth Revan",
    canonicity: "legends",
    faction: "sith_order",
    // https://starwars.fandom.com/wiki/Revan
    wookieeUrl: "https://starwars.fandom.com/wiki/Revan"
  },
  {
    name: "Darth Malak",
    canonicity: "legends",
    faction: "sith_order",
    // https://starwars.fandom.com/wiki/Darth_Malak
    wookieeUrl: "https://starwars.fandom.com/wiki/Darth_Malak"
  },
  {
    name: "Exar Kun",
    canonicity: "legends",
    faction: "sith_order",
    // https://starwars.fandom.com/wiki/Exar_Kun
    wookieeUrl: "https://starwars.fandom.com/wiki/Exar_Kun"
  }
];

// Deduplicate: "Caleb Dume" is Kanan Jarrus — remove the duplicate entry
const UNIQUE_EXTRA_PERSONS = EXTRA_PERSONS.filter(p => p.name !== "Caleb Dume");

/**
 * Canonical master → apprentice chains.
 * Source: Wookieepedia "Apprentices" sections on each character's article.
 *
 * Chain 1 — Ancient Sith Rule of Two
 *   https://starwars.fandom.com/wiki/Rule_of_Two
 *   https://starwars.fandom.com/wiki/Darth_Bane
 *   https://starwars.fandom.com/wiki/Darth_Plagueis
 *   https://starwars.fandom.com/wiki/Palpatine
 *
 * Chain 2 — Jedi lineage culminating in Obi-Wan → Anakin → Ahsoka
 *   https://starwars.fandom.com/wiki/Yoda
 *   https://starwars.fandom.com/wiki/Dooku
 *   https://starwars.fandom.com/wiki/Qui-Gon_Jinn
 *   https://starwars.fandom.com/wiki/Obi-Wan_Kenobi
 *   https://starwars.fandom.com/wiki/Anakin_Skywalker
 *   https://starwars.fandom.com/wiki/Ahsoka_Tano
 *
 * Chain 3 — Luke's Jedi Order
 *   https://starwars.fandom.com/wiki/Luke_Skywalker
 *
 * Chain 4 — Rebels lineage
 *   https://starwars.fandom.com/wiki/Kanan_Jarrus
 *   https://starwars.fandom.com/wiki/Ezra_Bridger
 *
 * Chain 5 — Family trees
 *   https://starwars.fandom.com/wiki/Skywalker_family
 *   https://starwars.fandom.com/wiki/Solo_family
 *
 * Chain 6 — Mace Windu
 *   https://starwars.fandom.com/wiki/Mace_Windu
 *   https://starwars.fandom.com/wiki/Depa_Billaba
 *
 * Chain 7 — Plo Koon → Ahsoka Tano (Plo discovered Ahsoka)
 *   https://starwars.fandom.com/wiki/Plo_Koon
 */
const RAW_EDGES: RawEdge[] = [
  // ─────────────────────────────────────────────────────────────────────────
  // SITH RULE OF TWO CHAIN
  // Darth Bane → Darth Plagueis → Palpatine → Maul/Dooku/Vader
  // ─────────────────────────────────────────────────────────────────────────
  {
    // https://starwars.fandom.com/wiki/Darth_Plagueis (Bane's Rule of Two lineage, canon reference in Revenge of the Sith)
    sourceName: "Darth Bane",
    targetName: "Darth Plagueis",
    kind: "master_of",
    canonicity: "legends", // Bane→Plagueis chain is Legends; Bane himself is canon (ROTS mention)
    source: "https://starwars.fandom.com/wiki/Darth_Bane"
  },
  {
    // https://starwars.fandom.com/wiki/Palpatine — "Plagueis trained Palpatine" (ROTS, canon)
    sourceName: "Darth Plagueis",
    targetName: "Palpatine",
    kind: "master_of",
    canonicity: "canon",
    source: "https://starwars.fandom.com/wiki/Darth_Plagueis"
  },
  {
    // https://starwars.fandom.com/wiki/Darth_Maul — Sidious trained Maul (TPM, canon)
    sourceName: "Palpatine",
    targetName: "Darth Maul",
    kind: "master_of",
    canonicity: "canon",
    source: "https://starwars.fandom.com/wiki/Darth_Maul"
  },
  {
    // https://starwars.fandom.com/wiki/Dooku — Sidious took Dooku as second apprentice (AOTC/clone wars, canon)
    sourceName: "Palpatine",
    targetName: "Dooku",
    kind: "master_of",
    canonicity: "canon",
    source: "https://starwars.fandom.com/wiki/Dooku"
  },
  {
    // https://starwars.fandom.com/wiki/Darth_Vader — Sidious turned Anakin into Vader (ROTS, canon)
    sourceName: "Palpatine",
    targetName: "Anakin Skywalker",
    kind: "master_of",
    canonicity: "canon",
    source: "https://starwars.fandom.com/wiki/Darth_Vader"
  },
  {
    // https://starwars.fandom.com/wiki/Snoke — Palpatine created/controlled Snoke (TROS, canon)
    sourceName: "Palpatine",
    targetName: "Snoke",
    kind: "master_of",
    canonicity: "canon",
    source: "https://starwars.fandom.com/wiki/Snoke"
  },
  {
    // https://starwars.fandom.com/wiki/Ben_Solo — Snoke trained Kylo Ren / Ben Solo (TFA-TROS, canon)
    sourceName: "Snoke",
    targetName: "Ben Solo",
    kind: "master_of",
    canonicity: "canon",
    source: "https://starwars.fandom.com/wiki/Ben_Solo"
  },

  // ─────────────────────────────────────────────────────────────────────────
  // JEDI GRAND MASTER LINEAGE
  // Yoda → Dooku → Qui-Gon → Obi-Wan → Anakin → Ahsoka/Luke
  // ─────────────────────────────────────────────────────────────────────────
  {
    // https://starwars.fandom.com/wiki/Dooku — Yoda trained Dooku (mentioned AOTC + TCW, canon)
    sourceName: "Yoda",
    targetName: "Dooku",
    kind: "master_of",
    canonicity: "canon",
    source: "https://starwars.fandom.com/wiki/Dooku"
  },
  {
    // https://starwars.fandom.com/wiki/Qui-Gon_Jinn — Dooku trained Qui-Gon (AOTC novelization + TCW, canon)
    sourceName: "Dooku",
    targetName: "Qui-Gon Jinn",
    kind: "master_of",
    canonicity: "canon",
    source: "https://starwars.fandom.com/wiki/Qui-Gon_Jinn"
  },
  {
    // https://starwars.fandom.com/wiki/Obi-Wan_Kenobi — Qui-Gon trained Obi-Wan (TPM, canon)
    sourceName: "Qui-Gon Jinn",
    targetName: "Obi-Wan Kenobi",
    kind: "master_of",
    canonicity: "canon",
    source: "https://starwars.fandom.com/wiki/Obi-Wan_Kenobi"
  },
  {
    // https://starwars.fandom.com/wiki/Anakin_Skywalker — Obi-Wan trained Anakin (AOTC-ROTS, canon)
    sourceName: "Obi-Wan Kenobi",
    targetName: "Anakin Skywalker",
    kind: "master_of",
    canonicity: "canon",
    source: "https://starwars.fandom.com/wiki/Anakin_Skywalker"
  },
  {
    // https://starwars.fandom.com/wiki/Ahsoka_Tano — Anakin trained Ahsoka (TCW, canon)
    sourceName: "Anakin Skywalker",
    targetName: "Ahsoka Tano",
    kind: "master_of",
    canonicity: "canon",
    source: "https://starwars.fandom.com/wiki/Ahsoka_Tano"
  },
  {
    // https://starwars.fandom.com/wiki/Luke_Skywalker — Obi-Wan trained Luke (ANH, canon)
    sourceName: "Obi-Wan Kenobi",
    targetName: "Luke Skywalker",
    kind: "master_of",
    canonicity: "canon",
    source: "https://starwars.fandom.com/wiki/Luke_Skywalker"
  },
  {
    // https://starwars.fandom.com/wiki/Luke_Skywalker — Yoda trained Luke (ESB, canon)
    sourceName: "Yoda",
    targetName: "Luke Skywalker",
    kind: "master_of",
    canonicity: "canon",
    source: "https://starwars.fandom.com/wiki/Luke_Skywalker"
  },
  {
    // https://starwars.fandom.com/wiki/Rey_Skywalker — Luke trained Rey (TLJ, canon)
    sourceName: "Luke Skywalker",
    targetName: "Rey Skywalker",
    kind: "master_of",
    canonicity: "canon",
    source: "https://starwars.fandom.com/wiki/Rey_Skywalker"
  },
  {
    // https://starwars.fandom.com/wiki/Rey_Skywalker — Leia trained Rey briefly (TLJ-TROS, canon)
    sourceName: "Leia Organa",
    targetName: "Rey Skywalker",
    kind: "master_of",
    canonicity: "canon",
    source: "https://starwars.fandom.com/wiki/Rey_Skywalker"
  },
  {
    // https://starwars.fandom.com/wiki/Ben_Solo — Luke began training Ben Solo (TLJ flashback, canon)
    sourceName: "Luke Skywalker",
    targetName: "Ben Solo",
    kind: "master_of",
    canonicity: "canon",
    source: "https://starwars.fandom.com/wiki/Ben_Solo"
  },

  // ─────────────────────────────────────────────────────────────────────────
  // MACE WINDU → DEPA BILLABA → KANAN JARRUS → EZRA BRIDGER
  // ─────────────────────────────────────────────────────────────────────────
  {
    // https://starwars.fandom.com/wiki/Depa_Billaba — Mace Windu trained Depa Billaba (TCW/Kanan comic, canon)
    sourceName: "Mace Windu",
    targetName: "Depa Billaba",
    kind: "master_of",
    canonicity: "canon",
    source: "https://starwars.fandom.com/wiki/Depa_Billaba"
  },
  {
    // https://starwars.fandom.com/wiki/Kanan_Jarrus — Depa Billaba trained Kanan (Kanan comic series, canon)
    sourceName: "Depa Billaba",
    targetName: "Kanan Jarrus",
    kind: "master_of",
    canonicity: "canon",
    source: "https://starwars.fandom.com/wiki/Kanan_Jarrus"
  },
  {
    // https://starwars.fandom.com/wiki/Ezra_Bridger — Kanan trained Ezra (Rebels S1-S4, canon)
    sourceName: "Kanan Jarrus",
    targetName: "Ezra Bridger",
    kind: "master_of",
    canonicity: "canon",
    source: "https://starwars.fandom.com/wiki/Ezra_Bridger"
  },

  // ─────────────────────────────────────────────────────────────────────────
  // KI-ADI-MUNDI LINEAGE (Council member)
  // Yoda → Ki-Adi-Mundi (Yoda was overall teacher of many Jedi)
  // https://starwars.fandom.com/wiki/Ki-Adi-Mundi
  // Ki-Adi-Mundi was trained by Yoda, confirmed in Legends; in canon his master
  // is listed as An'ya Kuro (Dark Woman). Using canon designation.
  // ─────────────────────────────────────────────────────────────────────────

  // PLO KOON — discovered Ahsoka, acted as a surrogate master figure
  {
    // https://starwars.fandom.com/wiki/Plo_Koon — Plo Koon discovered Ahsoka on Shili (TCW, canon)
    // This is a mentor relationship, mapped to master_of
    sourceName: "Plo Koon",
    targetName: "Ahsoka Tano",
    kind: "master_of",
    canonicity: "canon",
    source: "https://starwars.fandom.com/wiki/Plo_Koon"
  },

  // Luminara Unduli → Barriss Offee
  {
    // https://starwars.fandom.com/wiki/Barriss_Offee — Luminara trained Barriss (AOTC + TCW, canon)
    sourceName: "Luminara Unduli",
    targetName: "Barriss Offee",
    kind: "master_of",
    canonicity: "canon",
    source: "https://starwars.fandom.com/wiki/Barriss_Offee"
  },

  // ─────────────────────────────────────────────────────────────────────────
  // LEGENDS: Revan → Malak, Exar Kun lineage
  // ─────────────────────────────────────────────────────────────────────────
  {
    // https://starwars.fandom.com/wiki/Darth_Malak — Revan trained Malak (KOTOR game, Legends)
    sourceName: "Darth Revan",
    targetName: "Darth Malak",
    kind: "master_of",
    canonicity: "legends",
    source: "https://starwars.fandom.com/wiki/Darth_Malak"
  },
  {
    // https://starwars.fandom.com/wiki/Mara_Jade_Skywalker — Luke trained Mara Jade (NJO novels, Legends)
    sourceName: "Luke Skywalker",
    targetName: "Mara Jade Skywalker",
    kind: "master_of",
    canonicity: "legends",
    source: "https://starwars.fandom.com/wiki/Mara_Jade_Skywalker"
  },

  // ─────────────────────────────────────────────────────────────────────────
  // FAMILY / PARENT-CHILD RELATIONSHIPS
  // ─────────────────────────────────────────────────────────────────────────

  // Anakin → Luke, Anakin → Leia
  {
    // https://starwars.fandom.com/wiki/Skywalker_family — Anakin is Luke's father (ESB reveal, canon)
    sourceName: "Anakin Skywalker",
    targetName: "Luke Skywalker",
    kind: "parent_of",
    canonicity: "canon",
    source: "https://starwars.fandom.com/wiki/Skywalker_family"
  },
  {
    // https://starwars.fandom.com/wiki/Skywalker_family — Anakin is Leia's father (ROTJ reveal, canon)
    sourceName: "Anakin Skywalker",
    targetName: "Leia Organa",
    kind: "parent_of",
    canonicity: "canon",
    source: "https://starwars.fandom.com/wiki/Skywalker_family"
  },

  // Luke ↔ Leia siblings
  {
    // https://starwars.fandom.com/wiki/Skywalker_family — twins (ROTJ, canon)
    sourceName: "Luke Skywalker",
    targetName: "Leia Organa",
    kind: "sibling_of",
    canonicity: "canon",
    source: "https://starwars.fandom.com/wiki/Skywalker_family"
  },

  // Padmé + Anakin → Luke, Leia
  {
    // https://starwars.fandom.com/wiki/Padme_Amidala — Padmé is mother of twins (ROTS, canon)
    sourceName: "Padmé Amidala",
    targetName: "Luke Skywalker",
    kind: "parent_of",
    canonicity: "canon",
    source: "https://starwars.fandom.com/wiki/Pad%C3%BEam%C3%A9_Amidala"
  },
  {
    sourceName: "Padmé Amidala",
    targetName: "Leia Organa",
    kind: "parent_of",
    canonicity: "canon",
    source: "https://starwars.fandom.com/wiki/Pad%C3%BEam%C3%A9_Amidala"
  },

  // Spouse: Padmé ↔ Anakin
  {
    // https://starwars.fandom.com/wiki/Skywalker_family — secret marriage (AOTC-ROTS, canon)
    sourceName: "Anakin Skywalker",
    targetName: "Padmé Amidala",
    kind: "spouse_of",
    canonicity: "canon",
    source: "https://starwars.fandom.com/wiki/Skywalker_family"
  },

  // Han + Leia → Ben Solo
  {
    // https://starwars.fandom.com/wiki/Solo_family — Leia is Ben's mother (TFA, canon)
    sourceName: "Leia Organa",
    targetName: "Ben Solo",
    kind: "parent_of",
    canonicity: "canon",
    source: "https://starwars.fandom.com/wiki/Solo_family"
  },
  {
    // https://starwars.fandom.com/wiki/Solo_family — Han is Ben's father (TFA, canon)
    sourceName: "Han Solo",
    targetName: "Ben Solo",
    kind: "parent_of",
    canonicity: "canon",
    source: "https://starwars.fandom.com/wiki/Solo_family"
  },
  {
    // https://starwars.fandom.com/wiki/Solo_family — Han ↔ Leia spouse (ANH-TFA, canon)
    sourceName: "Han Solo",
    targetName: "Leia Organa",
    kind: "spouse_of",
    canonicity: "canon",
    source: "https://starwars.fandom.com/wiki/Solo_family"
  },

  // Shmi Skywalker → Anakin
  {
    // https://starwars.fandom.com/wiki/Shmi_Skywalker — Shmi is Anakin's mother (TPM, canon)
    sourceName: "Shmi Skywalker",
    targetName: "Anakin Skywalker",
    kind: "parent_of",
    canonicity: "canon",
    source: "https://starwars.fandom.com/wiki/Shmi_Skywalker"
  },

  // Owen Lars ↔ Beru Whitesun — step-uncle/aunt of Luke
  {
    // https://starwars.fandom.com/wiki/Owen_Lars — Owen/Beru are Luke's guardians (ANH, canon)
    sourceName: "Owen Lars",
    targetName: "Beru Whitesun lars",
    kind: "spouse_of",
    canonicity: "canon",
    source: "https://starwars.fandom.com/wiki/Owen_Lars"
  },

  // Jango Fett → Boba Fett
  {
    // https://starwars.fandom.com/wiki/Boba_Fett — Boba is unaltered clone/adoptee of Jango (AOTC, canon)
    sourceName: "Jango Fett",
    targetName: "Boba Fett",
    kind: "parent_of",
    canonicity: "canon",
    source: "https://starwars.fandom.com/wiki/Boba_Fett"
  },

  // Bail Organa adopted Leia
  {
    // https://starwars.fandom.com/wiki/Bail_Prestor_Organa — Bail adopted Leia (ROTS, canon)
    sourceName: "Bail Prestor Organa",
    targetName: "Leia Organa",
    kind: "parent_of",
    canonicity: "canon",
    source: "https://starwars.fandom.com/wiki/Bail_Prestor_Organa"
  },

  // ─────────────────────────────────────────────────────────────────────────
  // LEGENDS: Luke ↔ Mara Jade spouse
  // ─────────────────────────────────────────────────────────────────────────
  {
    // https://starwars.fandom.com/wiki/Mara_Jade_Skywalker — married Luke (NJO, Legends)
    sourceName: "Luke Skywalker",
    targetName: "Mara Jade Skywalker",
    kind: "spouse_of",
    canonicity: "legends",
    source: "https://starwars.fandom.com/wiki/Mara_Jade_Skywalker"
  }
];

// ---------------------------------------------------------------------------
// Load KB and build lookup maps
// ---------------------------------------------------------------------------

type KBEntity = {
  id: string;
  type: string;
  name: string;
  canonicity: "canon" | "legends" | "both";
  affiliations: Array<{ faction: string }>;
  relations: Array<{ kind: string; target: string }>;
};

type KB = {
  builtAt: string;
  entities: KBEntity[];
};

function loadKb(): KB {
  const raw = readFileSync(KB_PATH, "utf8");
  return JSON.parse(raw) as KB;
}

function buildNameMap(entities: KBEntity[]): Map<string, KBEntity> {
  const map = new Map<string, KBEntity>();
  for (const e of entities) {
    map.set(e.name.toLowerCase(), e);
  }
  return map;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/['"`]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// ---------------------------------------------------------------------------
// Main pipeline
// ---------------------------------------------------------------------------

function main(): void {
  console.log("[lineage] loading kb.json…");
  const kb = loadKb();
  const existingPersons = kb.entities.filter(e => e.type === "person");
  const nameMap = buildNameMap(existingPersons);

  console.log(`[lineage] found ${existingPersons.length} existing person entities in kb`);

  // Assign stable IDs to extra persons
  // SWAPI uses numeric IDs like person/1; extras use person/<slug>
  const extraPersonMap = new Map<string, TLineageNode>();

  for (const ep of UNIQUE_EXTRA_PERSONS) {
    const slug = slugify(ep.name);
    const id = `person/${slug}`;
    extraPersonMap.set(ep.name.toLowerCase(), {
      id,
      name: ep.name,
      faction: ep.faction,
      canonicity: ep.canonicity,
      type: "person"
    });
  }

  // Resolve a name to its entity ID
  function resolveId(name: string): { id: string; found: boolean } {
    const lower = name.toLowerCase();

    // Check SWAPI kb first
    const fromKb = nameMap.get(lower);
    if (fromKb !== undefined) {
      return { id: fromKb.id, found: true };
    }

    // Check extra persons
    const fromExtra = extraPersonMap.get(lower);
    if (fromExtra !== undefined) {
      return { id: fromExtra.id, found: true };
    }

    // Handle known aliases that differ from canonical names
    const ALIASES: Record<string, string> = {
      // SWAPI uses full "Padmé Amidala" but raw edges use the same — just in case
      "padme amidala": "padmé amidala",
      "beru whitesun": "beru whitesun lars",
      "emperor palpatine": "palpatine",
      "darth sidious": "palpatine",
      "kylo ren": "ben solo",
      "anakin skywalker / darth vader": "anakin skywalker"
    };

    const alias = ALIASES[lower];
    if (alias !== undefined) {
      return resolveId(alias);
    }

    return { id: "", found: false };
  }

  // Build edges, skipping unresolvable names
  const resolvedEdges: TLineageEdge[] = [];
  let skipped = 0;

  for (const raw of RAW_EDGES) {
    const src = resolveId(raw.sourceName);
    const tgt = resolveId(raw.targetName);

    if (!src.found) {
      console.warn(`[lineage] skip edge — unresolved source: "${raw.sourceName}"`);
      skipped++;
      continue;
    }
    if (!tgt.found) {
      console.warn(`[lineage] skip edge — unresolved target: "${raw.targetName}"`);
      skipped++;
      continue;
    }

    resolvedEdges.push({ source: src.id, target: tgt.id, kind: raw.kind });
  }

  console.log(`[lineage] resolved ${resolvedEdges.length} edges (${skipped} skipped)`);

  // Collect all node IDs that participate in at least one edge
  const participantIds = new Set<string>();
  for (const edge of resolvedEdges) {
    participantIds.add(edge.source);
    participantIds.add(edge.target);
  }

  // Validate edges have consistent source/target IDs (source→target must both be in participant set)
  const validatedEdges: TLineageEdge[] = [];
  for (const edge of resolvedEdges) {
    if (!participantIds.has(edge.source) || !participantIds.has(edge.target)) {
      console.warn(`[lineage] drop edge (orphan): ${edge.source} → ${edge.target}`);
      continue;
    }
    const parsed = LineageEdge.safeParse(edge);
    if (!parsed.success) {
      console.warn(`[lineage] drop edge (schema): ${JSON.stringify(edge)}`, parsed.error.issues);
      continue;
    }
    validatedEdges.push(parsed.data);
  }

  // Build node list from participants
  const nodes: TLineageNode[] = [];

  for (const id of participantIds) {
    // Try SWAPI kb persons first
    const fromKb = existingPersons.find(e => e.id === id);
    if (fromKb !== undefined) {
      const primaryFaction = fromKb.affiliations[0]?.faction;
      nodes.push({
        id: fromKb.id,
        name: fromKb.name,
        faction: primaryFaction,
        canonicity: fromKb.canonicity as "canon" | "legends" | "both",
        type: "person"
      });
      continue;
    }

    // Try extra persons
    const fromExtra = Array.from(extraPersonMap.values()).find(ep => ep.id === id);
    if (fromExtra !== undefined) {
      nodes.push(fromExtra);
      continue;
    }

    console.warn(`[lineage] WARNING: participant ID "${id}" not found in kb or extra persons — graph integrity issue`);
  }

  // Validate all nodes
  const validatedNodes: TLineageNode[] = [];
  for (const node of nodes) {
    const parsed = LineageNode.safeParse(node);
    if (!parsed.success) {
      console.warn(`[lineage] drop node (schema): ${node.id}`, parsed.error.issues);
      continue;
    }
    validatedNodes.push(parsed.data);
  }

  // Sort nodes and edges for deterministic output
  validatedNodes.sort((a, b) => a.id.localeCompare(b.id));
  validatedEdges.sort((a, b) => `${a.source}:${a.kind}:${a.target}`.localeCompare(`${b.source}:${b.kind}:${b.target}`));

  // Build and validate final graph
  const graph = {
    builtAt: new Date().toISOString(),
    nodes: validatedNodes,
    edges: validatedEdges
  };

  const graphParsed = LineageGraph.safeParse(graph);
  if (!graphParsed.success) {
    console.error("[lineage] FATAL: output schema validation failed:", graphParsed.error.issues);
    process.exit(1);
  }

  // Stats
  const byKind: Record<string, number> = {};
  for (const edge of validatedEdges) {
    byKind[edge.kind] = (byKind[edge.kind] ?? 0) + 1;
  }

  const canonNodes = validatedNodes.filter(n => n.canonicity === "canon" || n.canonicity === "both").length;
  const legendsNodes = validatedNodes.filter(n => n.canonicity === "legends").length;

  console.log(`[lineage] nodes: ${validatedNodes.length} (canon: ${canonNodes}, legends: ${legendsNodes})`);
  console.log("[lineage] edges by kind:", byKind);

  // Write output
  if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

  const outPath = resolve(OUT, "lineage.json");
  const serialized = JSON.stringify(graphParsed.data, null, 2);
  writeFileSync(outPath, serialized, "utf8");

  const sizeKb = (Buffer.byteLength(serialized, "utf8") / 1024).toFixed(1);
  console.log(`[lineage] wrote ${outPath} (${sizeKb} KB)`);
}

main();
