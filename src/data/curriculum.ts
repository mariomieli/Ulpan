import { GLYPHS, GLYPH_BY_ID } from './alphabet';
import { VOWELS, VOWEL_BY_ID } from './nikud';
import { WORDS, SENTENCES, type Word, type Sentence } from './words';
import { requirements } from '../lib/hebrew';
import type { ReadingText } from './texts';

export type TheoryBlock =
  | { type: 'p'; text: string }
  | { type: 'tip'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'example'; he: string; translit: string; note?: string };

export interface Lesson {
  id: number;
  title: string;
  subtitle: string;
  glyphs: string[];
  vowels: string[];
  theory: TheoryBlock[];
}

export const LESSONS: Lesson[] = [
  {
    id: 1,
    title: 'Primi passi',
    subtitle: 'א ב ל מ · la vocale “a”',
    glyphs: GLYPHS.filter((g) => g.lesson === 1).map((g) => g.id),
    vowels: VOWELS.filter((v) => v.lesson === 1).map((v) => v.id),
    theory: [
      { type: 'p', text: 'L’ebraico si scrive e si legge da DESTRA verso SINISTRA. L’alfabeto (alef-bet) ha 22 lettere, tutte consonanti: non esistono maiuscole e minuscole.' },
      { type: 'p', text: 'Le vocali si indicano con piccoli segni sotto, sopra o accanto alle lettere: il nikud. Nei libri per bambini, nelle preghiere e nei corsi di lingua il testo è vocalizzato; nei giornali no. Imparerai prima a leggere con il nikud.' },
      { type: 'p', text: 'In questa lezione impari quattro lettere e due segni che si leggono entrambi “a”: kamatz ( ָ ) e patach ( ַ ).' },
      { type: 'list', items: [
        'א (alef) è muta: porta solo la vocale. אָ = “a”.',
        'בּ con il puntino (dagesh) si legge “b”; ב senza puntino si legge “v”.',
        'ל (lamed) = “l”, l’unica lettera che sale sopra la riga.',
        'מ (mem) = “m”; a fine parola si scrive ם (mem sofit).',
      ] },
      { type: 'example', he: 'אַבָּא', translit: 'aba', note: 'papà: leggi da destra, א+patach = a, בּ+kamatz = ba, poi א muta.' },
      { type: 'tip', text: 'Cinque lettere hanno una forma diversa quando stanno a fine parola: כ מ נ פ צ → ך ם ן ף ץ. La prima che incontri è ם.' },
    ],
  },
  {
    id: 2,
    title: 'Shin, tav e dalet',
    subtitle: 'שׁ ת ד · la vocale “i”',
    glyphs: GLYPHS.filter((g) => g.lesson === 2).map((g) => g.id),
    vowels: VOWELS.filter((v) => v.lesson === 2).map((v) => v.id),
    theory: [
      { type: 'p', text: 'שׁ (shin) ha tre bracci e un punto in alto a DESTRA: si legge “sh” come “sc” in “scena”.' },
      { type: 'p', text: 'ת (tav) si legge “t”, ד (dalet) si legge “d”. Attenzione: ד ha l’angolo spigoloso, la ר (che vedrai più avanti) è arrotondata.' },
      { type: 'p', text: 'Il chirik ( ִ ) è un singolo punto sotto la lettera e si legge “i”.' },
      { type: 'example', he: 'שַׁבָּת', translit: 'shabat', note: 'sabato' },
      { type: 'example', he: 'אִמָּא', translit: 'ima', note: 'mamma. Il puntino in מּ raddoppia la consonante ma oggi non cambia la pronuncia.' },
    ],
  },
  {
    id: 3,
    title: 'Yod, nun e gimel',
    subtitle: 'י נ ן ג · chirik malè e sheva',
    glyphs: GLYPHS.filter((g) => g.lesson === 3).map((g) => g.id),
    vowels: VOWELS.filter((v) => v.lesson === 3).map((v) => v.id),
    theory: [
      { type: 'p', text: 'י (yod) è la lettera più piccola e si legge “y” (come la “i” di “ieri”). Spesso però è una “mater lectionis”: una lettera muta che aiuta a leggere la vocale.' },
      { type: 'p', text: 'Chirik malè ( ִי ): punto sotto la consonante + י muta = “i”. בִּי si legge “bi”.' },
      { type: 'p', text: 'נ (nun) = “n”; a fine parola diventa ן, lunga e sotto la riga. ג (gimel) = “g” sempre dura, come in “gatto”.' },
      { type: 'p', text: 'Lo sheva ( ְ due punti verticali) indica che la consonante NON ha vocale: תַּלְמִיד si legge “tal-mid”. Approfondirai lo sheva nella lezione 7.' },
      { type: 'example', he: 'תַּלְמִיד', translit: 'talmid', note: 'studente' },
      { type: 'example', he: 'גַּן', translit: 'gan', note: 'giardino' },
    ],
  },
  {
    id: 4,
    title: 'He e vav',
    subtitle: 'ה ו · la vocale “o”',
    glyphs: GLYPHS.filter((g) => g.lesson === 4).map((g) => g.id),
    vowels: VOWELS.filter((v) => v.lesson === 4).map((v) => v.id),
    theory: [
      { type: 'p', text: 'ה (he) è una “h” aspirata leggera. A fine parola è quasi sempre muta: מָה si legge “ma”.' },
      { type: 'p', text: 'ו (vav) come consonante si legge “v”. Ma con un punto sopra (וֹ) diventa la vocale “o” (cholam malè).' },
      { type: 'p', text: 'Il cholam ( ֹ ) è un punto in alto a sinistra della lettera e si legge “o”.' },
      { type: 'example', he: 'שָׁלוֹם', translit: 'shalom', note: 'pace, ciao' },
      { type: 'example', he: 'תּוֹדָה', translit: 'toda', note: 'grazie: la ה finale è muta.' },
      { type: 'tip', text: 'Il punto del cholam sulla שׁ può fondersi con quello della shin: in שׁוֹ lo trovi sulla vav.' },
    ],
  },
  {
    id: 5,
    title: 'Resh e kaf',
    subtitle: 'ר כּ כ ך · la vocale “e”',
    glyphs: GLYPHS.filter((g) => g.lesson === 5).map((g) => g.id),
    vowels: VOWELS.filter((v) => v.lesson === 5).map((v) => v.id),
    theory: [
      { type: 'p', text: 'ר (resh) è una “r” gutturale, simile alla “r” francese.' },
      { type: 'p', text: 'כ funziona come ב: con dagesh (כּ) si legge “k”, senza (כ) si legge “ch” gutturale, come il tedesco “Bach”. A fine parola si scrive ך.' },
      { type: 'p', text: 'Tre segni per la “e”: tsere ( ֵ due punti), segol ( ֶ tre punti) e tsere malè ( ֵי ).' },
      { type: 'example', he: 'מֶלֶךְ', translit: 'melech', note: 're: ך finale, con lo sheva dentro.' },
      { type: 'example', he: 'כֵּן', translit: 'ken', note: 'sì' },
      { type: 'tip', text: 'La traslitterazione “ch” in questo corso indica SEMPRE il suono gutturale (Bach), mai la “ch” italiana di “chiesa”.' },
    ],
  },
  {
    id: 6,
    title: 'Samekh, kuf e sin',
    subtitle: 'ס ק שׂ · la vocale “u”',
    glyphs: GLYPHS.filter((g) => g.lesson === 6).map((g) => g.id),
    vowels: VOWELS.filter((v) => v.lesson === 6).map((v) => v.id),
    theory: [
      { type: 'p', text: 'ס (samekh) = “s” sorda. ק (kuf) = “k”, come כּ. שׂ (sin) è la stessa lettera della shin ma con il punto a SINISTRA: si legge “s”.' },
      { type: 'p', text: 'La “u” si scrive con il kubutz ( ֻ tre punti obliqui) oppure con lo shuruk (וּ, una vav con un punto a sinistra).' },
      { type: 'example', he: 'סוּס', translit: 'sus', note: 'cavallo' },
      { type: 'example', he: 'סֻכָּה', translit: 'suka', note: 'capanna (con kubutz)' },
      { type: 'tip', text: 'Suoni doppi: ס e שׂ = “s”; ק e כּ = “k”; ת e ט = “t”; ב e ו = “v”. Nella lettura il suono è lo stesso, cambia solo l’ortografia.' },
    ],
  },
  {
    id: 7,
    title: 'Gutturali e sheva',
    subtitle: 'ח ע · sheva pronunciato e chataf',
    glyphs: GLYPHS.filter((g) => g.lesson === 7).map((g) => g.id),
    vowels: VOWELS.filter((v) => v.lesson === 7).map((v) => v.id),
    theory: [
      { type: 'p', text: 'ח (chet) è la “ch” gutturale, identica a כ. ע (ayin) nel parlato moderno è muta come א.' },
      { type: 'p', text: 'Lo sheva ( ְ due punti verticali) indica l’assenza di vocale. A inizio parola, o dopo un altro sheva, si pronuncia spesso come una “e” brevissima (sheva na): זְמַן “zman”, בְּרָכָה “bracha”.' },
      { type: 'p', text: 'Le lettere gutturali (א ה ח ע) non amano lo sheva: al suo posto prendono i chataf, vocali brevi: ֲ “a”, ֱ “e”, ֳ “o”.' },
      { type: 'example', he: 'אֲנִי', translit: 'ani', note: 'io' },
      { type: 'example', he: 'לֶחֶם', translit: 'lechem', note: 'pane' },
      { type: 'tip', text: 'Patach “furtivo”: sotto ח o ע finali il patach si legge PRIMA della consonante. רוּחַ = “ruach”, non “rucha”.' },
    ],
  },
  {
    id: 8,
    title: 'Zayin, tet e tsadi',
    subtitle: 'ז ט צ ץ',
    glyphs: GLYPHS.filter((g) => g.lesson === 8).map((g) => g.id),
    vowels: [],
    theory: [
      { type: 'p', text: 'ז (zayin) = “z” sonora, come la “s” di “rosa”. ט (tet) = “t”. צ (tsadi) = “ts”, come la “z” di “pizza”; a fine parola ץ.' },
      { type: 'example', he: 'טוֹב', translit: 'tov', note: 'buono' },
      { type: 'example', he: 'עֵץ', translit: 'ets', note: 'albero' },
      { type: 'example', he: 'זָהָב', translit: 'zahav', note: 'oro' },
    ],
  },
  {
    id: 9,
    title: 'Pe e fe',
    subtitle: 'פּ פ ף · alfabeto completo!',
    glyphs: GLYPHS.filter((g) => g.lesson === 9).map((g) => g.id),
    vowels: [],
    theory: [
      { type: 'p', text: 'Ultima coppia: פּ con dagesh = “p”, פ senza dagesh = “f”. A fine parola si scrive ף e si legge “f”.' },
      { type: 'example', he: 'פֶּרַח', translit: 'perach', note: 'fiore' },
      { type: 'example', he: 'קָפֶה', translit: 'kafe', note: 'caffè' },
      { type: 'example', he: 'אַף', translit: 'af', note: 'naso' },
      { type: 'tip', text: 'Complimenti: conosci tutte le 22 lettere, le 5 forme finali e tutti i segni vocalici!' },
    ],
  },
  {
    id: 10,
    title: 'Regole di lettura',
    subtitle: 'Dagesh, sheva, casi speciali',
    glyphs: [],
    vowels: [],
    theory: [
      { type: 'p', text: 'Questa lezione non introduce lettere nuove: riassume le regole che ti permettono di leggere qualsiasi parola vocalizzata.' },
      { type: 'list', items: [
        'Begadkefat: ב כ פ con dagesh = b k p; senza = v ch f. (In ג ד ת il dagesh oggi non cambia il suono.)',
        'A inizio parola ב כ פ hanno SEMPRE il dagesh: בַּיִת, כֶּלֶב, פֶּה.',
        'Nelle altre lettere il dagesh (forte) raddoppiava la consonante; oggi non si sente: אִמָּא = “ima”.',
        'Sheva a inizio parola: “e” brevissima o nulla (סְפָרִים = sfarim). Sheva in mezzo dopo vocale breve: muto (תַּלְמִיד = tal-mid).',
        'ה finale è muta: יָפֶה = “yafe”.',
        'י e ו possono essere vocali (אִי, אוֹ, אוּ) o consonanti (y, v): guarda se portano un segno vocalico proprio.',
        'Patach furtivo: sotto ח/ע finali si legge prima: תַּפּוּחַ = “tapuach”.',
        'Kamatz katan: in poche parole il kamatz si legge “o” (es. כָּל = “kol”). È raro: impara quelle parole a memoria.',
      ] },
      { type: 'p', text: 'Senza nikud: nei testi di tutti i giorni le vocali non si scrivono. Le matres lectionis (י ו) aiutano, ma serve conoscere il vocabolario. Allenati nella sezione Lettura nascondendo il nikud.' },
      { type: 'example', he: 'יְרוּשָׁלַיִם', translit: 'yerushalayim', note: 'Gerusalemme' },
    ],
  },
];

export const LESSON_BY_ID: Record<number, Lesson> = Object.fromEntries(LESSONS.map((l) => [l.id, l]));
export const LAST_LESSON = LESSONS[LESSONS.length - 1].id;

/** Lezione a partire dalla quale un testo è leggibile. */
export function lessonForText(text: string): number {
  const req = requirements(text);
  let max = 1;
  for (const g of req.glyphs) max = Math.max(max, GLYPH_BY_ID[g]?.lesson ?? Infinity);
  for (const v of req.vowels) max = Math.max(max, VOWEL_BY_ID[v]?.lesson ?? Infinity);
  return max;
}

const WORD_LESSON = new Map<string, number>(WORDS.map((w) => [w.id, lessonForText(w.he)]));

export function wordLesson(w: Word): number {
  return WORD_LESSON.get(w.id) ?? lessonForText(w.he);
}

export function wordsUpTo(lesson: number): Word[] {
  return WORDS.filter((w) => wordLesson(w) <= lesson);
}

export function wordsOfLesson(lesson: number): Word[] {
  return WORDS.filter((w) => wordLesson(w) === lesson);
}

export function sentencesUpTo(lesson: number): Sentence[] {
  return SENTENCES.filter((s) => lessonForText(s.he) <= lesson);
}

export function glyphsUpTo(lesson: number) {
  return GLYPHS.filter((g) => g.lesson <= lesson);
}

export function vowelsUpTo(lesson: number) {
  return VOWELS.filter((v) => v.lesson <= lesson);
}

/** Lezione a partire dalla quale un testo di lettura è leggibile. */
export function textLevel(t: ReadingText): number {
  return Math.max(...t.lines.map((l) => lessonForText(l.he)));
}
