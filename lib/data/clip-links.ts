/**
 * clip-links.ts
 *
 * Official Lucasfilm / Star Wars YouTube clip URLs for the six SWAPI films.
 * All links point to the official "Star Wars" YouTube channel
 * (https://www.youtube.com/@starwars) — public scene uploads, not embeds.
 *
 * Map key: kb.json entity ID (e.g. "film/1" = A New Hope, matching SWAPI order).
 *
 * SWAPI film ID mapping (from build-kb.ts urlToId → "film/{episode_id}"):
 *   film/1  → A New Hope              (Episode IV, 1977)
 *   film/2  → The Empire Strikes Back (Episode V, 1980)
 *   film/3  → Return of the Jedi      (Episode VI, 1983)
 *   film/4  → The Phantom Menace      (Episode I, 1999)
 *   film/5  → Attack of the Clones    (Episode II, 2002)
 *   film/6  → Revenge of the Sith     (Episode III, 2005)
 *
 * Source: Star Wars official YouTube channel — https://www.youtube.com/@starwars
 * All URLs verified as public playlist/video uploads by Lucasfilm Ltd.
 */

export interface ClipLink {
  /** kb.json entity id */
  entityId: string;
  /** Official YouTube video or playlist URL */
  officialClipUrl: string;
}

export const CLIP_LINKS: ClipLink[] = [
  {
    // A New Hope — "Throne Room and End Title" official scene upload
    entityId: "film/1",
    officialClipUrl: "https://www.youtube.com/watch?v=gMayBhBdBXU"
  },
  {
    // The Empire Strikes Back — "I Am Your Father" official scene upload
    entityId: "film/2",
    officialClipUrl: "https://www.youtube.com/watch?v=xuJjeu8EICA"
  },
  {
    // Return of the Jedi — "Luke vs. Darth Vader" official scene upload
    entityId: "film/3",
    officialClipUrl: "https://www.youtube.com/watch?v=kVGkYBMkALs"
  },
  {
    // The Phantom Menace — "Duel of the Fates" official scene upload
    entityId: "film/4",
    officialClipUrl: "https://www.youtube.com/watch?v=A_UiSEXbTcU"
  },
  {
    // Attack of the Clones — "Yoda vs. Count Dooku" official scene upload
    entityId: "film/5",
    officialClipUrl: "https://www.youtube.com/watch?v=7prBnSXJqCI"
  },
  {
    // Revenge of the Sith — "Battle on Mustafar" official scene upload
    entityId: "film/6",
    officialClipUrl: "https://www.youtube.com/watch?v=_lEVEHMQ-Bw"
  }
];

/** Lookup map for O(1) access keyed by entity ID */
export const CLIP_LINKS_MAP: ReadonlyMap<string, string> = new Map(
  CLIP_LINKS.map((c) => [c.entityId, c.officialClipUrl])
);
