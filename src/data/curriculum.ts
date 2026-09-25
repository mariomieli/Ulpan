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

/**
 * Il percorso: prima le vocali (sulla א muta, in tre lezioni), poi le lettere in ordine alfabetico
 * a gruppi di due o tre, infine le regole di lettura una alla volta.
 */
const letters = (n: number, title: string, subtitle: string, theory: TheoryBlock[]): Lesson =>
  ({ id: n, title, subtitle, glyphs: lessonGlyphs(n), vowels: lessonVowels(n), theory });
const rules = (n: number, title: string, subtitle: string, theory: TheoryBlock[]): Lesson =>
  ({ id: n, title, subtitle, glyphs: [], vowels: [], theory });

export const LESSONS: Lesson[] = [
  letters(1, 'Alef e le vocali A ed E', 'א · אָ אַ אֵ אֶ אֵי', [
    { type: 'p', text: 'L’ebraico si scrive e si legge da DESTRA verso SINISTRA. L’alfabeto (alef-bet) ha 22 lettere, tutte consonanti: non esistono maiuscole e minuscole.' },
    { type: 'p', text: 'Le vocali si indicano con piccoli segni sotto, sopra o accanto alle lettere: il nikud. Nei libri per bambini, nelle preghiere e nei corsi il testo è vocalizzato; nei giornali no. Imparerai prima a leggere con il nikud.' },
    { type: 'p', text: 'Le prime tre lezioni presentano tutti i segni vocalici, scritti sulla prima lettera dell’alfabeto: א (alef), che è muta e porta solo la vocale. Poi incontrerai le altre lettere in ordine alfabetico.' },
    { type: 'list', items: [
      '“a”: kamatz אָ (una piccola T) e patach אַ (una lineetta).',
      '“e”: tsere אֵ (due punti affiancati) e segol אֶ (tre punti a triangolo).',
      'Tsere malè אֵי: tsere seguito da una י muta. Si legge “e”, spesso “ei”.',
    ] },
    { type: 'tip', text: 'Conta il suono, non il segno: kamatz e patach si leggono entrambi “a”, tsere e segol entrambi “e”.' },
    { type: 'example', he: 'אָ אַ אֵ אֶ', translit: 'a a e e' },
  ]),
  letters(2, 'Le vocali I, O e U', 'אִ אִי אֹ אוֹ אֻ אוּ', [
    { type: 'list', items: [
      '“i”: chirik אִ (un punto sotto) e chirik malè אִי (con la י muta dopo).',
      '“o”: cholam אֹ (un punto in alto a sinistra) e cholam malè אוֹ (il punto sopra una ו).',
      '“u”: kubutz אֻ (tre punti obliqui) e shuruk אוּ (una ו con un punto a sinistra).',
    ] },
    { type: 'p', text: 'Le forme “malè” (piene) aggiungono una lettera muta, י o ו, che aiuta a leggere: qui non si pronunciano come consonanti, fanno parte della vocale.' },
    { type: 'tip', text: 'Guarda dove sta il punto sulla ו: sopra (וֹ) è “o”, al centro a sinistra (וּ) è “u”.' },
    { type: 'example', he: 'אִי אוֹ אוּ', translit: 'i o u' },
  ]),
  letters(3, 'Sheva e chataf', 'ְ · אֲ אֱ אֳ', [
    { type: 'p', text: 'Lo sheva ( ְ due punti verticali) indica che la consonante NON ha vocale, oppure si legge come una “e” brevissima. Lo userai con le lettere delle prossime lezioni; le regole precise sono nella lezione 17.' },
    { type: 'p', text: 'Le lettere gutturali, come la א, al posto dello sheva pronunciato prendono i chataf: vocali brevi fatte da uno sheva più un’altra vocale.' },
    { type: 'list', items: [
      'Chataf patach אֲ = “a”',
      'Chataf segol אֱ = “e”',
      'Chataf kamatz אֳ = “o”',
    ] },
    { type: 'example', he: 'אֲ אֱ אֳ', translit: 'a e o' },
  ]),
  letters(4, 'Bet e vet', 'בּ ב', [
    { type: 'p', text: 'בּ con il puntino (dagesh) si legge “b”; ב senza puntino si legge “v”. È la stessa lettera: il puntino cambia il suono.' },
    { type: 'example', he: 'אַבָּא', translit: 'aba', note: 'papà: leggi da destra, א+patach = a, בּ+kamatz = ba, poi א muta.' },
    { type: 'example', he: 'אָב', translit: 'av', note: 'padre: senza puntino, “v”.' },
  ]),
  letters(5, 'Gimel e dalet', 'ג ד', [
    { type: 'p', text: 'ג (gimel) = “g” sempre dura, come in “gatto”. ד (dalet) = “d”: ha l’angolo spigoloso (la ר, che vedrai più avanti, è arrotondata).' },
    { type: 'example', he: 'דָּג', translit: 'dag', note: 'pesce' },
    { type: 'example', he: 'גַּג', translit: 'gag', note: 'tetto' },
  ]),
  letters(6, 'He e vav', 'ה ו', [
    { type: 'p', text: 'ה (he) è una “h” aspirata leggera. A fine parola è quasi sempre muta.' },
    { type: 'p', text: 'ו (vav) come consonante si legge “v”. Ricorda però che וֹ è la vocale “o” e וּ la vocale “u”.' },
    { type: 'example', he: 'הוּא', translit: 'hu', note: 'lui: la ו qui è la vocale “u”.' },
    { type: 'example', he: 'אַהֲבָה', translit: 'ahava', note: 'amore: la ה finale è muta.' },
  ]),
  letters(7, 'Zayin e chet', 'ז ח', [
    { type: 'p', text: 'ז (zayin) = “z” sonora, come la “s” di “rosa”. ח (chet) = “ch” gutturale, come il tedesco “Bach”.' },
    { type: 'example', he: 'זֶה', translit: 'ze', note: 'questo' },
    { type: 'example', he: 'חַג', translit: 'chag', note: 'festa' },
    { type: 'example', he: 'זָהָב', translit: 'zahav', note: 'oro' },
    { type: 'tip', text: 'La traslitterazione “ch” in questo corso indica SEMPRE il suono gutturale (Bach), mai la “ch” italiana di “chiesa”.' },
  ]),
  letters(8, 'Tet e yod', 'ט י', [
    { type: 'p', text: 'ט (tet) = “t”. י (yod) è la lettera più piccola e si legge “y” (come la “i” di “ieri”); dopo un chirik o un tsere invece è muta, come hai visto nelle vocali.' },
    { type: 'example', he: 'טוֹב', translit: 'tov', note: 'buono' },
    { type: 'example', he: 'יָד', translit: 'yad', note: 'mano' },
  ]),
  letters(9, 'Kaf e khaf', 'כּ כ ך', [
    { type: 'p', text: 'כ funziona come ב: con dagesh (כּ) si legge “k”, senza (כ) si legge “ch” gutturale, come ח.' },
    { type: 'p', text: 'A fine parola si scrive ך, lunga e sotto la riga: è la prima delle cinque forme finali.' },
    { type: 'example', he: 'כִּי', translit: 'ki', note: 'perché' },
    { type: 'example', he: 'כּוֹכָב', translit: 'kochav', note: 'stella: prima “k”, poi “ch”.' },
    { type: 'tip', text: 'Cinque lettere hanno una forma diversa a fine parola: כ מ נ פ צ → ך ם ן ף ץ.' },
  ]),
  letters(10, 'Lamed e mem', 'ל מ ם', [
    { type: 'p', text: 'ל (lamed) = “l”, l’unica lettera che sale sopra la riga. מ (mem) = “m”; a fine parola si scrive ם (mem sofit), chiusa e quadrata.' },
    { type: 'example', he: 'לֶחֶם', translit: 'lechem', note: 'pane' },
    { type: 'example', he: 'אִמָּא', translit: 'ima', note: 'mamma' },
    { type: 'example', he: 'מַיִם', translit: 'mayim', note: 'acqua' },
  ]),
  letters(11, 'Nun e samekh', 'נ ן ס', [
    { type: 'p', text: 'נ (nun) = “n”; a fine parola diventa ן, lunga e sotto la riga. ס (samekh) = “s” sorda, tonda e chiusa.' },
    { type: 'example', he: 'אֲנִי', translit: 'ani', note: 'io' },
    { type: 'example', he: 'גַּן', translit: 'gan', note: 'giardino' },
    { type: 'example', he: 'סוּס', translit: 'sus', note: 'cavallo' },
  ]),
  letters(12, 'Ayin, pe e fe', 'ע פּ פ ף', [
    { type: 'p', text: 'ע (ayin) nel parlato moderno è muta come א.' },
    { type: 'p', text: 'פּ con dagesh = “p”, פ senza dagesh = “f”. A fine parola si scrive ף e si legge “f”.' },
    { type: 'example', he: 'עַיִן', translit: 'ayin', note: 'occhio' },
    { type: 'example', he: 'פֶּה', translit: 'pe', note: 'bocca' },
    { type: 'example', he: 'אַף', translit: 'af', note: 'naso' },
  ]),
  letters(13, 'Tsadi e kuf', 'צ ץ ק', [
    { type: 'p', text: 'צ (tsadi) = “ts”, come la “z” di “pizza”; a fine parola ץ. ק (kuf) = “k”, come כּ.' },
    { type: 'example', he: 'עֵץ', translit: 'ets', note: 'albero' },
    { type: 'example', he: 'קָפֶה', translit: 'kafe', note: 'caffè' },
    { type: 'example', he: 'קוֹל', translit: 'kol', note: 'voce' },
  ]),
  letters(14, 'Resh e shin', 'ר שׁ', [
    { type: 'p', text: 'ר (resh) è una “r” gutturale, simile alla “r” francese: è arrotondata, a differenza della ד.' },
    { type: 'p', text: 'שׁ (shin) ha tre bracci e un punto in alto a DESTRA: si legge “sh” come “sc” in “scena”.' },
    { type: 'example', he: 'שָׁלוֹם', translit: 'shalom', note: 'pace, ciao' },
    { type: 'example', he: 'רֹאשׁ', translit: 'rosh', note: 'testa' },
  ]),
  letters(15, 'Sin e tav', 'שׂ ת · alfabeto completo!', [
    { type: 'p', text: 'שׂ (sin) è la stessa lettera della shin con il punto a SINISTRA: si legge “s”. ת (tav) = “t”, come ט.' },
    { type: 'example', he: 'שַׁבָּת', translit: 'shabat', note: 'sabato' },
    { type: 'example', he: 'שָׂמֵחַ', translit: 'sameach', note: 'contento' },
    { type: 'tip', text: 'Suoni doppi: ס e שׂ = “s”; ק e כּ = “k”; ת e ט = “t”; ב (senza puntino) e ו = “v”; ח e כ (senza puntino) = “ch”; א e ע = mute. Nella lettura il suono è lo stesso, cambia solo l’ortografia.' },
    { type: 'tip', text: 'Complimenti: conosci tutte le 22 lettere, le 5 forme finali e tutti i segni vocalici! Ora prova a leggere i nomi delle lettere (אָלֶף, בֵּית, גִּימֶל…): trovi l’esercizio nella pagina Alfabeto.' },
  ]),
  rules(16, 'Il dagesh', 'בּ/ב כּ/כ פּ/פ e il raddoppio', [
    { type: 'p', text: 'Il dagesh è il puntino dentro la lettera. Ha due funzioni diverse.' },
    { type: 'list', items: [
      'Begadkefat: in ב כ פ il dagesh cambia il suono: con = b k p, senza = v ch f. (In ג ד ת oggi non cambia nulla.)',
      'A inizio parola ב כ פ hanno quasi sempre il dagesh: בַּיִת, כֶּלֶב, פֶּה (eccezioni: alcuni prestiti, come פָלָאפֶל).',
      'Dopo un prefisso vocalizzato lo perdono: לְבַד “levad”, בִּכְפָר “bichfar”, וּבֵיצִים “uveitsim”.',
      'Nelle altre lettere il dagesh (forte) raddoppiava la consonante: oggi non si sente. אִמָּא = “ima”, סִפּוּר = “sipur”.',
    ] },
    { type: 'example', he: 'בַּיִת', translit: 'bayit', note: 'casa: “b” a inizio parola' },
    { type: 'example', he: 'כֶּלֶב', translit: 'kelev', note: 'cane' },
  ]),
  rules(17, 'Lo sheva', 'Muto o pronunciato · gutturali', [
    { type: 'p', text: 'Lo sheva di solito è muto, anche a inizio parola: זְמַן “zman”, סְפָרִים “sfarim”. In mezzo alla parola dopo una vocale breve è sempre muto: תַּלְמִיד “tal-mid”.' },
    { type: 'list', items: [
      'Si pronuncia come una “e” brevissima con i prefissi בְּ לְ וְ מְ: בְּבַקָּשָׁה “bevakasha”.',
      'A inizio parola sotto י ל מ נ ר: יְלָדִים “yeladim”, מְאֹד “meod”, לְבָנָה “levana”.',
      'Davanti a una gutturale: שְׁאֵלָה “sheela”.',
      'Le gutturali (א ה ח ע) al posto dello sheva pronunciato hanno i chataf ( ֲ ֱ ֳ ): אֲנִי “ani”. Lo sheva muto invece lo portano normalmente: מַחְשֵׁב “machshev”.',
    ] },
    { type: 'example', he: 'יְלָדִים', translit: 'yeladim', note: 'bambini' },
    { type: 'example', he: 'תַּלְמִיד', translit: 'talmid', note: 'studente' },
  ]),
  rules(18, 'Casi speciali', 'ה finale, mappiq, patach furtivo…', [
    { type: 'list', items: [
      'ה finale è muta: יָפֶה = “yafe”. Se ha un puntino dentro (הּ, mappiq) si pronuncia: לָהּ “la” (a lei), גָּבוֹהַּ “gavoa”.',
      'Patach furtivo: sotto ח, ע o הּ finali il patach si legge PRIMA della consonante: רוּחַ “ruach”, תַּפּוּחַ “tapuach”.',
      'י e ו possono essere vocali (אִי, אוֹ, אוּ) o consonanti (y, v): guarda se portano un segno vocalico proprio.',
      'Cholam e shin: a volte il punto del cholam si fonde con quello della שׁ o del שׂ: מֹשֶׁה “Moshe”, שֹׂנֵא “sone”.',
      'Kamatz katan: in sillaba chiusa e non accentata il kamatz si legge “o”: כׇּל “kol”, חׇכְמָה “chochma”. Nei testi moderni si distingue con un segno un po’ più lungo (ׇ).',
    ] },
    { type: 'example', he: 'רוּחַ', translit: 'ruach', note: 'vento, spirito' },
    { type: 'example', he: 'יְרוּשָׁלַיִם', translit: 'yerushalayim', note: 'Gerusalemme' },
  ]),
  rules(19, 'Leggere senza nikud', 'La grafia di giornali e cartelli', [
    { type: 'p', text: 'Nei testi di tutti i giorni le vocali non si scrivono. Per aiutare chi legge si usa la grafia piena (ktiv malè): si aggiungono lettere mute.' },
    { type: 'list', items: [
      'ו per “o” e “u”: שֻׁלְחָן → שולחן, חֹדֶשׁ → חודש.',
      'י per “i” in sillaba aperta: סִפּוּר → סיפור, מְדִינָה → מדינה.',
      'ו consonante in mezzo alla parola si raddoppia: תִּקְוָה → תקווה.',
    ] },
    { type: 'p', text: 'Il resto lo fa il vocabolario: più parole conosci, più è facile leggere senza vocali. Allenati nella sezione Lettura togliendo il nikud e con l’esame “Lettura senza nikud”.' },
    { type: 'example', he: 'סִפּוּר', translit: 'sipur', note: 'racconto: senza nikud סיפור' },
  ]),
];

/** Ultima lezione che introduce lettere: da lì l'alfabeto è completo. */
export const LAST_LETTER_LESSON = Math.max(...GLYPHS.map((g) => g.lesson));

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
