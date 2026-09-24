import { GLYPHS, GLYPH_BY_ID, CONFUSABLES, FINAL_GLYPHS, type Glyph } from '../data/alphabet';
import { VOWELS, VOWEL_BY_ID, withVowel, type Vowel } from '../data/nikud';
import { WORDS, type Word } from '../data/words';
import { normalizeTranslit } from './hebrew';
import {
  LESSON_BY_ID, glyphsUpTo, vowelsUpTo, wordsOfLesson, wordsUpTo, LAST_LESSON,
} from '../data/curriculum';

export type Rng = () => number;

/** Generatore pseudo-casuale riproducibile (per i test). */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(arr: readonly T[], rng: Rng): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pick<T>(arr: readonly T[], rng: Rng): T {
  return arr[Math.floor(rng() * arr.length)];
}

export type QuestionKind =
  | 'glyph-name' | 'glyph-sound' | 'name-glyph' | 'sound-glyph' | 'final-form' | 'listen-glyph'
  | 'vowel-sound' | 'vowel-name' | 'name-vowel'
  | 'syllable-read' | 'translit-syllable'
  | 'word-read' | 'word-meaning' | 'meaning-word' | 'word-type' | 'listen-word';

export interface Option {
  value: string;
  label: string;
  hebrew?: boolean;
}

export interface Question {
  key: string;
  kind: QuestionKind;
  /** Elementi SRS aggiornati dalla risposta. */
  itemIds: string[];
  prompt: string;
  stimulus?: { text: string; hebrew: boolean; size: 'xl' | 'lg' | 'md' };
  /** Testo ebraico da far pronunciare alla sintesi vocale. */
  speak?: string;
  /** Domanda di ascolto: lo stimolo è solo audio. */
  audioOnly?: boolean;
  options?: Option[];
  answer: string;
  /** Risposte accettate per le domande a risposta scritta. */
  accepted?: string[];
  explanation: string;
}

export interface Pool {
  glyphs: Glyph[];
  vowels: Vowel[];
  words: Word[];
}

export interface QuizOptions {
  audio?: boolean;
  typing?: boolean;
}

/* ------------------------------------------------------------------ */
/* Distrattori                                                         */
/* ------------------------------------------------------------------ */

/**
 * Sceglie `n` distrattori con etichette uniche e diverse dalla risposta,
 * prendendo prima dai candidati "preferiti" (es. lettere simili).
 */
function distractors<T>(
  correctLabel: string,
  preferred: T[],
  fallback: T[],
  label: (t: T) => string,
  n: number,
  rng: Rng,
  exclude: (t: T) => boolean = () => false,
): T[] {
  const used = new Set([correctLabel]);
  const out: T[] = [];
  for (const list of [shuffle(preferred, rng), shuffle(fallback, rng)]) {
    for (const t of list) {
      if (out.length >= n) return out;
      const l = label(t);
      if (used.has(l) || exclude(t)) continue;
      used.add(l);
      out.push(t);
    }
  }
  return out;
}

function options(correct: Option, others: Option[], rng: Rng): Option[] {
  return shuffle([correct, ...others], rng);
}

const opt = (value: string, hebrew = false): Option => ({ value, label: value, hebrew });

/* ------------------------------------------------------------------ */
/* Lettere                                                             */
/* ------------------------------------------------------------------ */

function confusablesOf(g: Glyph): Glyph[] {
  return (CONFUSABLES[g.id] ?? []).map((id) => GLYPH_BY_ID[id]);
}

function glyphQuestion(g: Glyph, kind: QuestionKind, pool: Pool, rng: Rng): Question | null {
  const conf = confusablesOf(g);
  const inPool = pool.glyphs.length >= 4 ? pool.glyphs : GLYPHS;
  const base = { key: `${kind}:${g.id}`, kind, itemIds: [`g:${g.id}`] };
  const expl = `${g.char} è ${g.name} (${g.hebrewName}): ${g.description}`;

  switch (kind) {
    case 'glyph-name': {
      const ds = distractors(g.name, conf, [...inPool, ...GLYPHS], (x) => x.name, 3, rng);
      return {
        ...base, prompt: 'Come si chiama questa lettera?',
        stimulus: { text: g.char, hebrew: true, size: 'xl' }, speak: g.hebrewName,
        options: options(opt(g.name), ds.map((d) => opt(d.name)), rng),
        answer: g.name, explanation: expl,
      };
    }
    case 'glyph-sound': {
      const ds = distractors(g.sound, conf, [...inPool, ...GLYPHS], (x) => x.sound, 3, rng);
      return {
        ...base, prompt: 'Che suono ha questa lettera?',
        stimulus: { text: g.char, hebrew: true, size: 'xl' },
        options: options(opt(g.sound), ds.map((d) => opt(d.sound)), rng),
        answer: g.sound, explanation: expl,
      };
    }
    case 'name-glyph': {
      const ds = distractors(g.char, conf, [...inPool, ...GLYPHS], (x) => x.char, 3, rng);
      return {
        ...base, prompt: `Quale di queste è la lettera «${g.name}»?`,
        options: options(opt(g.char, true), ds.map((d) => opt(d.char, true)), rng),
        answer: g.char, explanation: expl, speak: g.hebrewName,
      };
    }
    case 'sound-glyph': {
      const ds = distractors(g.char, conf, [...inPool, ...GLYPHS], (x) => x.char, 3, rng,
        (x) => x.sound === g.sound);
      return {
        ...base,
        prompt: g.sound === 'muta' ? 'Quale di queste lettere è muta?' : `Quale lettera si legge «${g.sound}»?`,
        options: options(opt(g.char, true), ds.map((d) => opt(d.char, true)), rng),
        answer: g.char, explanation: expl,
      };
    }
    case 'final-form': {
      if (g.finalForm) {
        const fin = GLYPH_BY_ID[g.finalForm];
        const ds = distractors(fin.char, [], FINAL_GLYPHS, (x) => x.char, 3, rng);
        return {
          ...base, prompt: `Qual è la forma finale (sofit) di ${g.letter}?`,
          options: options(opt(fin.char, true), ds.map((d) => opt(d.char, true)), rng),
          answer: fin.char,
          explanation: `A fine parola ${g.letter} si scrive ${fin.char} (${fin.name}).`,
        };
      }
      if (g.finalOf) {
        const normal = GLYPH_BY_ID[g.finalOf];
        const normals = FINAL_GLYPHS.map((f) => GLYPH_BY_ID[f.finalOf!]);
        const ds = distractors(normal.letter, [], normals, (x) => x.letter, 3, rng);
        return {
          ...base, prompt: `${g.char} è la forma finale di quale lettera?`,
          options: options(opt(normal.letter, true), ds.map((d) => opt(d.letter, true)), rng),
          answer: normal.letter,
          explanation: `${g.char} è la forma finale di ${normal.letter} (${g.name}).`,
        };
      }
      return null;
    }
    case 'listen-glyph': {
      const ds = distractors(g.char, conf, [...inPool, ...GLYPHS], (x) => x.char, 3, rng,
        (x) => x.hebrewName === g.hebrewName);
      return {
        ...base, prompt: 'Ascolta il nome della lettera e scegli quella giusta',
        audioOnly: true, speak: g.hebrewName,
        options: options(opt(g.char, true), ds.map((d) => opt(d.char, true)), rng),
        answer: g.char, explanation: expl,
      };
    }
    default:
      return null;
  }
}

/* ------------------------------------------------------------------ */
/* Vocali                                                              */
/* ------------------------------------------------------------------ */

const VOWEL_CARRIER = 'א';
const SOUND_LABELS = ['a', 'e', 'i', 'o', 'u', 'muta / e breve'];

export function vowelDisplay(v: Vowel, carrier = VOWEL_CARRIER): string {
  return withVowel(carrier, v);
}

function vowelQuestion(v: Vowel, kind: QuestionKind, pool: Pool, rng: Rng): Question | null {
  const base = { key: `${kind}:${v.id}`, kind, itemIds: [`v:${v.id}`] };
  const shown = vowelDisplay(v);
  const expl = `${v.name} (${v.hebrewName}): ${v.description}`;
  const inPool = pool.vowels.length >= 4 ? pool.vowels : VOWELS;

  switch (kind) {
    case 'vowel-sound': {
      const ds = distractors(v.sound, [], SOUND_LABELS, (x) => x, 3, rng);
      return {
        ...base, prompt: 'Come si legge questa vocale? (א è muta)',
        stimulus: { text: shown, hebrew: true, size: 'xl' },
        options: options(opt(v.sound), ds.map((d) => opt(d)), rng),
        answer: v.sound, explanation: expl,
      };
    }
    case 'vowel-name': {
      const ds = distractors(v.name, inPool, VOWELS, (x) => x.name, 3, rng,
        (x) => vowelDisplay(x) === shown);
      return {
        ...base, prompt: 'Come si chiama questo segno vocalico?',
        stimulus: { text: shown, hebrew: true, size: 'xl' },
        options: options(opt(v.name), ds.map((d) => opt(d.name)), rng),
        answer: v.name, explanation: expl,
      };
    }
    case 'name-vowel': {
      const ds = distractors(shown, inPool, VOWELS, (x) => vowelDisplay(x), 3, rng);
      return {
        ...base, prompt: `Quale di questi è il «${v.name}»?`,
        options: options(opt(shown, true), ds.map((d) => opt(vowelDisplay(d), true)), rng),
        answer: shown, explanation: expl,
      };
    }
    default:
      return null;
  }
}

/* ------------------------------------------------------------------ */
/* Sillabe                                                             */
/* ------------------------------------------------------------------ */

export interface Syllable {
  glyph: Glyph;
  vowel: Vowel;
  text: string;
  translit: string;
}

export function canCombine(g: Glyph, v: Vowel): boolean {
  if (g.finalOf) return false;
  if (v.group === 'Sheva' || v.id.startsWith('hataf')) return false;
  if (g.id === 'vav' && (v.group === 'O' || v.id === 'shuruk')) return false;
  if (g.id === 'yod' && v.id === 'hiriq-male') return false;
  return true;
}

export function syllable(g: Glyph, v: Vowel): Syllable {
  return { glyph: g, vowel: v, text: withVowel(g.char, v), translit: g.translit + v.translit };
}

function syllableQuestion(
  g: Glyph, v: Vowel, kind: QuestionKind, pool: Pool, rng: Rng,
): Question | null {
  if (!canCombine(g, v)) return null;
  const s = syllable(g, v);
  const consonants = (pool.glyphs.length >= 4 ? pool.glyphs : GLYPHS).filter((x) => !x.finalOf);
  const vowels = (pool.vowels.length >= 2 ? pool.vowels : VOWELS);
  const candidates: Syllable[] = [];
  const confs = confusablesOf(g).filter((x) => !x.finalOf);
  for (const c of [g, ...confs, ...consonants]) {
    for (const vv of [v, ...vowels, ...VOWELS]) {
      if ((c === g && vv === v) || !canCombine(c, vv)) continue;
      candidates.push(syllable(c, vv));
    }
  }
  const preferred = candidates.filter((c) => c.glyph === g || c.vowel === v).slice(0, 40);
  const base = {
    key: `${kind}:${g.id}+${v.id}`, kind, itemIds: [`g:${g.id}`, `v:${v.id}`],
    explanation: `${s.text} = ${g.char} (${g.name}, “${g.sound}”) + ${v.name} (“${v.sound}”) → «${s.translit}».`,
  };
  if (kind === 'syllable-read') {
    const ds = distractors(s.translit, preferred, candidates, (x) => x.translit, 3, rng);
    return {
      ...base, prompt: 'Come si legge questa sillaba?',
      stimulus: { text: s.text, hebrew: true, size: 'xl' }, speak: s.text,
      options: options(opt(s.translit), ds.map((d) => opt(d.translit)), rng),
      answer: s.translit,
    };
  }
  if (kind === 'translit-syllable') {
    const ds = distractors(s.text, preferred, candidates, (x) => x.text, 3, rng,
      (x) => x.translit === s.translit);
    return {
      ...base, prompt: `Quale sillaba si legge «${s.translit}»?`,
      options: options(opt(s.text, true), ds.map((d) => opt(d.text, true)), rng),
      answer: s.text,
    };
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Parole                                                              */
/* ------------------------------------------------------------------ */

const VOWEL_SWAPS: Record<string, string[]> = {
  a: ['e', 'o'], e: ['a', 'i'], i: ['e', 'a'], o: ['u', 'a'], u: ['o', 'i'],
};
const CONS_SWAPS: [string, string][] = [
  ['sh', 's'], ['ch', 'k'], ['ts', 'z'], ['b', 'v'], ['v', 'b'], ['k', 'ch'], ['p', 'f'], ['f', 'p'],
  ['t', 'd'], ['d', 'r'], ['r', 'd'], ['m', 'n'], ['n', 'g'], ['g', 'n'], ['l', 'r'], ['z', 's'],
];

/** Genera letture "quasi giuste" per creare distrattori plausibili. */
export function misreadings(translit: string): string[] {
  const out = new Set<string>();
  for (let i = 0; i < translit.length; i++) {
    const ch = translit[i];
    for (const r of VOWEL_SWAPS[ch] ?? []) out.add(translit.slice(0, i) + r + translit.slice(i + 1));
  }
  for (const [a, b] of CONS_SWAPS) {
    let idx = translit.indexOf(a);
    while (idx !== -1) {
      out.add(translit.slice(0, idx) + b + translit.slice(idx + a.length));
      idx = translit.indexOf(a, idx + 1);
    }
  }
  out.delete(translit);
  return [...out];
}

/** Parole per i distrattori: quelle del pool o, se sono poche, quelle delle lezioni successive più vicine. */
function nearbyWords(pool: Pool): Word[] {
  if (pool.words.length >= 6) return pool.words;
  const level = Math.max(1, ...pool.glyphs.map((g) => g.lesson));
  for (let l = level + 1; l <= LAST_LESSON; l++) {
    const ws = wordsUpTo(l);
    if (ws.length >= 6) return ws;
  }
  return WORDS;
}

function acceptedReadings(w: Word): string[] {
  return [w.translit, ...(w.alt ?? [])];
}

function wordQuestion(w: Word, kind: QuestionKind, pool: Pool, rng: Rng): Question | null {
  const base = { key: `${kind}:${w.id}`, kind, itemIds: [`w:${w.id}`] };
  const expl = `${w.he} si legge «${w.translit}» e significa «${w.it}».`;
  const others = nearbyWords(pool).filter((x) => x.id !== w.id);
  const accepted = new Set(acceptedReadings(w).map(normalizeTranslit));

  switch (kind) {
    case 'word-read': {
      const near = shuffle(misreadings(w.translit), rng).slice(0, 6);
      const similar = others.filter((x) => Math.abs(x.translit.length - w.translit.length) <= 2)
        .map((x) => x.translit);
      const ds = distractors(w.translit, near, [...similar, ...others.map((x) => x.translit)],
        (x) => x, 3, rng, (x) => accepted.has(normalizeTranslit(x)));
      return {
        ...base, prompt: 'Come si legge questa parola?',
        stimulus: { text: w.he, hebrew: true, size: 'lg' }, speak: w.he,
        options: options(opt(w.translit), ds.map((d) => opt(d)), rng),
        answer: w.translit, explanation: expl,
      };
    }
    case 'word-meaning': {
      const ds = distractors(w.it, others, WORDS, (x) => x.it, 3, rng);
      return {
        ...base, prompt: 'Che cosa significa questa parola?',
        stimulus: { text: w.he, hebrew: true, size: 'lg' }, speak: w.he,
        options: options(opt(w.it), ds.map((d) => opt(d.it)), rng),
        answer: w.it, explanation: expl,
      };
    }
    case 'meaning-word': {
      const ds = distractors(w.he, others, WORDS, (x) => x.he, 3, rng, (x) => x.it === w.it);
      return {
        ...base, prompt: `Quale parola significa «${w.it}»?`,
        options: options(opt(w.he, true), ds.map((d) => opt(d.he, true)), rng),
        answer: w.he, explanation: expl, speak: w.he,
      };
    }
    case 'word-type':
      return {
        ...base, prompt: 'Scrivi come si legge (in lettere latine)',
        stimulus: { text: w.he, hebrew: true, size: 'lg' }, speak: w.he,
        answer: w.translit, accepted: acceptedReadings(w), explanation: expl,
      };
    case 'listen-word': {
      const ds = distractors(w.he, others, WORDS, (x) => x.he, 3, rng);
      return {
        ...base, prompt: 'Ascolta e scegli la parola che senti',
        audioOnly: true, speak: w.he,
        options: options(opt(w.he, true), ds.map((d) => opt(d.he, true)), rng),
        answer: w.he, explanation: expl,
      };
    }
    default:
      return null;
  }
}

/* ------------------------------------------------------------------ */
/* Costruzione dei quiz                                                */
/* ------------------------------------------------------------------ */

const GLYPH_KINDS: QuestionKind[] = ['glyph-name', 'glyph-sound', 'name-glyph', 'sound-glyph', 'final-form', 'listen-glyph'];
const VOWEL_KINDS: QuestionKind[] = ['vowel-sound', 'vowel-name', 'name-vowel'];
const SYLLABLE_KINDS: QuestionKind[] = ['syllable-read', 'translit-syllable'];
const WORD_KINDS: QuestionKind[] = ['word-read', 'word-meaning', 'meaning-word', 'word-type', 'listen-word'];

function allowedKinds(kinds: QuestionKind[], o: QuizOptions): QuestionKind[] {
  return kinds.filter((k) => (o.audio || !k.startsWith('listen')) && (o.typing !== false || k !== 'word-type'));
}

type Category = 'glyph' | 'vowel' | 'syllable' | 'word';

export interface QuizSpec {
  focusGlyphs: Glyph[];
  focusVowels: Vowel[];
  focusWords: Word[];
  pool: Pool;
  count: number;
  categories?: Category[];
  weights?: Partial<Record<Category, number>>;
}

const DEFAULT_WEIGHTS: Record<Category, number> = { glyph: 3, vowel: 2, syllable: 2, word: 3 };

export function buildQuiz(spec: QuizSpec, rng: Rng, o: QuizOptions = {}): Question[] {
  const cats = spec.categories ?? ['glyph', 'vowel', 'syllable', 'word'];
  const weights = { ...DEFAULT_WEIGHTS, ...spec.weights };
  const sylGlyphs = (spec.focusGlyphs.length ? spec.focusGlyphs : spec.pool.glyphs).filter((g) => !g.finalOf);
  const sylVowels = (spec.focusVowels.length ? spec.focusVowels : spec.pool.vowels);
  const available: Category[] = cats.filter((c) =>
    (c === 'glyph' && spec.focusGlyphs.length) ||
    (c === 'vowel' && spec.focusVowels.length) ||
    (c === 'word' && spec.focusWords.length) ||
    (c === 'syllable' && sylGlyphs.length && sylVowels.length && spec.pool.vowels.length));
  if (!available.length) return [];

  const gk = allowedKinds(GLYPH_KINDS, o);
  const vk = allowedKinds(VOWEL_KINDS, o);
  const wk = allowedKinds(WORD_KINDS, o);
  const out: Question[] = [];
  const keys = new Set<string>();
  const totalWeight = available.reduce((s, c) => s + weights[c], 0);

  for (let attempt = 0; out.length < spec.count && attempt < spec.count * 40; attempt++) {
    let r = rng() * totalWeight;
    let cat = available[0];
    for (const c of available) { r -= weights[c]; if (r <= 0) { cat = c; break; } }

    let q: Question | null = null;
    if (cat === 'glyph') q = glyphQuestion(pick(spec.focusGlyphs, rng), pick(gk, rng), spec.pool, rng);
    else if (cat === 'vowel') q = vowelQuestion(pick(spec.focusVowels, rng), pick(vk, rng), spec.pool, rng);
    else if (cat === 'word') q = wordQuestion(pick(spec.focusWords, rng), pick(wk, rng), spec.pool, rng);
    else {
      // Almeno uno tra consonante e vocale è "in focus"; l'altro viene dal pool.
      const poolConsonants = spec.pool.glyphs.filter((x) => !x.finalOf);
      const glyphFocus = spec.focusGlyphs.length > 0 && (!spec.focusVowels.length || rng() < 0.5);
      const g = glyphFocus ? pick(sylGlyphs, rng) : pick(poolConsonants.length ? poolConsonants : sylGlyphs, rng);
      const v = glyphFocus ? pick(spec.pool.vowels, rng) : pick(sylVowels, rng);
      if (g && v) q = syllableQuestion(g, v, pick(SYLLABLE_KINDS, rng), spec.pool, rng);
    }
    if (!q || keys.has(q.key)) continue;
    if (q.options && q.options.length < 2) continue;
    keys.add(q.key);
    out.push(q);
  }
  return out;
}

export function poolUpTo(lesson: number): Pool {
  return { glyphs: glyphsUpTo(lesson), vowels: vowelsUpTo(lesson), words: wordsUpTo(lesson) };
}

/** Esercizi o test di una lezione: soprattutto elementi nuovi, più un po' di ripasso. */
export function buildLessonQuiz(lessonId: number, count: number, rng: Rng, o: QuizOptions = {}): Question[] {
  const lesson = LESSON_BY_ID[lessonId];
  const pool = poolUpTo(lessonId);
  const newWords = wordsOfLesson(lessonId);
  const focusGlyphs = lesson.glyphs.map((id) => GLYPH_BY_ID[id]);
  const focusVowels = lesson.vowels.map((id) => VOWEL_BY_ID[id]);
  const reviewShare = lessonId === 1 ? 0 : Math.round(count * 0.3);

  const main = buildQuiz({
    focusGlyphs,
    focusVowels,
    focusWords: newWords.length >= 3 ? newWords : pool.words,
    pool,
    count: count - reviewShare,
    weights: lessonId === LAST_LESSON ? { word: 6, syllable: 2 } : undefined,
  }, rng, o);

  const review = reviewShare ? buildQuiz({
    focusGlyphs: pool.glyphs, focusVowels: pool.vowels, focusWords: pool.words, pool, count: reviewShare * 2,
  }, rng, o).filter((q) => !main.some((m) => m.key === q.key)) : [];

  const all = [...main, ...review];
  // se la lezione ha pochi elementi, completa con il ripasso
  return shuffle(all.slice(0, count), rng);
}

export interface ExamDef {
  id: string;
  title: string;
  description: string;
  count: number;
  /** Limite di tempo in minuti (facoltativo). */
  minutes?: number;
  /** Lezione da completare per sbloccare l'esame. */
  requires: number;
  build: (rng: Rng, o: QuizOptions) => Question[];
}

const FULL_POOL: Pool = { glyphs: GLYPHS, vowels: VOWELS, words: WORDS };

export const EXAMS: ExamDef[] = [
  {
    id: 'alfabeto', title: 'Esame: alfabeto', count: 30, requires: 9,
    description: 'Tutte le 22 lettere, le varianti con dagesh e le 5 forme finali.',
    build: (rng, o) => buildQuiz({ focusGlyphs: GLYPHS, focusVowels: [], focusWords: [], pool: FULL_POOL, count: 30, categories: ['glyph'] }, rng, o),
  },
  {
    id: 'nikud', title: 'Esame: nikud', count: 25, requires: 7,
    description: 'Riconoscere i segni vocalici e leggere le sillabe.',
    build: (rng, o) => buildQuiz({ focusGlyphs: [], focusVowels: VOWELS, focusWords: [], pool: FULL_POOL, count: 25, categories: ['vowel', 'syllable'], weights: { vowel: 2, syllable: 3 } }, rng, o),
  },
  {
    id: 'lettura', title: 'Esame: lettura', count: 25, requires: 9,
    description: 'Leggere parole vocalizzate e riconoscerne il significato.',
    build: (rng, o) => buildQuiz({ focusGlyphs: [], focusVowels: [], focusWords: WORDS, pool: FULL_POOL, count: 25, categories: ['word', 'syllable'], weights: { word: 5, syllable: 1 } }, rng, o),
  },
  {
    id: 'finale', title: 'Esame finale', count: 40, minutes: 20, requires: 10,
    description: 'Prova completa a tempo: lettere, vocali, sillabe e parole. Soglia di superamento 80%.',
    build: (rng, o) => buildQuiz({ focusGlyphs: GLYPHS, focusVowels: VOWELS, focusWords: WORDS, pool: FULL_POOL, count: 40 }, rng, o),
  },
];

/** Una domanda per ciascun elemento da ripassare. */
export function buildReview(itemIds: string[], maxLesson: number, rng: Rng, o: QuizOptions = {}): Question[] {
  const pool = poolUpTo(maxLesson);
  const out: Question[] = [];
  for (const id of itemIds) {
    const [type, key] = [id.slice(0, 1), id.slice(2)];
    let q: Question | null = null;
    for (let attempt = 0; !q && attempt < 8; attempt++) {
      if (type === 'g' && GLYPH_BY_ID[key]) q = glyphQuestion(GLYPH_BY_ID[key], pick(allowedKinds(GLYPH_KINDS, o), rng), pool, rng);
      else if (type === 'v' && VOWEL_BY_ID[key]) {
        const v = VOWEL_BY_ID[key];
        const consonants = pool.glyphs.filter((g) => canCombine(g, v));
        q = rng() < 0.4 && consonants.length
          ? syllableQuestion(pick(consonants, rng), v, pick(SYLLABLE_KINDS, rng), pool, rng)
          : vowelQuestion(v, pick(VOWEL_KINDS, rng), pool, rng);
      } else if (type === 'w') {
        const w = WORDS.find((x) => x.id === key);
        if (w) q = wordQuestion(w, pick(allowedKinds(WORD_KINDS, o), rng), pool, rng);
        else break;
      } else break;
    }
    if (q) out.push({ ...q, itemIds: [id] });
  }
  return shuffle(out, rng);
}

export function gradeLabel(pct: number): { label: string; tone: 'ok' | 'warn' | 'bad' } {
  if (pct >= 90) return { label: 'Eccellente', tone: 'ok' };
  if (pct >= 80) return { label: 'Superato', tone: 'ok' };
  if (pct >= 60) return { label: 'Quasi: ripassa e riprova', tone: 'warn' };
  return { label: 'Da ripassare', tone: 'bad' };
}

export const PASS_THRESHOLD = 80;
