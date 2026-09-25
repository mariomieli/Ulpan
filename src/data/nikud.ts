/**
 * Nikud: i segni vocalici. La pronuncia è quella dell'ebraico israeliano moderno,
 * in cui diversi segni si leggono allo stesso modo (es. kamatz e patach = "a").
 */
export type VowelGroup = 'A' | 'E' | 'I' | 'O' | 'U' | 'Sheva';

export interface Vowel {
  id: string;
  /** Il segno (carattere combinante Unicode). */
  mark: string;
  /** Lettera che segue il segno nelle forme "piene" (י o ו). */
  mater?: 'י' | 'ו';
  /** Per le forme piene con ו il segno sta sulla vav, non sulla consonante. */
  onMater?: boolean;
  name: string;
  hebrewName: string;
  /** Etichetta del suono usata nelle risposte. */
  sound: string;
  /** Traslitterazione nella composizione delle sillabe. */
  translit: string;
  group: VowelGroup;
  lesson: number;
  description: string;
}

export const MARKS = {
  SHEVA: 'ְ',
  HATAF_SEGOL: 'ֱ',
  HATAF_PATAH: 'ֲ',
  HATAF_QAMATS: 'ֳ',
  HIRIQ: 'ִ',
  TSERE: 'ֵ',
  SEGOL: 'ֶ',
  PATAH: 'ַ',
  QAMATS: 'ָ',
  HOLAM: 'ֹ',
  HOLAM_VAV: 'ֺ',
  QUBUTS: 'ֻ',
  DAGESH: 'ּ',
  SHIN_DOT: 'ׁ',
  SIN_DOT: 'ׂ',
  QAMATS_QATAN: 'ׇ',
} as const;

export const VOWELS: Vowel[] = [
  {
    id: 'kamatz', mark: MARKS.QAMATS, name: 'Kamatz', hebrewName: 'קָמַץ',
    sound: 'a', translit: 'a', group: 'A', lesson: 1,
    description: 'Una piccola “T” sotto la lettera. Si legge “a” come in “casa”.',
  },
  {
    id: 'patach', mark: MARKS.PATAH, name: 'Patach', hebrewName: 'פַּתַח',
    sound: 'a', translit: 'a', group: 'A', lesson: 1,
    description: 'Una lineetta orizzontale sotto la lettera. Anche questa si legge “a”.',
  },
  {
    id: 'hiriq', mark: MARKS.HIRIQ, name: 'Chirik', hebrewName: 'חִירִיק',
    sound: 'i', translit: 'i', group: 'I', lesson: 2,
    description: 'Un punto sotto la lettera: si legge “i”.',
  },
  {
    id: 'hiriq-male', mark: MARKS.HIRIQ, mater: 'י', name: 'Chirik malè', hebrewName: 'חִירִיק מָלֵא',
    sound: 'i', translit: 'i', group: 'I', lesson: 2,
    description: 'Il punto sotto la lettera seguito da una י muta: “i” (forma “piena”).',
  },
  {
    id: 'holam', mark: MARKS.HOLAM, name: 'Cholam', hebrewName: 'חוֹלָם',
    sound: 'o', translit: 'o', group: 'O', lesson: 2,
    description: 'Un punto in alto a sinistra della lettera: si legge “o”.',
  },
  {
    id: 'holam-male', mark: MARKS.HOLAM, mater: 'ו', onMater: true, name: 'Cholam malè', hebrewName: 'חוֹלָם מָלֵא',
    sound: 'o', translit: 'o', group: 'O', lesson: 2,
    description: 'Una ו con un punto sopra (וֹ) dopo la consonante: si legge “o”.',
  },
  {
    id: 'tsere', mark: MARKS.TSERE, name: 'Tsere', hebrewName: 'צֵירֵי',
    sound: 'e', translit: 'e', group: 'E', lesson: 1,
    description: 'Due punti affiancati sotto la lettera: si legge “e”.',
  },
  {
    id: 'tsere-male', mark: MARKS.TSERE, mater: 'י', name: 'Tsere malè', hebrewName: 'צֵירֵי מָלֵא',
    sound: 'e', translit: 'ei', group: 'E', lesson: 1,
    description: 'Tsere seguito da una י: si legge “ei” (בֵּית “beit”, אֵין “ein”); in alcune parole semplicemente “e”.',
  },
  {
    id: 'segol', mark: MARKS.SEGOL, name: 'Segol', hebrewName: 'סֶגּוֹל',
    sound: 'e', translit: 'e', group: 'E', lesson: 1,
    description: 'Tre punti a triangolo sotto la lettera: si legge “e”.',
  },
  {
    id: 'kubutz', mark: MARKS.QUBUTS, name: 'Kubutz', hebrewName: 'קֻבּוּץ',
    sound: 'u', translit: 'u', group: 'U', lesson: 2,
    description: 'Tre punti in diagonale sotto la lettera: si legge “u”.',
  },
  {
    id: 'shuruk', mark: MARKS.DAGESH, mater: 'ו', onMater: true, name: 'Shuruk', hebrewName: 'שׁוּרוּק',
    sound: 'u', translit: 'u', group: 'U', lesson: 2,
    description: 'Una ו con un punto a sinistra (וּ) dopo la consonante: si legge “u”.',
  },
  {
    id: 'sheva', mark: MARKS.SHEVA, name: 'Sheva', hebrewName: 'שְׁוָא',
    sound: 'muta / e breve', translit: 'e', group: 'Sheva', lesson: 3,
    description: 'Due punti verticali sotto la lettera. Di solito non si pronuncia; a inizio parola può suonare come una “e” brevissima.',
  },
  {
    id: 'hataf-patach', mark: MARKS.HATAF_PATAH, name: 'Chataf patach', hebrewName: 'חֲטַף פַּתַח',
    sound: 'a', translit: 'a', group: 'A', lesson: 3,
    description: 'Sheva + patach: una “a” breve. Compare soprattutto sotto א ה ח ע.',
  },
  {
    id: 'hataf-segol', mark: MARKS.HATAF_SEGOL, name: 'Chataf segol', hebrewName: 'חֲטַף סֶגּוֹל',
    sound: 'e', translit: 'e', group: 'E', lesson: 3,
    description: 'Sheva + segol: una “e” breve, sotto le lettere gutturali.',
  },
  {
    id: 'hataf-kamatz', mark: MARKS.HATAF_QAMATS, name: 'Chataf kamatz', hebrewName: 'חֲטַף קָמַץ',
    sound: 'o', translit: 'o', group: 'O', lesson: 3,
    description: 'Sheva + kamatz: una “o” breve, sotto le lettere gutturali.',
  },
];

export const VOWEL_BY_ID: Record<string, Vowel> = Object.fromEntries(VOWELS.map((v) => [v.id, v]));

export const VOWEL_GROUP_LABELS: Record<VowelGroup, string> = {
  A: 'Suono “a”',
  E: 'Suono “e”',
  I: 'Suono “i”',
  O: 'Suono “o”',
  U: 'Suono “u”',
  Sheva: 'Sheva (muto)',
};

/** Compone una sillaba: consonante (già con eventuale dagesh/punto) + vocale. */
export function withVowel(consonant: string, vowel: Vowel): string {
  if (vowel.onMater) return consonant + (vowel.mater ?? '') + vowel.mark;
  return consonant + vowel.mark + (vowel.mater ?? '');
}
