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

export const STORIES: Story[] = [RISE_OF_VADER];

export function findStory(id: string): Story | null {
  return STORIES.find((s) => s.id === id) ?? null;
}
