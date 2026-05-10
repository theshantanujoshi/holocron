/**
 * Story Mode — guided cinematic tours.
 *
 * Each story is an ordered list of beats. Each beat optionally selects an
 * entity, sets the era scrubber to a specific year, displays a quote, and
 * holds for `durationMs`. The era transitions auto-fire any registered
 * Event Cinematics when crossing canonical event years (Order 66, Battle of
 * Yavin, etc.) — that's the hybrid composition.
 *
 * Stories run via the StoryPlayer. Skip with Esc; pause with space.
 */

export type StoryBeat = {
  /** Optional entity id to select for this beat. */
  entityId?: string;
  /** Optional entity type — passed to selection store. */
  entityType?: "person" | "planet" | "ship" | "vehicle" | "species" | "film" | "show" | "event" | "faction" | "sector" | "region";
  /** Optional era scrubber target. Animates from previous beat's era. */
  era?: number;
  /** How long to hold this beat before advancing. */
  durationMs: number;
  /** Optional quote shown during this beat. */
  quote?: { text: string; speaker: string };
  /** Optional sub-caption (mono, smaller) shown alongside the quote. */
  caption?: string;
};

export type Story = {
  id: string;
  title: string;
  /** One-line elevator pitch shown before the story plays. */
  blurb: string;
  /** Total estimated runtime in seconds. */
  estimatedSec: number;
  /** Pre-roll title card duration. */
  introMs: number;
  beats: StoryBeat[];
  /** Outro card duration. */
  outroMs: number;
};

/**
 * Rise of Vader — Skywalker's journey from slave boy to Sith Lord to redeemed
 * father. Designed as the project's signature demo. Crosses 19 BBY (auto-firing
 * Order 66 + Duel on Mustafar interrupts) and 0 BBY (Battle of Yavin) and
 * 4 ABY (Battle of Endor).
 *
 * Entity ids resolved against SWAPI:
 *   person/11 = Anakin Skywalker
 *   person/4  = Darth Vader (canonically the same person, separate SWAPI entry)
 *   person/35 = Padmé Amidala
 *   person/10 = Obi-Wan Kenobi
 *   person/1  = Luke Skywalker
 *   planet/1  = Tatooine
 *   planet/9  = Coruscant
 *   planet/11 = Geonosis
 *   planet/13 = Mustafar
 *   planet/3  = Yavin IV
 *   planet/7  = Endor
 *
 * Quotes are short snippets used for commentary — fair use. Sources are the
 * canonical films.
 */
export const RISE_OF_VADER: Story = {
  id: "rise-of-vader",
  title: "Rise of Vader",
  blurb: "From slave boy on Tatooine to redeemed father on Endor's moon.",
  estimatedSec: 86,
  introMs: 2200,
  beats: [
    {
      entityId: "person/11",
      entityType: "person",
      era: -32,
      durationMs: 8000,
      quote: { text: "Are you an angel?", speaker: "Anakin Skywalker" },
      caption: "32 BBY · Tatooine"
    },
    {
      entityId: "planet/9",
      entityType: "planet",
      era: -28,
      durationMs: 6000,
      caption: "28 BBY · Coruscant · Jedi Temple"
    },
    {
      entityId: "person/35",
      entityType: "person",
      era: -22,
      durationMs: 7000,
      quote: {
        text: "I truly, deeply love you, and before we die I want you to know.",
        speaker: "Padmé Amidala"
      },
      caption: "22 BBY · Geonosis"
    },
    {
      entityId: "planet/11",
      entityType: "planet",
      era: -22,
      durationMs: 5000,
      caption: "Battle of Geonosis · Clone Wars begin"
    },
    {
      entityId: "person/11",
      entityType: "person",
      era: -19.5,
      durationMs: 7000,
      quote: {
        text: "If you are not with me, then you are my enemy.",
        speaker: "Anakin Skywalker"
      },
      caption: "19 BBY · the turning"
    },
    /* The era crosses -19 here, auto-firing Order 66 + Duel on Mustafar. */
    {
      entityId: "planet/13",
      entityType: "planet",
      era: -18.99,
      durationMs: 8500,
      caption: "Mustafar · the duel"
    },
    {
      entityId: "person/4",
      entityType: "person",
      era: -19,
      durationMs: 7500,
      quote: {
        text: "I have brought peace, freedom, justice, and security to my new Empire.",
        speaker: "Anakin Skywalker"
      },
      caption: "Anakin is no more. Vader rises."
    },
    {
      entityId: "planet/3",
      entityType: "planet",
      era: 0,
      durationMs: 7000,
      quote: {
        text: "Stay on target.",
        speaker: "Gold Five"
      },
      caption: "0 BBY · Battle of Yavin"
    },
    /* Era crosses 0 here, auto-firing Battle of Yavin interrupt. */
    {
      entityId: "person/4",
      entityType: "person",
      era: 3,
      durationMs: 6500,
      quote: {
        text: "No. I am your father.",
        speaker: "Darth Vader"
      },
      caption: "3 ABY · Cloud City"
    },
    {
      entityId: "planet/7",
      entityType: "planet",
      era: 4,
      durationMs: 8000,
      quote: {
        text: "Tell your sister you were right.",
        speaker: "Anakin Skywalker"
      },
      caption: "4 ABY · Endor · the redemption"
    }
    /* Era crosses 4 here, auto-firing Battle of Endor interrupt. */
  ],
  outroMs: 2400
};

/**
 * Order of the Sith — one thousand years of the Rule of Two, from Darth Bane
 * on Ruusan to Ben Solo's redemption on Exegol. Designed to cross -19 BBY
 * (auto-firing Order 66 + Duel on Mustafar) and 0 BBY (Battle of Yavin) en
 * route to 35 ABY (Battle of Exegol).
 *
 * Entity ids resolved against kb.json:
 *   person/21  = Palpatine (Darth Sidious)
 *   person/44  = Darth Maul
 *   person/67  = Count Dooku (Darth Tyranus)
 *   person/11  = Anakin Skywalker
 *   person/4   = Darth Vader
 *   person/1   = Luke Skywalker
 *   planet/9   = Coruscant
 *   planet/11  = Geonosis
 *   planet/13  = Mustafar
 *   planet/3   = Yavin IV
 *
 * Darth Bane, Darth Plagueis, Snoke, Ben Solo — not in kb.json; beats for
 * these characters use caption-only (no entityId). Sources: ROTS, TCW, TLJ,
 * TROS; Darth Plagueis novel (Luceno, 2012).
 */
export const ORDER_OF_SITH: Story = {
  id: "order-of-the-sith",
  title: "Order of the Sith",
  blurb: "Bane to Vader. A thousand years of two.",
  estimatedSec: 95,
  introMs: 2200,
  beats: [
    {
      /* Darth Bane not in kb.json — caption only */
      era: -1000,
      durationMs: 7000,
      caption: "1000 BBY · Ruusan · Darth Bane survives the Brotherhood's annihilation and codifies the Rule of Two",
    },
    {
      /* Darth Plagueis not in kb.json — caption only */
      era: -52,
      durationMs: 7000,
      quote: {
        text: "Darth Plagueis was a Dark Lord of the Sith so powerful and so wise, he could use the Force to influence the midi-chlorians to create life.",
        speaker: "Palpatine",
      },
      caption: "52 BBY · Plagueis trains Palpatine in secret",
    },
    {
      entityId: "person/44",
      entityType: "person",
      era: -32,
      durationMs: 6500,
      quote: { text: "At last we will reveal ourselves to the Jedi.", speaker: "Darth Maul" },
      caption: "32 BBY · Naboo · the apprentice revealed",
    },
    {
      entityId: "person/21",
      entityType: "person",
      era: -22,
      durationMs: 6500,
      quote: { text: "Begun, the Clone War has.", speaker: "Yoda" },
      caption: "22 BBY · Coruscant · the war is the plan",
    },
    {
      entityId: "planet/11",
      entityType: "planet",
      era: -22,
      durationMs: 5500,
      caption: "Battle of Geonosis · the Republic takes the bait",
    },
    {
      entityId: "person/67",
      entityType: "person",
      era: -22,
      durationMs: 6000,
      quote: { text: "This is just the beginning!", speaker: "Count Dooku" },
      caption: "Darth Tyranus — the public face of Sith power",
    },
    {
      entityId: "person/11",
      entityType: "person",
      era: -19.5,
      durationMs: 7000,
      quote: {
        text: "I will do whatever you ask. Just help me save Padmé's life.",
        speaker: "Anakin Skywalker",
      },
      caption: "19 BBY · Coruscant · the seduction is complete",
    },
    /* Era crosses -19 here — Order 66 + Duel on Mustafar interrupts auto-fire. */
    {
      entityId: "planet/13",
      entityType: "planet",
      era: -18.99,
      durationMs: 7000,
      caption: "Mustafar · Tyranus dead · Vader born · the line of two holds",
    },
    {
      entityId: "person/4",
      entityType: "person",
      era: -10,
      durationMs: 6000,
      quote: {
        text: "The ability to destroy a planet is insignificant next to the power of the Force.",
        speaker: "Darth Vader",
      },
      caption: "Vader lords over the Empire while Sidious pulls the strings",
    },
    /* Era crosses 0 here — Battle of Yavin interrupt auto-fires. */
    {
      entityId: "planet/3",
      entityType: "planet",
      era: 0,
      durationMs: 6000,
      caption: "0 BBY · Battle of Yavin · a Skywalker strikes back",
    },
    {
      /* Snoke not in kb.json — caption only */
      era: 28,
      durationMs: 6000,
      quote: {
        text: "Snoke was merely a tool of Palpatine's contingency.",
        speaker: "Narrator",
      },
      caption: "28 ABY · First Order rises · Snoke serves as proxy master",
    },
    {
      /* Ben Solo not in kb.json — caption only */
      era: 35,
      durationMs: 7000,
      quote: {
        text: "Ben.",
        speaker: "Han Solo",
      },
      caption: "35 ABY · Exegol · Ben Solo turns from the dark · the Rule of Two ends",
    },
  ],
  outroMs: 2400,
};

/**
 * The Skywalker Family — five generations of one bloodline from Shmi's birth
 * on Tatooine to Rey claiming the name on Exegol. Crosses -19 BBY (Order 66
 * + Duel on Mustafar auto-fires), 4 ABY (Battle of Endor auto-fires), and
 * 34 ABY (Hosnian Cataclysm auto-fires).
 *
 * Entity ids resolved against kb.json:
 *   person/43  = Shmi Skywalker
 *   person/11  = Anakin Skywalker
 *   person/35  = Padmé Amidala
 *   person/4   = Darth Vader
 *   person/1   = Luke Skywalker
 *   person/5   = Leia Organa
 *   person/14  = Han Solo
 *   planet/1   = Tatooine
 *   planet/8   = Naboo
 *   planet/9   = Coruscant
 *   planet/13  = Mustafar
 *   planet/7   = Endor
 *   planet/15  = Polis Massa  (Luke + Leia born)
 *
 * Ben Solo, Rey Skywalker — not in kb.json; beats use caption only.
 * Sources: TPM, AotC, RotS, ESB, RotJ, TFA, TLJ, TROS.
 */
export const SKYWALKER_FAMILY: Story = {
  id: "skywalker-family",
  title: "The Skywalker Family",
  blurb: "Five generations. One bloodline.",
  estimatedSec: 88,
  introMs: 2200,
  beats: [
    {
      entityId: "person/43",
      entityType: "person",
      era: -72,
      durationMs: 7000,
      quote: {
        text: "There was no father. I carried him, I gave birth, I raised him.",
        speaker: "Shmi Skywalker",
      },
      caption: "72 BBY · Tatooine · Shmi Skywalker — a mother and nothing more",
    },
    {
      entityId: "person/11",
      entityType: "person",
      era: -41,
      durationMs: 7000,
      quote: { text: "I'm a person, and my name is Anakin.", speaker: "Anakin Skywalker" },
      caption: "41 BBY · Tatooine · a boy born of the Force",
    },
    {
      entityId: "person/35",
      entityType: "person",
      era: -22,
      durationMs: 6000,
      quote: {
        text: "I truly, deeply love you.",
        speaker: "Padmé Amidala",
      },
      caption: "22 BBY · Geonosis · Anakin and Padmé wed in secret",
    },
    {
      entityId: "planet/9",
      entityType: "planet",
      era: -19.5,
      durationMs: 6500,
      caption: "19 BBY · Coruscant · Anakin falls · Padmé carries twins",
    },
    /* Era crosses -19 here — Order 66 + Duel on Mustafar interrupts auto-fire. */
    {
      entityId: "planet/15",
      entityType: "planet",
      era: -18.99,
      durationMs: 7500,
      quote: {
        text: "She's alive. I'll name her… Leia.",
        speaker: "Obi-Wan Kenobi",
      },
      caption: "Polis Massa · Luke and Leia born · Padmé dies",
    },
    {
      entityId: "planet/1",
      entityType: "planet",
      era: -18,
      durationMs: 5500,
      caption: "Luke raised by Owen Lars on Tatooine · Leia raised by Bail Organa on Alderaan",
    },
    {
      entityId: "person/1",
      entityType: "person",
      era: 3,
      durationMs: 6500,
      quote: { text: "No. I am your father.", speaker: "Darth Vader" },
      caption: "3 ABY · Cloud City · the family secret revealed",
    },
    /* Era crosses 4 here — Battle of Endor interrupt auto-fires. */
    {
      entityId: "planet/7",
      entityType: "planet",
      era: 4,
      durationMs: 7000,
      quote: {
        text: "Tell your sister you were right.",
        speaker: "Anakin Skywalker",
      },
      caption: "4 ABY · Endor · father and son reconciled",
    },
    {
      /* Ben Solo not in kb.json — caption only */
      era: 5,
      durationMs: 6000,
      quote: { text: "Han and I know who you are.", speaker: "Leia Organa" },
      caption: "5 ABY · Ben Solo born · the bloodline continues",
    },
    {
      entityId: "person/5",
      entityType: "person",
      era: 34,
      durationMs: 5500,
      caption: "34 ABY · Leia trains Rey · carries the last light of the Skywalker line",
    },
    /* Era crosses 34 here — Hosnian Cataclysm interrupt auto-fires. */
    {
      /* Rey Skywalker not in kb.json — caption only */
      era: 35,
      durationMs: 7000,
      quote: {
        text: "Rey… Skywalker.",
        speaker: "Rey",
      },
      caption: "35 ABY · Exegol · Rey takes the name · the Skywalker saga ends",
    },
  ],
  outroMs: 2400,
};

/**
 * The Clone Wars — three years of galactic war compressed into 10 beats.
 * From the First Battle of Geonosis (-22 BBY) through key campaigns to Order
 * 66 and the Duel on Mustafar (-19 BBY). Era-locked: starts at -22, ends at
 * -18.99. Crosses -19 BBY → Order 66 + Duel on Mustafar interrupts auto-fire.
 *
 * Entity ids resolved against kb.json:
 *   person/11  = Anakin Skywalker
 *   person/10  = Obi-Wan Kenobi
 *   person/51  = Mace Windu
 *   person/20  = Yoda
 *   person/67  = Count Dooku
 *   person/79  = General Grievous
 *   planet/11  = Geonosis
 *   planet/37  = Ryloth
 *   planet/14  = Kashyyyk
 *   planet/12  = Utapau
 *   planet/9   = Coruscant
 *   planet/13  = Mustafar
 *   planet/60  = Umbara
 *
 * Sources: AotC, RotS, The Clone Wars (animated series, 2008–2020).
 * Ahsoka Tano, Rex — not in kb.json; beats use caption only.
 */
export const CLONE_WARS: Story = {
  id: "clone-wars",
  title: "The Clone Wars",
  blurb: "Three years of a galaxy at war.",
  estimatedSec: 84,
  introMs: 2200,
  beats: [
    {
      entityId: "planet/11",
      entityType: "planet",
      era: -22,
      durationMs: 7000,
      quote: {
        text: "Begun, the Clone War has.",
        speaker: "Yoda",
      },
      caption: "22 BBY · First Battle of Geonosis · the war ignites",
    },
    {
      entityId: "person/51",
      entityType: "person",
      era: -22,
      durationMs: 6000,
      quote: {
        text: "This party's over.",
        speaker: "Mace Windu",
      },
      caption: "Mace Windu leads the Jedi rescue · ten thousand clones deploy",
    },
    {
      entityId: "planet/37",
      entityType: "planet",
      era: -21,
      durationMs: 6500,
      caption: "21 BBY · Battle of Ryloth · Jedi lead clone battalions across the Outer Rim",
    },
    {
      entityId: "planet/60",
      entityType: "planet",
      era: -20,
      durationMs: 6000,
      caption: "20 BBY · Battle of Umbara · clones fight in the dark — loyalty tested",
    },
    {
      entityId: "person/67",
      entityType: "person",
      era: -20,
      durationMs: 6000,
      quote: {
        text: "I have become more powerful than any Jedi.",
        speaker: "Count Dooku",
      },
      caption: "Dooku commands the Separatist Droid Army — war without end",
    },
    {
      entityId: "planet/14",
      entityType: "planet",
      era: -19,
      durationMs: 6500,
      quote: { text: "We're a good team.", speaker: "Yoda" },
      caption: "19 BBY · Battle of Kashyyyk · Yoda fights alongside the Wookiees",
    },
    {
      entityId: "person/79",
      entityType: "person",
      era: -19,
      durationMs: 6000,
      caption: "Utapau · Obi-Wan defeats General Grievous · the Separatist command fractures",
    },
    {
      entityId: "person/10",
      entityType: "person",
      era: -19,
      durationMs: 5500,
      caption: "Battle of Coruscant · Anakin and Obi-Wan rescue the Chancellor",
    },
    /* Era crosses -19 here — Order 66 + Duel on Mustafar interrupts auto-fire. */
    {
      entityId: "planet/9",
      entityType: "planet",
      era: -18.99,
      durationMs: 7500,
      quote: {
        text: "Execute Order 66.",
        speaker: "Darth Sidious",
      },
      caption: "Order 66 · the clones turn · the Jedi fall across every battlefield",
    },
    {
      entityId: "planet/13",
      entityType: "planet",
      era: -18.98,
      durationMs: 7500,
      quote: { text: "You were the Chosen One!", speaker: "Obi-Wan Kenobi" },
      caption: "Mustafar · Obi-Wan vs Anakin · the Clone Wars end in fire",
    },
  ],
  outroMs: 2400,
};

export const STORIES: Story[] = [RISE_OF_VADER, ORDER_OF_SITH, SKYWALKER_FAMILY, CLONE_WARS];

export function findStory(id: string): Story | null {
  return STORIES.find((s) => s.id === id) ?? null;
}
