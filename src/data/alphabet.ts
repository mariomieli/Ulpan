/**
 * Alfabeto ebraico: 22 lettere + 5 forme finali, con le varianti di pronuncia
 * distinte dal dagesh (בּ/ב, כּ/כ, פּ/פ) e dal punto di shin/sin (שׁ/שׂ).
 * Ogni "glifo" è un'unità che lo studente deve saper riconoscere e leggere.
 */
export interface Glyph {
  id: string;
  /** Il carattere così come appare (con dagesh o punto se serve). */
  char: string;
  /** La lettera base senza segni. */
  letter: string;
  /** Nome della lettera traslitterato. */
  name: string;
  /** Nome della lettera in ebraico, vocalizzato. */
  hebrewName: string;
  /** Etichetta breve del suono (usata nelle risposte a scelta multipla). */
  sound: string;
  /** Traslitterazione usata per comporre le sillabe ('' per le lettere mute). */
  translit: string;
  /** Spiegazione della pronuncia per un parlante italiano. */
  description: string;
  /** Suggerimento mnemonico / come distinguerla. */
  tip: string;
  gematria: number;
  lesson: number;
  /** Id della forma finale di questa lettera, se esiste. */
  finalForm?: string;
  /** Per le forme finali: id della forma normale. */
  finalOf?: string;
}

export const GLYPHS: Glyph[] = [
  {
    id: 'alef', char: 'א', letter: 'א', name: 'Alef', hebrewName: 'אָלֶף',
    sound: 'muta', translit: '',
    description: 'Non ha un suono proprio: fa da “supporto” alla vocale che porta. אָ si legge semplicemente “a”.',
    tip: 'Ricorda una X inclinata. È la prima lettera e vale 1.',
    gematria: 1, lesson: 1,
  },
  {
    id: 'bet', char: 'בּ', letter: 'ב', name: 'Bet', hebrewName: 'בֵּית',
    sound: 'b', translit: 'b',
    description: 'Come la “b” italiana di “barca”. Il puntino all’interno (dagesh) indica il suono duro.',
    tip: 'Ha una “base” sporgente in basso a destra: non confonderla con כ (kaf), che è tutta arrotondata.',
    gematria: 2, lesson: 1,
  },
  {
    id: 'vet', char: 'ב', letter: 'ב', name: 'Vet', hebrewName: 'בֵית',
    sound: 'v', translit: 'v',
    description: 'Stessa lettera di bet ma senza puntino: si legge “v” come in “vaso”.',
    tip: 'Senza dagesh il suono si “ammorbidisce”: b → v.',
    gematria: 2, lesson: 1,
  },
  {
    id: 'gimel', char: 'ג', letter: 'ג', name: 'Gimel', hebrewName: 'גִּימֶל',
    sound: 'g', translit: 'g',
    description: 'Sempre “g” dura, come in “gatto”, anche davanti a e/i.',
    tip: 'Ha un “piedino” a sinistra; נ (nun) invece ha la base piatta.',
    gematria: 3, lesson: 3,
  },
  {
    id: 'dalet', char: 'ד', letter: 'ד', name: 'Dalet', hebrewName: 'דָּלֶת',
    sound: 'd', translit: 'd',
    description: 'Come la “d” italiana.',
    tip: 'L’angolo in alto a destra è spigoloso e sporge: ר (resh) invece è arrotondata.',
    gematria: 4, lesson: 2,
  },
  {
    id: 'he', char: 'ה', letter: 'ה', name: 'He', hebrewName: 'הֵא',
    sound: 'h', translit: 'h',
    description: '“h” aspirata leggera, come nell’inglese “house”. A fine parola di solito è muta.',
    tip: 'La gamba sinistra è staccata dal tetto: in ח (chet) è attaccata.',
    gematria: 5, lesson: 4,
  },
  {
    id: 'vav', char: 'ו', letter: 'ו', name: 'Vav', hebrewName: 'וָו',
    sound: 'v', translit: 'v',
    description: '“v” come in “vino”. Con un punto sopra (וֹ) diventa la vocale “o”, con un punto a sinistra (וּ) la vocale “u”.',
    tip: 'Un’asta corta con una testolina. ז (zayin) ha la testa più larga, ן (nun finale) scende sotto la riga.',
    gematria: 6, lesson: 4,
  },
  {
    id: 'zayin', char: 'ז', letter: 'ז', name: 'Zayin', hebrewName: 'זַיִן',
    sound: 'z', translit: 'z',
    description: '“z” sonora, come la “s” di “rosa” (o la “z” di “zero” pronunciata dolce).',
    tip: 'Sembra una vav con un “cappello” largo.',
    gematria: 7, lesson: 8,
  },
  {
    id: 'chet', char: 'ח', letter: 'ח', name: 'Chet', hebrewName: 'חֵית',
    sound: 'ch', translit: 'ch',
    description: 'Suono gutturale aspro, come la “ch” del tedesco “Bach” o la “j” spagnola. Non è la “ch” di “chiesa”!',
    tip: 'Come ה ma con la gamba sinistra attaccata al tetto.',
    gematria: 8, lesson: 7,
  },
  {
    id: 'tet', char: 'ט', letter: 'ט', name: 'Tet', hebrewName: 'טֵית',
    sound: 't', translit: 't',
    description: 'Come la “t” italiana (oggi identica a ת).',
    tip: 'È aperta in alto, con il braccio destro che si ripiega verso l’interno.',
    gematria: 9, lesson: 8,
  },
  {
    id: 'yod', char: 'י', letter: 'י', name: 'Yod', hebrewName: 'יוֹד',
    sound: 'y', translit: 'y',
    description: '“i” consonantica come in “ieri”. Spesso serve anche a indicare la vocale “i”.',
    tip: 'La lettera più piccola: resta sospesa a metà altezza.',
    gematria: 10, lesson: 3,
  },
  {
    id: 'kaf', char: 'כּ', letter: 'כ', name: 'Kaf', hebrewName: 'כַּף',
    sound: 'k', translit: 'k',
    description: '“k” come in “casa”. Il dagesh indica il suono duro.',
    tip: 'Tutta arrotondata, senza la base sporgente di ב.',
    gematria: 20, lesson: 5, finalForm: 'khaf-sofit',
  },
  {
    id: 'khaf', char: 'כ', letter: 'כ', name: 'Khaf', hebrewName: 'כַף',
    sound: 'ch', translit: 'ch',
    description: 'Senza puntino: suono gutturale come ח (“ch” di “Bach”).',
    tip: 'Stessa forma di kaf ma senza dagesh.',
    gematria: 20, lesson: 5, finalForm: 'khaf-sofit',
  },
  {
    id: 'khaf-sofit', char: 'ך', letter: 'ך', name: 'Khaf sofit', hebrewName: 'כַף סוֹפִית',
    sound: 'ch', translit: 'ch',
    description: 'Forma finale di כ: si usa solo a fine parola. Suono “ch” gutturale.',
    tip: 'Scende sotto la riga; ד (dalet) invece si ferma sulla riga.',
    gematria: 20, lesson: 5, finalOf: 'khaf',
  },
  {
    id: 'lamed', char: 'ל', letter: 'ל', name: 'Lamed', hebrewName: 'לָמֶד',
    sound: 'l', translit: 'l',
    description: 'Come la “l” italiana.',
    tip: 'L’unica lettera che sale sopra la riga.',
    gematria: 30, lesson: 1,
  },
  {
    id: 'mem', char: 'מ', letter: 'מ', name: 'Mem', hebrewName: 'מֵם',
    sound: 'm', translit: 'm',
    description: 'Come la “m” italiana.',
    tip: 'Ha una piccola apertura in basso a sinistra.',
    gematria: 40, lesson: 1, finalForm: 'mem-sofit',
  },
  {
    id: 'mem-sofit', char: 'ם', letter: 'ם', name: 'Mem sofit', hebrewName: 'מֵם סוֹפִית',
    sound: 'm', translit: 'm',
    description: 'Forma finale di מ, solo a fine parola.',
    tip: 'Un quadrato chiuso con angoli vivi; ס (samekh) è arrotondata.',
    gematria: 40, lesson: 1, finalOf: 'mem',
  },
  {
    id: 'nun', char: 'נ', letter: 'נ', name: 'Nun', hebrewName: 'נוּן',
    sound: 'n', translit: 'n',
    description: 'Come la “n” italiana.',
    tip: 'Stretta, con la base piatta: non ha il “piedino” di ג.',
    gematria: 50, lesson: 3, finalForm: 'nun-sofit',
  },
  {
    id: 'nun-sofit', char: 'ן', letter: 'ן', name: 'Nun sofit', hebrewName: 'נוּן סוֹפִית',
    sound: 'n', translit: 'n',
    description: 'Forma finale di נ, solo a fine parola.',
    tip: 'Una vav allungata che scende sotto la riga.',
    gematria: 50, lesson: 3, finalOf: 'nun',
  },
  {
    id: 'samekh', char: 'ס', letter: 'ס', name: 'Samekh', hebrewName: 'סָמֶךְ',
    sound: 's', translit: 's',
    description: '“s” sorda, come in “sole”.',
    tip: 'Rotonda e chiusa; ם (mem finale) è squadrata.',
    gematria: 60, lesson: 6,
  },
  {
    id: 'ayin', char: 'ע', letter: 'ע', name: 'Ayin', hebrewName: 'עַיִן',
    sound: 'muta', translit: '',
    description: 'Nell’ebraico moderno è in genere muta come א: si legge solo la vocale.',
    tip: 'Due bracci che si uniscono in basso a sinistra, come una “y”.',
    gematria: 70, lesson: 7,
  },
  {
    id: 'pe', char: 'פּ', letter: 'פ', name: 'Pe', hebrewName: 'פֵּא',
    sound: 'p', translit: 'p',
    description: '“p” come in “pane”. Il dagesh indica il suono duro.',
    tip: 'Ha una “bocca” con un dente all’interno.',
    gematria: 80, lesson: 9, finalForm: 'fe-sofit',
  },
  {
    id: 'fe', char: 'פ', letter: 'פ', name: 'Fe', hebrewName: 'פֵא',
    sound: 'f', translit: 'f',
    description: 'Senza puntino si legge “f” come in “fiore”.',
    tip: 'Stessa forma di pe, senza dagesh.',
    gematria: 80, lesson: 9, finalForm: 'fe-sofit',
  },
  {
    id: 'fe-sofit', char: 'ף', letter: 'ף', name: 'Fe sofit', hebrewName: 'פֵא סוֹפִית',
    sound: 'f', translit: 'f',
    description: 'Forma finale di פ, solo a fine parola: suono “f”.',
    tip: 'Scende sotto la riga, con la testa ripiegata come פ.',
    gematria: 80, lesson: 9, finalOf: 'fe',
  },
  {
    id: 'tsadi', char: 'צ', letter: 'צ', name: 'Tsadi', hebrewName: 'צָדִי',
    sound: 'ts', translit: 'ts',
    description: '“ts” come la “z” di “pizza”.',
    tip: 'Un braccio a destra e una base piatta; ע scende a sinistra senza base.',
    gematria: 90, lesson: 8, finalForm: 'tsadi-sofit',
  },
  {
    id: 'tsadi-sofit', char: 'ץ', letter: 'ץ', name: 'Tsadi sofit', hebrewName: 'צָדִי סוֹפִית',
    sound: 'ts', translit: 'ts',
    description: 'Forma finale di צ, solo a fine parola.',
    tip: 'La coda scende dritta sotto la riga.',
    gematria: 90, lesson: 8, finalOf: 'tsadi',
  },
  {
    id: 'kuf', char: 'ק', letter: 'ק', name: 'Kuf', hebrewName: 'קוֹף',
    sound: 'k', translit: 'k',
    description: '“k” come in “casa” (oggi identica a כּ).',
    tip: 'La gamba sinistra scende sotto la riga ed è staccata.',
    gematria: 100, lesson: 6,
  },
  {
    id: 'resh', char: 'ר', letter: 'ר', name: 'Resh', hebrewName: 'רֵישׁ',
    sound: 'r', translit: 'r',
    description: '“r” gutturale, simile alla “r” francese (o alla “erre moscia”).',
    tip: 'L’angolo in alto è arrotondato; in ד è spigoloso.',
    gematria: 200, lesson: 5,
  },
  {
    id: 'shin', char: 'שׁ', letter: 'ש', name: 'Shin', hebrewName: 'שִׁין',
    sound: 'sh', translit: 'sh',
    description: '“sh” come “sc” in “scena”. Il punto è sopra il braccio DESTRO.',
    tip: 'Tre bracci: punto a destra = shin (sh).',
    gematria: 300, lesson: 2,
  },
  {
    id: 'sin', char: 'שׂ', letter: 'ש', name: 'Sin', hebrewName: 'שִׂין',
    sound: 's', translit: 's',
    description: '“s” sorda come in “sole”. Il punto è sopra il braccio SINISTRO.',
    tip: 'Punto a sinistra = sin (s).',
    gematria: 300, lesson: 6,
  },
  {
    id: 'tav', char: 'ת', letter: 'ת', name: 'Tav', hebrewName: 'תָּו',
    sound: 't', translit: 't',
    description: 'Come la “t” italiana.',
    tip: 'Il “piedino” sinistro sporge in basso; ח invece ha due gambe dritte.',
    gematria: 400, lesson: 2,
  },
];

export const GLYPH_BY_ID: Record<string, Glyph> = Object.fromEntries(GLYPHS.map((g) => [g.id, g]));

/** Le 22 lettere (una voce per lettera, senza varianti né forme finali). */
export const BASE_LETTERS: string[] = [
  'alef', 'bet', 'gimel', 'dalet', 'he', 'vav', 'zayin', 'chet', 'tet', 'yod', 'kaf',
  'lamed', 'mem', 'nun', 'samekh', 'ayin', 'pe', 'tsadi', 'kuf', 'resh', 'shin', 'tav',
];

/** Varianti che appartengono alla stessa lettera (per la pagina Alfabeto). */
export const LETTER_VARIANTS: Record<string, string[]> = {
  bet: ['vet'],
  kaf: ['khaf', 'khaf-sofit'],
  mem: ['mem-sofit'],
  nun: ['nun-sofit'],
  pe: ['fe', 'fe-sofit'],
  tsadi: ['tsadi-sofit'],
  shin: ['sin'],
};

/** Gruppi di lettere che si confondono facilmente: usati per creare distrattori credibili. */
const CONFUSABLE_GROUPS: string[][] = [
  ['bet', 'kaf', 'pe'],
  ['vet', 'khaf', 'fe'],
  ['gimel', 'nun'],
  ['dalet', 'resh', 'khaf-sofit'],
  ['he', 'chet', 'tav'],
  ['vav', 'zayin', 'nun-sofit', 'yod'],
  ['tet', 'mem'],
  ['mem-sofit', 'samekh'],
  ['ayin', 'tsadi', 'tsadi-sofit'],
  ['shin', 'sin'],
  ['alef', 'ayin'],
  ['kuf', 'he'],
  ['fe-sofit', 'khaf-sofit', 'nun-sofit'],
  ['khaf', 'chet'],
];

export const CONFUSABLES: Record<string, string[]> = (() => {
  const map: Record<string, Set<string>> = {};
  for (const group of CONFUSABLE_GROUPS) {
    for (const a of group) {
      map[a] ??= new Set();
      for (const b of group) if (a !== b) map[a].add(b);
    }
  }
  return Object.fromEntries(Object.entries(map).map(([k, v]) => [k, [...v]]));
})();

export const FINAL_GLYPHS = GLYPHS.filter((g) => g.finalOf);
