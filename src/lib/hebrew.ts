import { MARKS } from '../data/nikud';

const LETTER_RE = /[א-ת]/;
const MARK_RE = /[֑-ׇ]/;

const LETTER_TO_GLYPH: Record<string, string> = {
  'א': 'alef', 'ג': 'gimel', 'ד': 'dalet', 'ה': 'he', 'ו': 'vav', 'ז': 'zayin',
  'ח': 'chet', 'ט': 'tet', 'י': 'yod', 'ך': 'khaf-sofit', 'ל': 'lamed', 'מ': 'mem',
  'ם': 'mem-sofit', 'נ': 'nun', 'ן': 'nun-sofit', 'ס': 'samekh', 'ע': 'ayin',
  'ף': 'fe-sofit', 'צ': 'tsadi', 'ץ': 'tsadi-sofit', 'ק': 'kuf', 'ר': 'resh', 'ת': 'tav',
};

const MARK_TO_VOWEL: Record<string, string> = {
  [MARKS.QAMATS]: 'kamatz',
  [MARKS.QAMATS_QATAN]: 'kamatz',
  [MARKS.PATAH]: 'patach',
  [MARKS.HIRIQ]: 'hiriq',
  [MARKS.TSERE]: 'tsere',
  [MARKS.SEGOL]: 'segol',
  [MARKS.HOLAM]: 'holam',
  [MARKS.HOLAM_VAV]: 'holam',
  [MARKS.QUBUTS]: 'kubutz',
  [MARKS.SHEVA]: 'sheva',
  [MARKS.HATAF_PATAH]: 'hataf-patach',
  [MARKS.HATAF_SEGOL]: 'hataf-segol',
  [MARKS.HATAF_QAMATS]: 'hataf-kamatz',
};

export interface Cluster {
  letter: string;
  marks: string[];
}

/** Divide un testo in "cluster": una lettera con i segni che la accompagnano. */
export function clusters(text: string): Cluster[] {
  const out: Cluster[] = [];
  for (const ch of text) {
    if (LETTER_RE.test(ch)) out.push({ letter: ch, marks: [] });
    else if (MARK_RE.test(ch) && out.length) out[out.length - 1].marks.push(ch);
  }
  return out;
}

export function glyphOf(c: Cluster): string | undefined {
  const dagesh = c.marks.includes(MARKS.DAGESH);
  switch (c.letter) {
    case 'ב': return dagesh ? 'bet' : 'vet';
    case 'כ': return dagesh ? 'kaf' : 'khaf';
    case 'פ': return dagesh ? 'pe' : 'fe';
    case 'ש': return c.marks.includes(MARKS.SIN_DOT) ? 'sin' : 'shin';
    default: return LETTER_TO_GLYPH[c.letter];
  }
}

export interface Requirements {
  glyphs: Set<string>;
  vowels: Set<string>;
}

/** Quali lettere e quali vocali servono per leggere un testo. */
export function requirements(text: string): Requirements {
  const glyphs = new Set<string>();
  const vowels = new Set<string>();
  const cs = clusters(text);
  cs.forEach((c, i) => {
    const prev = cs[i - 1];
    const prevVowel = !!prev && prev.marks.some((m) => MARK_TO_VOWEL[m] && m !== MARKS.SHEVA);
    let hasVowel = false;
    for (const m of c.marks) {
      const v = MARK_TO_VOWEL[m];
      if (v) { vowels.add(v); hasVowel = true; }
    }
    // Vav con dagesh e senza altre vocali = shuruk (וּ)
    const shuruk = c.letter === 'ו' && c.marks.includes(MARKS.DAGESH) && !hasVowel;
    if (shuruk) vowels.add('shuruk');
    // Lettere che fanno da vocale (matres lectionis) non contano come lettere da conoscere:
    // וּ shuruk, וֹ cholam malè, י muta dopo chirik/tsere/segol (אִי, אֵי)
    const holamMale = c.letter === 'ו' && c.marks.length === 1 && c.marks[0] === MARKS.HOLAM && !prevVowel;
    const yodMater = c.letter === 'י' && c.marks.length === 0 && !!prev
      && [MARKS.HIRIQ, MARKS.TSERE, MARKS.SEGOL].some((m) => prev.marks.includes(m));
    if ((shuruk && !prevVowel) || holamMale || yodMater) return;
    const g = glyphOf(c);
    if (g) glyphs.add(g);
  });
  return { glyphs, vowels };
}

export function stripNikud(text: string): string {
  return text.replace(/[֑-ׇ]/g, '');
}

export function isHebrew(text: string): boolean {
  return /[֐-׿]/.test(text);
}

/**
 * Normalizza una traslitterazione per confrontare le risposte scritte:
 * ignora maiuscole, accenti, apostrofi, doppie e grafie alternative (kh/ch, tz/ts).
 */
export function normalizeTranslit(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z]/g, '')
    .replace(/kh/g, 'ch')
    .replace(/x/g, 'ch')
    .replace(/tz/g, 'ts')
    // c, q e k valgono uguale (kelev = celev), ma "ch" resta il suono gutturale
    .replace(/ch/g, '#')
    .replace(/[cq]/g, 'k')
    .replace(/#/g, 'ch')
    // y e i hanno lo stesso suono per un italiano (yeled = ieled); "yi"/"iy" diventano "ii" → "i"
    .replace(/y/g, 'i')
    .replace(/(.)\1+/g, '$1')
    .replace(/([aeiou])h$/, '$1');
}

export function translitMatches(input: string, accepted: string[]): boolean {
  const n = normalizeTranslit(input);
  return n.length > 0 && accepted.some((a) => normalizeTranslit(a) === n);
}
