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

const lessonGlyphs = (n: number) => GLYPHS.filter((g) => g.lesson === n).map((g) => g.id);
const lessonVowels = (n: number) => VOWELS.filter((v) => v.lesson === n).map((v) => v.id);

/** Prima tutte le vocali (sulla א muta), poi le lettere in ordine alfabetico, infine le regole di lettura. */
export const LESSONS: Lesson[] = [
  {
    id: 1,
    title: 'Le vocali',
    subtitle: 'Tutti i segni del nikud · א',
    glyphs: lessonGlyphs(1),
    vowels: lessonVowels(1),
    theory: [
      { type: 'p', text: 'L’ebraico si scrive e si legge da DESTRA verso SINISTRA. L’alfabeto (alef-bet) ha 22 lettere, tutte consonanti: non esistono maiuscole e minuscole.' },
      { type: 'p', text: 'Le vocali si indicano con piccoli segni sotto, sopra o accanto alle lettere: il nikud. Nei libri per bambini, nelle preghiere e nei corsi il testo è vocalizzato; nei giornali no. Imparerai prima a leggere con il nikud.' },
      { type: 'p', text: 'In questa lezione impari tutti i segni vocalici, scritti sulla prima lettera dell’alfabeto: א (alef), che è muta e porta solo la vocale. Nelle lezioni successive incontrerai le altre lettere in ordine alfabetico.' },
      { type: 'list', items: [
        '“a”: kamatz אָ (piccola T) e patach אַ (lineetta).',
        '“e”: tsere אֵ (due punti), segol אֶ (tre punti) e tsere malè אֵי.',
        '“i”: chirik אִ (un punto sotto) e chirik malè אִי (con la י muta).',
        '“o”: cholam אֹ (punto in alto a sinistra) e cholam malè אוֹ (sopra una ו).',
        '“u”: kubutz אֻ (tre punti obliqui) e shuruk אוּ (una ו con un punto a sinistra).',
      ] },
      { type: 'p', text: 'Lo sheva ( ְ due punti verticali) indica che la consonante NON ha vocale, oppure una “e” brevissima. Sotto le gutturali come א si usano al suo posto i chataf, vocali brevi: אֲ “a”, אֱ “e”, אֳ “o”.' },
      { type: 'tip', text: 'Conta il suono, non il segno: kamatz e patach si leggono entrambi “a”, tsere e segol “e”. Le forme “malè” (piene) aggiungono una lettera muta, י o ו, che aiuta a leggere.' },
      { type: 'example', he: 'אָ אֵ אִ אוֹ אוּ', translit: 'a e i o u' },
    ],
  },
  {
    id: 2,
    title: 'Bet, gimel e dalet',
    subtitle: 'בּ ב ג ד',
    glyphs: lessonGlyphs(2),
    vowels: lessonVowels(2),
    theory: [
      { type: 'p', text: 'בּ con il puntino (dagesh) si legge “b”; ב senza puntino si legge “v”. È la stessa lettera: il puntino cambia il suono.' },
      { type: 'p', text: 'ג (gimel) = “g” sempre dura, come in “gatto”. ד (dalet) = “d”: ha l’angolo spigoloso (la ר, che vedrai più avanti, è arrotondata).' },
      { type: 'example', he: 'אַבָּא', translit: 'aba', note: 'papà: leggi da destra, א+patach = a, בּ+kamatz = ba, poi א muta.' },
      { type: 'example', he: 'דָּג', translit: 'dag', note: 'pesce' },
      { type: 'example', he: 'גַּג', translit: 'gag', note: 'tetto' },
    ],
  },
  {
    id: 3,
    title: 'He, vav, zayin e chet',
    subtitle: 'ה ו ז ח',
    glyphs: lessonGlyphs(3),
    vowels: lessonVowels(3),
    theory: [
      { type: 'p', text: 'ה (he) è una “h” aspirata leggera. A fine parola è quasi sempre muta: מָה si legge “ma”.' },
      { type: 'p', text: 'ו (vav) come consonante si legge “v”. Ricorda però che וֹ è la vocale “o” e וּ la vocale “u”: guarda dove sta il punto.' },
      { type: 'p', text: 'ז (zayin) = “z” sonora, come la “s” di “rosa”. ח (chet) = “ch” gutturale, come il tedesco “Bach”.' },
      { type: 'example', he: 'זֶה', translit: 'ze', note: 'questo: la ה finale è muta.' },
      { type: 'example', he: 'חַג', translit: 'chag', note: 'festa' },
      { type: 'tip', text: 'La traslitterazione “ch” in questo corso indica SEMPRE il suono gutturale (Bach), mai la “ch” italiana di “chiesa”.' },
    ],
  },
  {
    id: 4,
    title: 'Tet, yod e kaf',
    subtitle: 'ט י כּ כ ך',
    glyphs: lessonGlyphs(4),
    vowels: lessonVowels(4),
    theory: [
      { type: 'p', text: 'ט (tet) = “t”. י (yod) è la lettera più piccola e si legge “y” (come la “i” di “ieri”); spesso però è muta e aiuta a leggere la vocale, come in אִי.' },
      { type: 'p', text: 'כ funziona come ב: con dagesh (כּ) si legge “k”, senza (כ) si legge “ch” gutturale. A fine parola si scrive ך: è la prima delle cinque forme finali.' },
      { type: 'example', he: 'טוֹב', translit: 'tov', note: 'buono' },
      { type: 'example', he: 'יָד', translit: 'yad', note: 'mano' },
      { type: 'example', he: 'כִּי', translit: 'ki', note: 'perché: la י dopo il chirik è muta.' },
      { type: 'tip', text: 'Cinque lettere hanno una forma diversa a fine parola: כ מ נ פ צ → ך ם ן ף ץ.' },
    ],
  },
  {
    id: 5,
    title: 'Lamed e mem',
    subtitle: 'ל מ ם',
    glyphs: lessonGlyphs(5),
    vowels: lessonVowels(5),
    theory: [
      { type: 'p', text: 'ל (lamed) = “l”, l’unica lettera che sale sopra la riga. מ (mem) = “m”; a fine parola si scrive ם (mem sofit), chiusa e quadrata.' },
      { type: 'example', he: 'לֶחֶם', translit: 'lechem', note: 'pane' },
      { type: 'example', he: 'אִמָּא', translit: 'ima', note: 'mamma. Il puntino in מּ raddoppiava la consonante, ma oggi non cambia la pronuncia.' },
      { type: 'example', he: 'מַיִם', translit: 'mayim', note: 'acqua: ם finale.' },
    ],
  },
  {
    id: 6,
    title: 'Nun, samekh e ayin',
    subtitle: 'נ ן ס ע',
    glyphs: lessonGlyphs(6),
    vowels: lessonVowels(6),
    theory: [
      { type: 'p', text: 'נ (nun) = “n”; a fine parola diventa ן, lunga e sotto la riga. ס (samekh) = “s” sorda. ע (ayin) nel parlato moderno è muta come א.' },
      { type: 'example', he: 'גַּן', translit: 'gan', note: 'giardino' },
      { type: 'example', he: 'סוּס', translit: 'sus', note: 'cavallo' },
      { type: 'example', he: 'עַיִן', translit: 'ayin', note: 'occhio (ed è anche il nome della lettera ע)' },
      { type: 'tip', text: 'Le lettere gutturali (א ה ח ע) non prendono lo sheva pronunciato: al suo posto hanno i chataf, come in אֲנִי “ani” (io).' },
    ],
  },
  {
    id: 7,
    title: 'Pe e tsadi',
    subtitle: 'פּ פ ף צ ץ',
    glyphs: lessonGlyphs(7),
    vowels: lessonVowels(7),
    theory: [
      { type: 'p', text: 'פּ con dagesh = “p”, פ senza dagesh = “f”. A fine parola si scrive ף e si legge “f”.' },
      { type: 'p', text: 'צ (tsadi) = “ts”, come la “z” di “pizza”; a fine parola ץ.' },
      { type: 'example', he: 'פֶּה', translit: 'pe', note: 'bocca' },
      { type: 'example', he: 'אַף', translit: 'af', note: 'naso' },
      { type: 'example', he: 'עֵץ', translit: 'ets', note: 'albero' },
    ],
  },
  {
    id: 8,
    title: 'Kuf e resh',
    subtitle: 'ק ר',
    glyphs: lessonGlyphs(8),
    vowels: lessonVowels(8),
    theory: [
      { type: 'p', text: 'ק (kuf) = “k”, come כּ. ר (resh) è una “r” gutturale, simile alla “r” francese: è arrotondata, a differenza della ד.' },
      { type: 'example', he: 'קָפֶה', translit: 'kafe', note: 'caffè' },
      { type: 'example', he: 'רַק', translit: 'rak', note: 'solo, soltanto' },
      { type: 'example', he: 'יָרֹק', translit: 'yarok', note: 'verde' },
    ],
  },
  {
    id: 9,
    title: 'Shin, sin e tav',
    subtitle: 'שׁ שׂ ת · alfabeto completo!',
    glyphs: lessonGlyphs(9),
    vowels: lessonVowels(9),
    theory: [
      { type: 'p', text: 'שׁ (shin) ha tre bracci e un punto in alto a DESTRA: si legge “sh” come “sc” in “scena”. שׂ (sin) è la stessa lettera con il punto a SINISTRA: si legge “s”.' },
      { type: 'p', text: 'ת (tav) = “t”, come ט.' },
      { type: 'example', he: 'שָׁלוֹם', translit: 'shalom', note: 'pace, ciao' },
      { type: 'example', he: 'שַׁבָּת', translit: 'shabat', note: 'sabato' },
      { type: 'tip', text: 'Suoni doppi: ס e שׂ = “s”; ק e כּ = “k”; ת e ט = “t”; ב (senza puntino) e ו = “v”; ח e כ (senza puntino) = “ch”; א e ע = mute. Nella lettura il suono è lo stesso, cambia solo l’ortografia.' },
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
        'A inizio parola ב כ פ hanno quasi sempre il dagesh: בַּיִת, כֶּלֶב, פֶּה (eccezioni: alcuni prestiti, come פָלָאפֶל). Dopo un prefisso vocalizzato lo perdono: לְבַד “levad”, בִּכְפָר “bichfar”, וּבֵיצִים “uveitsim”.',
        'Nelle altre lettere il dagesh (forte) raddoppiava la consonante; oggi non si sente: אִמָּא = “ima”.',
        'Sheva: di solito è muto, anche a inizio parola (זְמַן “zman”, סְפָרִים “sfarim”); in mezzo dopo vocale breve è sempre muto (תַּלְמִיד “tal-mid”). Si pronuncia come una “e” brevissima con i prefissi בְּ לְ וְ מְ (בְּבַקָּשָׁה “bevakasha”), a inizio parola sotto י ל מ נ ר (יְלָדִים “yeladim”, מְאֹד “meod”) e davanti a una gutturale (שְׁאֵלָה “sheela”).',
        'Le gutturali (א ה ח ע) al posto dello sheva pronunciato hanno i chataf ( ֲ ֱ ֳ ); lo sheva muto lo portano normalmente: מַחְשֵׁב “machshev”.',
        'ה finale è muta: יָפֶה = “yafe”. Se ha un puntino dentro (הּ, mappiq) si pronuncia: לָהּ “la” (a lei), גָּבוֹהַּ “gavoa”.',
        'י e ו possono essere vocali (אִי, אוֹ, אוּ) o consonanti (y, v): guarda se portano un segno vocalico proprio.',
        'Patach furtivo: sotto ח, ע o הּ finali il patach si legge PRIMA della consonante: רוּחַ “ruach”, תַּפּוּחַ “tapuach”.',
        'Cholam e shin: a volte il punto del cholam si fonde con quello della שׁ o del שׂ: מֹשֶׁה “Moshe”, שֹׂנֵא “sone”.',
        'Kamatz katan: in sillaba chiusa e non accentata il kamatz si legge “o”: כׇּל “kol”, חׇכְמָה “chochma”. Nei testi moderni si distingue con un segno un po’ più lungo (ׇ). In questo corso le parole con kamatz katan sono state evitate.',
      ] },
      { type: 'p', text: 'Senza nikud: nei testi di tutti i giorni le vocali non si scrivono e si usa la grafia piena, con ו e י in più (שֻׁלְחָן → שולחן). Allenati nella sezione Lettura togliendo il nikud.' },
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

/** Parole di base di una lezione: quelle da imparare davvero (entrano nel ripasso). */
export function coreWordsOfLesson(lesson: number): Word[] {
  return wordsOfLesson(lesson).filter((w) => w.core);
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
