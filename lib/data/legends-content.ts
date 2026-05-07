/**
 * legends-content.ts
 *
 * Hand-curated dataset of Star Wars Legends-era and non-SWAPI canon content:
 *   - Non-Disney / pre-Disney films and animated series
 *   - Dark Horse and Marvel comics (Old Republic through Sequel era)
 *   - Video games (Legends and canon)
 *
 * All entries verified against Wookieepedia (https://starwars.fandom.com/wiki/).
 * Wookieepedia source URLs are included in the `sources` field of each entry.
 *
 * Consumed by: scripts/build-legends-content.ts
 */

// ---------------------------------------------------------------------------
// Minimal raw-entry type (mapped to Entity in the build script)
// ---------------------------------------------------------------------------

export interface RawFilmEntry {
  kind: "film";
  id: string;
  name: string;
  aliases: string[];
  canonicity: "canon" | "legends" | "both";
  releaseYear: number;
  director: string;
  short: string;
  long: string;
  sources: string[];
}

export interface RawComicEntry {
  kind: "comic";
  id: string;
  name: string;
  aliases: string[];
  canonicity: "canon" | "legends" | "both";
  publisher: string;
  firstIssueYear: number;
  lastIssueYear: number | null;
  era: string;
  short: string;
  long: string;
  sources: string[];
}

export interface RawGameEntry {
  kind: "game";
  id: string;
  name: string;
  aliases: string[];
  canonicity: "canon" | "legends" | "both";
  releaseYear: number;
  developer: string;
  platforms: string;
  short: string;
  long: string;
  sources: string[];
}

export type RawEntry = RawFilmEntry | RawComicEntry | RawGameEntry;

// ---------------------------------------------------------------------------
// A. Non-Disney films and animated series (pre-Disney / Legends-tagged)
// ---------------------------------------------------------------------------

export const RAW_FILMS: RawFilmEntry[] = [
  {
    kind: "film",
    id: "film/legends/holiday-special-1978",
    name: "The Star Wars Holiday Special",
    aliases: ["Holiday Special"],
    canonicity: "legends",
    releaseYear: 1978,
    director: "Steve Binder",
    short: "Directed by Steve Binder · CBS television special · 1978",
    long:
      "A 1978 CBS television special set in the Star Wars universe, following Chewbacca and Han Solo as they attempt to reach Kashyyyk for Life Day. The special is notorious for its surreal variety-show format and has never received an official home-media release. It introduced Boba Fett in an animated segment and Chewbacca's family — Malla, Itchy, and Lumpy.",
    sources: ["https://starwars.fandom.com/wiki/The_Star_Wars_Holiday_Special"]
  },
  {
    kind: "film",
    id: "film/legends/caravan-of-courage-1984",
    name: "Caravan of Courage: An Ewok Adventure",
    aliases: ["The Ewok Adventure", "Caravan of Courage"],
    canonicity: "legends",
    releaseYear: 1984,
    director: "John Korty",
    short: "Directed by John Korty · ABC television film · 1984",
    long:
      "A 1984 made-for-television film set on the forest moon of Endor, following human siblings Mace and Cindel Towani who crash-land and are aided by the Ewoks on a quest to rescue their parents from the giant Gorax. Produced by Lucasfilm and written by Bob Carrau, it won an Emmy for Outstanding Special Visual Effects.",
    sources: ["https://starwars.fandom.com/wiki/Caravan_of_Courage:_An_Ewok_Adventure"]
  },
  {
    kind: "film",
    id: "film/legends/battle-for-endor-1985",
    name: "Ewoks: The Battle for Endor",
    aliases: ["Battle for Endor"],
    canonicity: "legends",
    releaseYear: 1985,
    director: "Ken Wheat",
    short: "Directed by Ken and Jim Wheat · ABC television film · 1985",
    long:
      "The 1985 sequel to Caravan of Courage, in which Cindel Towani and the Ewoks battle the marauder king Terak and the shapeshifting Charal who seek a power cell that can operate an alien starship. Darker in tone than its predecessor, it was co-directed by Ken and Jim Wheat.",
    sources: ["https://starwars.fandom.com/wiki/Ewoks:_The_Battle_for_Endor"]
  },
  {
    kind: "film",
    id: "show/legends/droids-1985",
    name: "Star Wars: Droids",
    aliases: ["Droids", "Droids: The Adventures of R2-D2 and C-3PO"],
    canonicity: "legends",
    releaseYear: 1985,
    director: "Ken Stephenson",
    short: "Animated by Nelvana · ABC · 1985–1986",
    long:
      "An animated television series produced by Nelvana and broadcast on ABC from 1985 to 1986. Set before the events of A New Hope, it follows the droids R2-D2 and C-3PO as they pass through a series of masters, encountering pirates, gangsters, and bounty hunters across the galaxy. The series introduced the speeder bike and several new alien species to Legends continuity.",
    sources: ["https://starwars.fandom.com/wiki/Star_Wars:_Droids"]
  },
  {
    kind: "film",
    id: "show/legends/ewoks-1985",
    name: "Star Wars: Ewoks",
    aliases: ["Ewoks"],
    canonicity: "legends",
    releaseYear: 1985,
    director: "Dale Schott",
    short: "Animated by Nelvana · ABC · 1985–1987",
    long:
      "An animated television series produced by Nelvana, airing on ABC from 1985 to 1987. Set on the forest moon of Endor before the events of Return of the Jedi, it follows young Wicket W. Warrick and his Ewok companions on adventures against the Duloks and other antagonists. The series ran for two seasons and is classified as Legends continuity.",
    sources: ["https://starwars.fandom.com/wiki/Star_Wars:_Ewoks"]
  },
  {
    kind: "film",
    id: "show/legends/clone-wars-2003",
    name: "Star Wars: Clone Wars",
    aliases: ["Clone Wars (Tartakovsky)", "Clone Wars 2003"],
    canonicity: "legends",
    releaseYear: 2003,
    director: "Genndy Tartakovsky",
    short: "Animated by Cartoon Network · Genndy Tartakovsky · 2003–2005",
    long:
      "A micro-series produced by Cartoon Network and directed by Genndy Tartakovsky, airing in 2003–2005. Spanning 25 chapters across two volumes, it depicts the Clone Wars between the Battle of Geonosis and the eve of Revenge of the Sith. The series introduced General Grievous and won three Emmy Awards, but was reclassified as Legends after the launch of The Clone Wars CGI series.",
    sources: ["https://starwars.fandom.com/wiki/Star_Wars:_Clone_Wars_(TV_series)"]
  },
  {
    kind: "film",
    id: "film/non-canon/robot-chicken-sw-2007",
    name: "Robot Chicken: Star Wars",
    aliases: ["Robot Chicken Star Wars Episode I"],
    canonicity: "legends",
    releaseYear: 2007,
    director: "Seth Green",
    short: "Produced by Seth Green · Adult Swim parody special · 2007",
    long:
      "A 2007 Adult Swim stop-motion parody special produced by Seth Green and Matthew Senreich, lampooning Star Wars across numerous sketches. It was followed by two sequels — Robot Chicken: Star Wars Episode II (2008) and Robot Chicken: Star Wars Episode III (2010). The specials are officially non-canonical comedy works produced with Lucasfilm's blessing.",
    sources: ["https://starwars.fandom.com/wiki/Robot_Chicken:_Star_Wars"]
  }
];

// ---------------------------------------------------------------------------
// B. Comics — grouped by era
// ---------------------------------------------------------------------------

export const RAW_COMICS: RawComicEntry[] = [
  // ---- Old Republic era ----
  {
    kind: "comic",
    id: "comic/legends/tales-of-the-jedi",
    name: "Tales of the Jedi",
    aliases: ["Tales of the Jedi (Dark Horse)"],
    canonicity: "legends",
    publisher: "Dark Horse Comics",
    firstIssueYear: 1993,
    lastIssueYear: 1998,
    era: "old-republic",
    short: "Dark Horse Comics · 1993–1998",
    long:
      "A comic book series published by Dark Horse Comics from 1993 to 1998, set thousands of years before the events of the Skywalker Saga. Written by Tom Veitch and Kevin J. Anderson, it explores the ancient Jedi and Sith Orders, including Ulic Qel-Droma, Nomi Sunrider, and the Sith lord Exar Kun. The series comprises six story arcs and is a cornerstone of Legends Old Republic lore.",
    sources: ["https://starwars.fandom.com/wiki/Star_Wars:_Tales_of_the_Jedi_(comic_series)"]
  },
  {
    kind: "comic",
    id: "comic/legends/kotor-comic",
    name: "Star Wars: Knights of the Old Republic",
    aliases: ["KOTOR (comic)", "Knights of the Old Republic (Dark Horse)"],
    canonicity: "legends",
    publisher: "Dark Horse Comics",
    firstIssueYear: 2006,
    lastIssueYear: 2010,
    era: "old-republic",
    short: "Dark Horse Comics · 2006–2010",
    long:
      "A 50-issue comic series written by John Jackson Miller and published by Dark Horse Comics from 2006 to 2010. Set approximately 3,964 BBY, it follows Zayne Carrick, a Jedi Padawan framed for the murder of his fellow students, as he goes on the run across the galaxy during the Mandalorian Wars. The series expands on lore from the KOTOR video game.",
    sources: ["https://starwars.fandom.com/wiki/Star_Wars:_Knights_of_the_Old_Republic_(comics)"]
  },
  {
    kind: "comic",
    id: "comic/legends/lost-tribe-of-the-sith",
    name: "Lost Tribe of the Sith",
    aliases: ["Lost Tribe of the Sith: Spiral"],
    canonicity: "legends",
    publisher: "Dark Horse Comics",
    firstIssueYear: 2012,
    lastIssueYear: 2012,
    era: "old-republic",
    short: "Dark Horse Comics · 2012",
    long:
      "A 5-issue comic miniseries published by Dark Horse Comics in 2012, adapted from the eBook series by John Jackson Miller. It depicts the ancient Sith tribe stranded on the remote planet Kesh following a starship crash around 5,000 BBY, and their violent struggle to rebuild a Sith civilization across millennia.",
    sources: ["https://starwars.fandom.com/wiki/Star_Wars:_Lost_Tribe_of_the_Sith%E2%80%94Spiral"]
  },
  {
    kind: "comic",
    id: "comic/legends/dawn-of-the-jedi",
    name: "Star Wars: Dawn of the Jedi",
    aliases: ["Dawn of the Jedi"],
    canonicity: "legends",
    publisher: "Dark Horse Comics",
    firstIssueYear: 2012,
    lastIssueYear: 2014,
    era: "old-republic",
    short: "Dark Horse Comics · 2012–2014",
    long:
      "A comic series written by John Ostrander and Jan Duursema, published by Dark Horse Comics from 2012 to 2014. Set approximately 25,793 BBY — long before the Galactic Republic — it explores the origins of the Je'daii Order on the planet Tython and their philosophy of balance between light and dark, preceding the formal Jedi-Sith dichotomy.",
    sources: ["https://starwars.fandom.com/wiki/Star_Wars:_Dawn_of_the_Jedi"]
  },

  // ---- Prequel era ----
  {
    kind: "comic",
    id: "comic/legends/republic",
    name: "Star Wars: Republic",
    aliases: ["Republic (Dark Horse)", "Star Wars: Prelude to Rebellion"],
    canonicity: "legends",
    publisher: "Dark Horse Comics",
    firstIssueYear: 1998,
    lastIssueYear: 2006,
    era: "prequel",
    short: "Dark Horse Comics · 1998–2006",
    long:
      "An 83-issue ongoing comic series published by Dark Horse Comics, originally titled Star Wars, then retitled Republic with issue #46. Written primarily by John Ostrander, it spans the prequel era from before The Phantom Menace through the end of the Clone Wars, featuring Qui-Gon Jinn, Mace Windu, Quinlan Vos, and many original characters. It is one of the longest-running Star Wars Legends comic series.",
    sources: ["https://starwars.fandom.com/wiki/Star_Wars:_Republic"]
  },
  {
    kind: "comic",
    id: "comic/legends/jedi-mace-windu",
    name: "Jedi: Mace Windu",
    aliases: ["Star Wars: Jedi — Mace Windu"],
    canonicity: "legends",
    publisher: "Dark Horse Comics",
    firstIssueYear: 2003,
    lastIssueYear: 2003,
    era: "prequel",
    short: "Dark Horse Comics · 2003",
    long:
      "A one-shot comic published by Dark Horse Comics in 2003, set during the Clone Wars and focusing on Mace Windu. Written by John Ostrander with art by Jan Duursema, it depicts Mace on a mission to the planet Haruun Kal, expanding on themes from the prose novel Shatterpoint.",
    sources: ["https://starwars.fandom.com/wiki/Star_Wars:_Jedi%E2%80%94Mace_Windu"]
  },
  {
    kind: "comic",
    id: "comic/canon/obi-wan-and-anakin",
    name: "Obi-Wan & Anakin",
    aliases: ["Obi-Wan and Anakin"],
    canonicity: "canon",
    publisher: "Marvel Comics",
    firstIssueYear: 2016,
    lastIssueYear: 2016,
    era: "prequel",
    short: "Marvel Comics · 2016",
    long:
      "A 5-issue Marvel Comics miniseries set between The Phantom Menace and Attack of the Clones, written by Charles Soule with art by Marco Checchetto. It follows a young Anakin Skywalker and his master Obi-Wan Kenobi responding to a distress call from the planet Carnelion IV, a world torn apart by war between factions called the Closed and the Open.",
    sources: ["https://starwars.fandom.com/wiki/Obi-Wan_%26_Anakin"]
  },

  // ---- Original trilogy era ----
  {
    kind: "comic",
    id: "comic/legends/marvel-sw-1977",
    name: "Star Wars (Marvel, 1977)",
    aliases: ["Marvel Star Wars", "Star Wars (107-issue run)"],
    canonicity: "legends",
    publisher: "Marvel Comics",
    firstIssueYear: 1977,
    lastIssueYear: 1986,
    era: "original",
    short: "Marvel Comics · 1977–1986",
    long:
      "The original Marvel Comics Star Wars series, running 107 issues from 1977 to 1986. Adapted the original film and then told original stories set between and after the films, featuring Luke Skywalker, Princess Leia, Han Solo, and C-3PO. Notable for introducing Jaxxon, the green rabbit smuggler, and many other Legends-only characters. Written by Roy Thomas, Archie Goodwin, and others.",
    sources: ["https://starwars.fandom.com/wiki/Star_Wars_(Marvel_Comics_1977)"]
  },
  {
    kind: "comic",
    id: "comic/legends/empire-dark-horse",
    name: "Star Wars: Empire",
    aliases: ["Empire (Dark Horse)"],
    canonicity: "legends",
    publisher: "Dark Horse Comics",
    firstIssueYear: 2002,
    lastIssueYear: 2006,
    era: "original",
    short: "Dark Horse Comics · 2002–2006",
    long:
      "A 40-issue comic series published by Dark Horse Comics from 2002 to 2006, set during the Galactic Civil War in the era of the original trilogy. It tells stories from multiple perspectives — including Imperial stormtroopers, Rebel soldiers, and civilians — exploring the moral complexities of the conflict. Key storylines include 'In the Shadows of Their Fathers' and 'The Wrong Side of the War'.",
    sources: ["https://starwars.fandom.com/wiki/Star_Wars:_Empire"]
  },
  {
    kind: "comic",
    id: "comic/canon/marvel-sw-2015",
    name: "Star Wars (Marvel, 2015)",
    aliases: ["Marvel Star Wars 2015"],
    canonicity: "canon",
    publisher: "Marvel Comics",
    firstIssueYear: 2015,
    lastIssueYear: 2020,
    era: "original",
    short: "Marvel Comics · 2015–2020",
    long:
      "The flagship Marvel Comics Star Wars ongoing series relaunched in 2015 after Marvel regained the license. Written by Jason Aaron and later Kieron Gillen and Greg Pak, it is set immediately after A New Hope and follows Luke, Leia, Han, and the Rebel Alliance. It ran 75 issues in its first volume and introduced the planet Jedha's history and the Screaming Citadel crossover event to canon.",
    sources: ["https://starwars.fandom.com/wiki/Star_Wars_(Marvel_Comics_2015)"]
  },
  {
    kind: "comic",
    id: "comic/canon/darth-vader-2015",
    name: "Darth Vader (Marvel, 2015)",
    aliases: ["Darth Vader (2015)", "Vader (2015 series)"],
    canonicity: "canon",
    publisher: "Marvel Comics",
    firstIssueYear: 2015,
    lastIssueYear: 2016,
    era: "original",
    short: "Marvel Comics · 2015–2016",
    long:
      "A 25-issue Marvel Comics series written by Kieron Gillen with art by Salvador Larroca. Set after A New Hope, it follows Darth Vader as he works to reclaim his standing with Emperor Palpatine after the destruction of the Death Star, and his discovery that the rebel pilot who destroyed it is his own son. It introduced the archaeologist Doctor Aphra and her droids BT-1 and 0-0-0 to canon.",
    sources: ["https://starwars.fandom.com/wiki/Darth_Vader_(Marvel_Comics_2015)"]
  },
  {
    kind: "comic",
    id: "comic/canon/darth-vader-2017",
    name: "Darth Vader (Marvel, 2017)",
    aliases: ["Darth Vader (2017)", "Dark Lord of the Sith"],
    canonicity: "canon",
    publisher: "Marvel Comics",
    firstIssueYear: 2017,
    lastIssueYear: 2018,
    era: "original",
    short: "Marvel Comics · 2017–2018",
    long:
      "A 25-issue Marvel Comics series written by Charles Soule with art by Giuseppe Camuncoli, subtitled 'Dark Lord of the Sith'. Set immediately after Revenge of the Sith, it depicts Vader's earliest days in the suit — hunting down surviving Jedi, constructing his red lightsaber, and establishing his place in the new Galactic Empire. The series reveals canonical details about how Vader built his lightsaber and crushed the Inquisitorius.",
    sources: ["https://starwars.fandom.com/wiki/Darth_Vader_(Marvel_Comics_2017)"]
  },
  {
    kind: "comic",
    id: "comic/legends/rebellion",
    name: "Star Wars: Rebellion",
    aliases: ["Rebellion (Dark Horse)", "Star Wars: My Brother, My Enemy"],
    canonicity: "legends",
    publisher: "Dark Horse Comics",
    firstIssueYear: 2006,
    lastIssueYear: 2008,
    era: "original",
    short: "Dark Horse Comics · 2006–2008",
    long:
      "A 16-issue Legends comic series published by Dark Horse Comics from 2006 to 2008, set during the Galactic Civil War. Written by Rob Williams, it focuses on Luke Skywalker and Rebel Alliance operatives during missions in the aftermath of A New Hope. The series explores Luke's moral growth and his relationships with Alliance command.",
    sources: ["https://starwars.fandom.com/wiki/Star_Wars:_Rebellion_(comic_series)"]
  },
  {
    kind: "comic",
    id: "comic/canon/doctor-aphra",
    name: "Doctor Aphra",
    aliases: ["Star Wars: Doctor Aphra"],
    canonicity: "canon",
    publisher: "Marvel Comics",
    firstIssueYear: 2017,
    lastIssueYear: null,
    era: "original",
    short: "Marvel Comics · 2017–present",
    long:
      "An ongoing Marvel Comics series starring Doctor Chelli Lona Aphra, the rogue archaeologist introduced in the 2015 Darth Vader series. Written initially by Kieron Gillen and later Si Spurrier and Alyssa Wong, it follows Aphra's morally ambiguous adventures across the galaxy hunting artifacts and surviving dangerous deals with criminals, Imperials, and the dark side. One of the most acclaimed recent Star Wars comics.",
    sources: ["https://starwars.fandom.com/wiki/Doctor_Aphra_(comics)"]
  },
  {
    kind: "comic",
    id: "comic/canon/han-solo-2016",
    name: "Han Solo",
    aliases: ["Star Wars: Han Solo"],
    canonicity: "canon",
    publisher: "Marvel Comics",
    firstIssueYear: 2016,
    lastIssueYear: 2016,
    era: "original",
    short: "Marvel Comics · 2016",
    long:
      "A 5-issue Marvel Comics miniseries written by Marjorie Liu with art by Mark Brooks. Set between A New Hope and The Empire Strikes Back, it follows Han Solo entering the Dragon Void Run — a legendary, perilous race — while secretly helping extract Rebel spies from within the race's participating crews.",
    sources: ["https://starwars.fandom.com/wiki/Han_Solo_(Marvel_Comics)"]
  },
  {
    kind: "comic",
    id: "comic/canon/lando-2015",
    name: "Lando",
    aliases: ["Star Wars: Lando"],
    canonicity: "canon",
    publisher: "Marvel Comics",
    firstIssueYear: 2015,
    lastIssueYear: 2015,
    era: "original",
    short: "Marvel Comics · 2015",
    long:
      "A 5-issue Marvel Comics miniseries written by Charles Soule with art by Alex Maleev. Set before The Empire Strikes Back, it follows Lando Calrissian and his partner Lobot as they attempt to steal a mysterious ship — unaware it belongs to Emperor Palpatine himself. The series reveals that Palpatine collected Sith artifacts and explores Lobot's backstory.",
    sources: ["https://starwars.fandom.com/wiki/Lando_(Marvel_Comics)"]
  },
  {
    kind: "comic",
    id: "comic/canon/bounty-hunters",
    name: "Star Wars: Bounty Hunters",
    aliases: ["Bounty Hunters"],
    canonicity: "canon",
    publisher: "Marvel Comics",
    firstIssueYear: 2020,
    lastIssueYear: null,
    era: "original",
    short: "Marvel Comics · 2020–present",
    long:
      "An ongoing Marvel Comics series written by Ethan Sacks with art by Paolo Villanelli. Set in the original trilogy era, it follows the bounty hunter Valance and his complicated relationships with Boba Fett, Bossk, and other hunters. The series ties into the War of the Bounty Hunters and Crimson Reign crossover events and connects to the Darth Vader and Doctor Aphra series.",
    sources: ["https://starwars.fandom.com/wiki/Star_Wars:_Bounty_Hunters"]
  },

  // ---- New Republic / Sequel era ----
  {
    kind: "comic",
    id: "comic/legends/dark-empire-i",
    name: "Dark Empire",
    aliases: ["Dark Empire I", "Star Wars: Dark Empire"],
    canonicity: "legends",
    publisher: "Dark Horse Comics",
    firstIssueYear: 1991,
    lastIssueYear: 1992,
    era: "new-republic",
    short: "Dark Horse Comics · 1991–1992",
    long:
      "A 6-issue comic miniseries written by Tom Veitch with art by Cam Kennedy, published by Dark Horse Comics in 1991–1992. Set six years after Return of the Jedi, it depicts the return of a resurrected Emperor Palpatine in a clone body, Luke Skywalker's brief fall to the dark side, and the Empire's assault on Coruscant using massive World Devastators. It was the first major post-ROTJ Legends story.",
    sources: ["https://starwars.fandom.com/wiki/Dark_Empire"]
  },
  {
    kind: "comic",
    id: "comic/legends/dark-empire-ii",
    name: "Dark Empire II",
    aliases: ["Star Wars: Dark Empire II"],
    canonicity: "legends",
    publisher: "Dark Horse Comics",
    firstIssueYear: 1994,
    lastIssueYear: 1995,
    era: "new-republic",
    short: "Dark Horse Comics · 1994–1995",
    long:
      "A 6-issue sequel to Dark Empire, written by Tom Veitch with art by Cam Kennedy and published in 1994–1995. It continues the story of Palpatine's clones and introduces the threat of the Galaxy Gun superweapon, as Han, Leia, and Luke race to prevent another Imperial catastrophe. The series concludes the Dark Empire trilogy alongside Empire's End.",
    sources: ["https://starwars.fandom.com/wiki/Dark_Empire_II"]
  },
  {
    kind: "comic",
    id: "comic/legends/crimson-empire",
    name: "Crimson Empire",
    aliases: ["Star Wars: Crimson Empire"],
    canonicity: "legends",
    publisher: "Dark Horse Comics",
    firstIssueYear: 1997,
    lastIssueYear: 1998,
    era: "new-republic",
    short: "Dark Horse Comics · 1997–1998",
    long:
      "A 6-issue comic series written by Mike Richardson and Randy Stradley, published by Dark Horse in 1997–1998. It follows Kir Kanos, the last surviving member of Emperor Palpatine's Royal Guard, as he hunts down the traitors who allowed the Emperor to be killed and finds himself caught between the remnant Empire and the New Republic. The series spawned two sequels.",
    sources: ["https://starwars.fandom.com/wiki/Crimson_Empire"]
  },
  {
    kind: "comic",
    id: "comic/legends/legacy",
    name: "Star Wars: Legacy",
    aliases: ["Legacy (Dark Horse)"],
    canonicity: "legends",
    publisher: "Dark Horse Comics",
    firstIssueYear: 2006,
    lastIssueYear: 2010,
    era: "new-republic",
    short: "Dark Horse Comics · 2006–2010",
    long:
      "A 50-issue ongoing series written by John Ostrander with art by Jan Duursema, set approximately 137 ABY — over a century after Return of the Jedi. It follows Cade Skywalker, a descendant of Luke who has rejected his Jedi heritage and become a bounty hunter, as a new Sith Order called the One Sith rises under Darth Krayt. Widely considered one of the best Legends comics.",
    sources: ["https://starwars.fandom.com/wiki/Star_Wars:_Legacy_(comics)"]
  },
  {
    kind: "comic",
    id: "comic/canon/poe-dameron",
    name: "Poe Dameron",
    aliases: ["Star Wars: Poe Dameron"],
    canonicity: "canon",
    publisher: "Marvel Comics",
    firstIssueYear: 2016,
    lastIssueYear: 2018,
    era: "sequel",
    short: "Marvel Comics · 2016–2018",
    long:
      "A 31-issue Marvel Comics series written by Charles Soule with art by Phil Noto and Angel Unzueta. Set in the lead-up to The Force Awakens, it follows Poe Dameron and his Black Squadron as they work for General Leia Organa, tracking down Lor San Tekka and combating the First Order spy known as Agent Terex. The series bridges the gap between Return of the Jedi and the sequel trilogy.",
    sources: ["https://starwars.fandom.com/wiki/Poe_Dameron_(comics)"]
  },
  {
    kind: "comic",
    id: "comic/canon/allegiance-2019",
    name: "Star Wars: Allegiance",
    aliases: ["Allegiance"],
    canonicity: "canon",
    publisher: "Marvel Comics",
    firstIssueYear: 2019,
    lastIssueYear: 2019,
    era: "sequel",
    short: "Marvel Comics · 2019",
    long:
      "A 4-issue Marvel Comics miniseries written by Ethan Sacks with art by Luke Ross, set between The Last Jedi and The Rise of Skywalker. It follows Rey, Rose Tico, Finn, and Poe Dameron as they search for resources for the Resistance while Leia deals with the Mon Calamari and the consequences of Crait.",
    sources: ["https://starwars.fandom.com/wiki/Star_Wars:_Allegiance"]
  },

  // ---- High Republic era ----
  {
    kind: "comic",
    id: "comic/canon/high-republic-marvel",
    name: "Star Wars: The High Republic",
    aliases: ["The High Republic (Marvel)", "High Republic Phase I Comic"],
    canonicity: "canon",
    publisher: "Marvel Comics",
    firstIssueYear: 2021,
    lastIssueYear: null,
    era: "high-republic",
    short: "Marvel Comics · 2021–present",
    long:
      "An ongoing Marvel Comics series written by Cavan Scott as part of the broader High Republic publishing initiative. Set approximately 200 years before The Phantom Menace during the height of the Galactic Republic and Jedi Order, it follows Jedi Keeve Trennis and her colleagues as they confront the Drengir plant-based creatures and the marauder group known as the Nihil.",
    sources: ["https://starwars.fandom.com/wiki/Star_Wars:_The_High_Republic_(Marvel_Comics)"]
  },
  {
    kind: "comic",
    id: "comic/canon/high-republic-idw",
    name: "Star Wars: The High Republic Adventures",
    aliases: ["High Republic Adventures (IDW)", "High Republic Adventures"],
    canonicity: "canon",
    publisher: "IDW Publishing",
    firstIssueYear: 2021,
    lastIssueYear: null,
    era: "high-republic",
    short: "IDW Publishing · 2021–present",
    long:
      "A comic series published by IDW Publishing as part of the High Republic initiative, written by Daniel José Older. It is aimed at younger readers and follows Padawan Lula Talisola and her fellow Jedi-in-training during the same time period as the Phase I High Republic novels, covering the Nihil conflict and the Great Disaster from a different perspective.",
    sources: ["https://starwars.fandom.com/wiki/Star_Wars:_The_High_Republic_Adventures_(IDW_Publishing)"]
  }
];

// ---------------------------------------------------------------------------
// C. Video games
// ---------------------------------------------------------------------------

export const RAW_GAMES: RawGameEntry[] = [
  {
    kind: "game",
    id: "game/legends/kotor-2003",
    name: "Star Wars: Knights of the Old Republic",
    aliases: ["KOTOR", "KotOR (2003)"],
    canonicity: "legends",
    releaseYear: 2003,
    developer: "BioWare",
    platforms: "Xbox, PC, iOS, Android",
    short: "BioWare · Xbox, PC · 2003",
    long:
      "An RPG developed by BioWare and published by LucasArts in 2003, set approximately 4,000 years before the Galactic Empire. Players control a customizable character who may be male or female, navigating a galaxy caught in the Jedi Civil War between Darth Revan and Darth Malak. Features a renowned twist revealing the player character's true identity. Won numerous Game of the Year awards.",
    sources: ["https://starwars.fandom.com/wiki/Star_Wars:_Knights_of_the_Old_Republic_(video_game)"]
  },
  {
    kind: "game",
    id: "game/legends/kotor2-2004",
    name: "Star Wars: Knights of the Old Republic II – The Sith Lords",
    aliases: ["KOTOR II", "KotOR 2", "The Sith Lords"],
    canonicity: "legends",
    releaseYear: 2004,
    developer: "Obsidian Entertainment",
    platforms: "Xbox, PC",
    short: "Obsidian Entertainment · Xbox, PC · 2004",
    long:
      "An RPG developed by Obsidian Entertainment and published by LucasArts in 2004, set five years after the first KOTOR. Players control the Jedi Exile, Meetra Surik, hunted by the enigmatic Sith Lords Darth Nihilus, Darth Sion, and their master Darth Traya. The game is renowned for its philosophical exploration of the Force and nuanced companion characters. A fan-made Restored Content Mod restores cut material.",
    sources: ["https://starwars.fandom.com/wiki/Star_Wars:_Knights_of_the_Old_Republic_II_The_Sith_Lords"]
  },
  {
    kind: "game",
    id: "game/legends/galaxies-2003",
    name: "Star Wars Galaxies",
    aliases: ["SWG", "Star Wars Galaxies: An Empire Divided"],
    canonicity: "legends",
    releaseYear: 2003,
    developer: "Sony Online Entertainment",
    platforms: "PC (MMO)",
    short: "Sony Online Entertainment · PC MMO · 2003–2011",
    long:
      "A massively multiplayer online RPG developed by Sony Online Entertainment and published by LucasArts, running from 2003 to 2011. Set in the era of the original trilogy, it allowed players to inhabit the Star Wars galaxy as custom characters across diverse professions. Famous for its player-driven economy and the controversial New Game Enhancements of 2005 that replaced its profession system.",
    sources: ["https://starwars.fandom.com/wiki/Star_Wars_Galaxies"]
  },
  {
    kind: "game",
    id: "game/legends/republic-commando-2005",
    name: "Star Wars: Republic Commando",
    aliases: ["Republic Commando"],
    canonicity: "legends",
    releaseYear: 2005,
    developer: "LucasArts",
    platforms: "Xbox, PC, PS4, Nintendo Switch",
    short: "LucasArts · Xbox, PC · 2005",
    long:
      "A tactical first-person shooter developed and published by LucasArts in 2005. Players lead Delta Squad, an elite clone commando unit, through missions from the Battle of Geonosis to Kashyyyk. The game emphasizes squad tactics and realistic clone trooper perspective, drawing on Karen Traviss's Republic Commando novel series. Re-released on PS4 and Nintendo Switch in 2021.",
    sources: ["https://starwars.fandom.com/wiki/Star_Wars:_Republic_Commando_(video_game)"]
  },
  {
    kind: "game",
    id: "game/legends/force-unleashed-2008",
    name: "Star Wars: The Force Unleashed",
    aliases: ["The Force Unleashed", "TFU"],
    canonicity: "legends",
    releaseYear: 2008,
    developer: "LucasArts",
    platforms: "PS3, Xbox 360, Wii, PC, DS, PSP",
    short: "LucasArts · PS3, Xbox 360, Wii · 2008",
    long:
      "An action-adventure game developed and published by LucasArts in 2008. Players control Starkiller, Darth Vader's secret apprentice, sent to hunt down surviving Jedi across the galaxy. Set between Revenge of the Sith and A New Hope, the game invented a Legends backstory for the formation of the Rebel Alliance. Features 'Euphoria' physics and the ability to throw Force lightning at everything.",
    sources: ["https://starwars.fandom.com/wiki/Star_Wars:_The_Force_Unleashed_(video_game)"]
  },
  {
    kind: "game",
    id: "game/legends/force-unleashed-2-2010",
    name: "Star Wars: The Force Unleashed II",
    aliases: ["The Force Unleashed II", "TFU2"],
    canonicity: "legends",
    releaseYear: 2010,
    developer: "LucasArts",
    platforms: "PS3, Xbox 360, Wii, PC",
    short: "LucasArts · PS3, Xbox 360, Wii · 2010",
    long:
      "The sequel to The Force Unleashed, released by LucasArts in 2010. Starkiller appears to return — or a clone of him does — escaping from Darth Vader's cloning facility on Kamino and searching for Juno Eclipse while evading both Vader and the bounty hunter Boba Fett. Shorter than its predecessor, it features dual lightsaber combat and improved Force powers.",
    sources: ["https://starwars.fandom.com/wiki/Star_Wars:_The_Force_Unleashed_II"]
  },
  {
    kind: "game",
    id: "game/legends/the-old-republic-2011",
    name: "Star Wars: The Old Republic",
    aliases: ["SWTOR", "The Old Republic MMO"],
    canonicity: "legends",
    releaseYear: 2011,
    developer: "BioWare",
    platforms: "PC (MMO)",
    short: "BioWare · PC MMO · 2011–present",
    long:
      "A massively multiplayer online RPG developed by BioWare and published by Electronic Arts, launched in 2011. Set approximately 3,600 BBY during the Cold War between the Galactic Republic and the Sith Empire, it features eight class storylines including Sith Warrior, Jedi Knight, Bounty Hunter, and Imperial Agent. Though classified as Legends, its story content and expanded universe is among the most detailed of any Star Wars game.",
    sources: ["https://starwars.fandom.com/wiki/Star_Wars:_The_Old_Republic"]
  },
  {
    kind: "game",
    id: "game/legends/empire-at-war-2006",
    name: "Star Wars: Empire at War",
    aliases: ["Empire at War", "EaW"],
    canonicity: "legends",
    releaseYear: 2006,
    developer: "Petroglyph Games",
    platforms: "PC",
    short: "Petroglyph Games · PC · 2006",
    long:
      "A real-time strategy game developed by Petroglyph Games and published by LucasArts in 2006. Set between Revenge of the Sith and A New Hope, players control either the Galactic Empire or Rebel Alliance across space and ground battles. The Forces of Corruption expansion added the Zann Consortium as a third faction. Features a galactic conquest mode and detailed unit micro-management.",
    sources: ["https://starwars.fandom.com/wiki/Star_Wars:_Empire_at_War"]
  },
  {
    kind: "game",
    id: "game/legends/rogue-squadron-1998",
    name: "Star Wars: Rogue Squadron",
    aliases: ["Rogue Squadron (N64/PC)"],
    canonicity: "legends",
    releaseYear: 1998,
    developer: "Factor 5",
    platforms: "Nintendo 64, PC",
    short: "Factor 5 · Nintendo 64, PC · 1998",
    long:
      "An arcade-style combat flight game developed by Factor 5 and published by LucasArts for Nintendo 64 and PC in 1998. Players fly as Luke Skywalker leading Rogue Squadron through 16 missions set during the Galactic Civil War, including the Battle of Yavin and liberation of Kessel. The first entry in the Rogue Squadron trilogy, it was praised for its fast-paced flying action.",
    sources: ["https://starwars.fandom.com/wiki/Star_Wars:_Rogue_Squadron_(video_game)"]
  },
  {
    kind: "game",
    id: "game/legends/rogue-leader-2001",
    name: "Star Wars Rogue Squadron II: Rogue Leader",
    aliases: ["Rogue Leader", "Rogue Squadron II"],
    canonicity: "legends",
    releaseYear: 2001,
    developer: "Factor 5",
    platforms: "Nintendo GameCube",
    short: "Factor 5 · GameCube · 2001",
    long:
      "A launch title for the Nintendo GameCube, developed by Factor 5 and published by LucasArts in 2001. It retells the space battles of the original trilogy — including the Battle of Yavin and the Battle of Endor — with then-groundbreaking graphics. Considered one of the best GameCube games and a technical showcase for the hardware.",
    sources: ["https://starwars.fandom.com/wiki/Star_Wars_Rogue_Squadron_II:_Rogue_Leader"]
  },
  {
    kind: "game",
    id: "game/legends/rebel-strike-2003",
    name: "Star Wars Rogue Squadron III: Rebel Strike",
    aliases: ["Rebel Strike", "Rogue Squadron III"],
    canonicity: "legends",
    releaseYear: 2003,
    developer: "Factor 5",
    platforms: "Nintendo GameCube",
    short: "Factor 5 · GameCube · 2003",
    long:
      "The final entry in the Rogue Squadron trilogy, developed by Factor 5 and published by LucasArts for GameCube in 2003. Adds on-foot third-person missions for the first time in the series alongside the series' traditional space combat. Features a co-op mode allowing two players to replay Rogue Leader missions together.",
    sources: ["https://starwars.fandom.com/wiki/Star_Wars_Rogue_Squadron_III:_Rebel_Strike"]
  },
  {
    kind: "game",
    id: "game/legends/battlefront-2004",
    name: "Star Wars: Battlefront",
    aliases: ["Battlefront (2004)", "Battlefront Classic"],
    canonicity: "legends",
    releaseYear: 2004,
    developer: "Pandemic Studios",
    platforms: "PS2, Xbox, PC, Mac",
    short: "Pandemic Studios · PS2, Xbox, PC · 2004",
    long:
      "A third-person/first-person shooter developed by Pandemic Studios and published by LucasArts in 2004. Players fight as infantry soldiers across iconic battlefields from all six films, choosing between the Galactic Republic, CIS, Rebel Alliance, and Galactic Empire. Its large-scale battles and accessible multiplayer made it one of the best-selling Star Wars games of its era.",
    sources: ["https://starwars.fandom.com/wiki/Star_Wars:_Battlefront_(2004_video_game)"]
  },
  {
    kind: "game",
    id: "game/legends/battlefront-ii-2005",
    name: "Star Wars: Battlefront II",
    aliases: ["Battlefront II (2005)", "Classic Battlefront II"],
    canonicity: "legends",
    releaseYear: 2005,
    developer: "Pandemic Studios",
    platforms: "PS2, Xbox, PC, PSP",
    short: "Pandemic Studios · PS2, Xbox, PC · 2005",
    long:
      "The sequel to the 2004 Battlefront, developed by Pandemic Studios and published by LucasArts in 2005. Adds space combat, playable Jedi and Sith heroes, and a narrative campaign from the perspective of the 501st Legion covering events from the Clone Wars through the Galactic Civil War. Introduced Order 66 campaign missions and remains widely beloved; servers were restored in 2017.",
    sources: ["https://starwars.fandom.com/wiki/Star_Wars:_Battlefront_II_(2005_video_game)"]
  },
  {
    kind: "game",
    id: "game/canon/battlefront-2015",
    name: "Star Wars Battlefront",
    aliases: ["Battlefront (2015)", "DICE Battlefront"],
    canonicity: "canon",
    releaseYear: 2015,
    developer: "DICE",
    platforms: "PS4, Xbox One, PC",
    short: "DICE (EA) · PS4, Xbox One, PC · 2015",
    long:
      "A first-person/third-person shooter developed by DICE and published by EA in 2015. Set in the original trilogy era, it offers large-scale multiplayer battles on Hoth, Endor, Tatooine, and Sullust. Produced with extensive access to Lucasfilm archives, it is canon. Criticized for thin content at launch, it was expanded significantly through DLC.",
    sources: ["https://starwars.fandom.com/wiki/Star_Wars_Battlefront_(2015_video_game)"]
  },
  {
    kind: "game",
    id: "game/canon/battlefront-ii-2017",
    name: "Star Wars Battlefront II",
    aliases: ["Battlefront II (2017)", "DICE Battlefront II"],
    canonicity: "canon",
    releaseYear: 2017,
    developer: "DICE",
    platforms: "PS4, Xbox One, PC",
    short: "DICE (EA) · PS4, Xbox One, PC · 2017",
    long:
      "A first-person/third-person shooter developed by DICE and published by EA in 2017. Notable for its single-player campaign following Imperial Inferno Squad commander Iden Versio from the Battle of Endor through the New Republic era — canon content bridging Return of the Jedi and The Force Awakens. Initially controversial for loot boxes; revamped with significant free content updates through 2020.",
    sources: ["https://starwars.fandom.com/wiki/Star_Wars_Battlefront_II_(2017_video_game)"]
  },
  {
    kind: "game",
    id: "game/canon/squadrons-2020",
    name: "Star Wars: Squadrons",
    aliases: ["Squadrons"],
    canonicity: "canon",
    releaseYear: 2020,
    developer: "Motive Studios",
    platforms: "PS4, Xbox One, PC, PSVR",
    short: "Motive Studios (EA) · PS4, Xbox One, PC · 2020",
    long:
      "A combat flight simulator developed by Motive Studios and published by EA in 2020. Fully canon, it features both a single-player story following pilots from the Galactic Empire's Titan Squadron and the New Republic's Vanguard Squadron, set after Return of the Jedi, and a multiplayer mode including 5v5 dogfights and Fleet Battles. Supports VR on PS4 and PC.",
    sources: ["https://starwars.fandom.com/wiki/Star_Wars:_Squadrons"]
  },
  {
    kind: "game",
    id: "game/canon/fallen-order-2019",
    name: "Star Wars Jedi: Fallen Order",
    aliases: ["Fallen Order", "Jedi: Fallen Order"],
    canonicity: "canon",
    releaseYear: 2019,
    developer: "Respawn Entertainment",
    platforms: "PS4, Xbox One, PC, PS5, Xbox Series X/S",
    short: "Respawn Entertainment (EA) · PS4, Xbox One, PC · 2019",
    long:
      "An action-adventure game developed by Respawn Entertainment and published by EA in 2019. Players control Cal Kestis, a Padawan survivor of Order 66, as he seeks to rebuild the Jedi Order while hunted by the Empire's Inquisitors. Set five years after Revenge of the Sith, it is fully canon and introduces the planet Dathomir's Nightsister lore and the Second Sister Inquisitor to wider audiences.",
    sources: ["https://starwars.fandom.com/wiki/Star_Wars_Jedi:_Fallen_Order"]
  },
  {
    kind: "game",
    id: "game/canon/survivor-2023",
    name: "Star Wars Jedi: Survivor",
    aliases: ["Survivor", "Jedi: Survivor"],
    canonicity: "canon",
    releaseYear: 2023,
    developer: "Respawn Entertainment",
    platforms: "PS5, Xbox Series X/S, PC",
    short: "Respawn Entertainment (EA) · PS5, Xbox Series X/S, PC · 2023",
    long:
      "The sequel to Fallen Order, developed by Respawn Entertainment and published by EA in 2023. Cal Kestis, now five years older, searches for a way to protect Force-sensitive people in an increasingly hostile Empire. Introduces the planet Koboh and the ancient Zeffo-adjacent civilization of the High Republic, and expands the cast significantly with allies including Bode Akuna and the bounty hunter Rayvis.",
    sources: ["https://starwars.fandom.com/wiki/Star_Wars_Jedi:_Survivor"]
  },
  {
    kind: "game",
    id: "game/canon/outlaws-2024",
    name: "Star Wars Outlaws",
    aliases: ["Outlaws"],
    canonicity: "canon",
    releaseYear: 2024,
    developer: "Massive Entertainment",
    platforms: "PS5, Xbox Series X/S, PC",
    short: "Massive Entertainment (Ubisoft) · PS5, Xbox Series X/S, PC · 2024",
    long:
      "An open-world action-adventure game developed by Massive Entertainment and published by Ubisoft, released in 2024. The first Star Wars open-world game, it follows scoundrel Kay Vess and her companion Nix across multiple planets set between The Empire Strikes Back and Return of the Jedi. Players navigate criminal syndicates including the Pyke Syndicate, Crimson Dawn, Jabba's Hutt Cartel, and the Ashiga Clan.",
    sources: ["https://starwars.fandom.com/wiki/Star_Wars_Outlaws"]
  },
  {
    kind: "game",
    id: "game/non-canon/lego-skywalker-saga-2022",
    name: "Lego Star Wars: The Skywalker Saga",
    aliases: ["The Skywalker Saga", "Lego Skywalker Saga"],
    canonicity: "legends",
    releaseYear: 2022,
    developer: "TT Games",
    platforms: "PS4, PS5, Xbox One, Xbox Series X/S, Nintendo Switch, PC",
    short: "TT Games (WB Games) · PS4, PS5, Switch, PC · 2022",
    long:
      "A Lego video game developed by TT Games and published by Warner Bros. Games in 2022, adapting all nine Skywalker Saga films in Lego form. Features over 300 playable characters, open-world planet hubs for each of the nine films, and the Lego series' signature humor. Non-canonical parody adaptation of the full Skywalker Saga.",
    sources: ["https://starwars.fandom.com/wiki/LEGO_Star_Wars:_The_Skywalker_Saga"]
  }
];
