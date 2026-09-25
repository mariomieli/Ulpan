import { GLYPHS, GLYPH_BY_ID, CONFUSABLES, FINAL_GLYPHS, type Glyph } from '../data/alphabet';
import { VOWELS, VOWEL_BY_ID, withVowel, type Vowel } from '../data/nikud';
import { WORDS, type Word } from '../data/words';
import { clusters, normalizeTranslit } from './hebrew';
import { MARKS } from '../data/nikud';
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
  | 'word-read' | 'word-meaning' | 'meaning-word' | 'word-type' | 'listen-word' | 'word-compose';

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
  /** Dettato: tessere (lettera + segni) da mettere in ordine; la risposta è la loro concatenazione. */
  compose?: { tiles: string[] };
  /** Risposte accettate per le domande a risposta scritta. */
  accepted?: string[];
  explanation: string;
}

export interface Pool {
  glyphs: Glyph[];
  vowels: Vowel[];
  words: Word[];
  /** Voce ebraica disponibile: il dettato si fa ad ascolto. */
  listening?: boolean;
}

export interface QuizOptions {
  audio?: boolean;
  typing?: boolean;
  /** Domande viste di recente: si evitano finché ce ne sono altre disponibili. */
  avoid?: ReadonlySet<string>;
}

/** Restituisce gli elementi di una lista a turno, in ordine casuale, prima di ripeterli. */
function rotation<T>(items: readonly T[], rng: Rng): () => T {
  let queue: T[] = [];
  return () => {
    if (!queue.length) queue = shuffle(items, rng);
    return queue.pop()!;
  };
}

/**
 * Riordina le domande perché due domande consecutive non riguardino
 * lo stesso elemento e, se possibile, non siano dello stesso tipo.
 */
export function spread(questions: Question[]): Question[] {
  const rest = [...questions];
  const out: Question[] = [];
  while (rest.length) {
    const prev = out[out.length - 1];
    const sameItem = (q: Question) => !!prev && q.itemIds.some((id) => prev.itemIds.includes(id));
    let i = rest.findIndex((q) => !sameItem(q) && q.kind !== prev?.kind);
    if (i < 0) i = rest.findIndex((q) => !sameItem(q));
    if (i < 0) i = 0;
    out.push(rest.splice(i, 1)[0]);
  }
  // Se in fondo sono rimaste due domande sullo stesso elemento, sposta la seconda dove non disturba
  const clash = (a?: Question, b?: Question) => !!a && !!b && a.itemIds.some((id) => b.itemIds.includes(id));
  for (let i = 1; i < out.length; i++) {
    if (!clash(out[i - 1], out[i])) continue;
    const [q] = out.splice(i, 1);
    const j = [...Array(out.length + 1).keys()].find((k) => !clash(out[k - 1], q) && !clash(q, out[k]));
    out.splice(j ?? i, 0, q);
  }
  return out;
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

/** Più modi di porre la stessa domanda, per non leggere sempre la stessa frase. */
const say = (rng: Rng, ...variants: string[]) => pick(variants, rng);

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
        ...base, prompt: say(rng, 'Come si chiama questa lettera?', 'Qual è il nome di questa lettera?', 'Riconosci questa lettera?'),
        stimulus: { text: g.char, hebrew: true, size: 'xl' }, speak: g.hebrewName,
        options: options(opt(g.name), ds.map((d) => opt(d.name)), rng),
        answer: g.name, explanation: expl,
      };
    }
    case 'glyph-sound': {
      const ds = distractors(g.sound, conf, [...inPool, ...GLYPHS], (x) => x.sound, 3, rng);
      return {
        ...base, prompt: say(rng, 'Che suono ha questa lettera?', 'Come si pronuncia questa lettera?', 'Quale suono rappresenta?'),
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
        ...base, prompt: say(rng, 'Come si legge questa vocale? (א è muta)', 'Che suono dà questo segno? (א è muta)', 'Leggi questa vocale (א è muta)'),
        stimulus: { text: shown, hebrew: true, size: 'xl' },
        options: options(opt(v.sound), ds.map((d) => opt(d)), rng),
        answer: v.sound, explanation: expl,
      };
    }
    case 'vowel-name': {
      const ds = distractors(v.name, inPool, VOWELS, (x) => x.name, 3, rng,
        (x) => vowelDisplay(x) === shown);
      return {
        ...base, prompt: say(rng, 'Come si chiama questo segno vocalico?', 'Qual è il nome di questo segno?'),
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
      ...base, prompt: say(rng, 'Come si legge questa sillaba?', 'Leggi questa sillaba:', 'Qual è la pronuncia giusta?'),
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

/** Divide una parola in tessere: ogni lettera con i suoi segni. */
export function graphemes(he: string): string[] {
  return clusters(he).map((c) => c.letter + c.marks.join(''));
}

const VOWEL_MARKS = [MARKS.QAMATS, MARKS.PATAH, MARKS.TSERE, MARKS.SEGOL, MARKS.HIRIQ, MARKS.HOLAM, MARKS.QUBUTS, MARKS.SHEVA];
const MARK_SOUND: Record<string, string> = {
  [MARKS.QAMATS]: 'a', [MARKS.PATAH]: 'a', [MARKS.TSERE]: 'e', [MARKS.SEGOL]: 'e',
  [MARKS.HIRIQ]: 'i', [MARKS.HOLAM]: 'o', [MARKS.QUBUTS]: 'u', [MARKS.SHEVA]: '',
};
const LETTER_SWAPS: Record<string, string[]> = {
  'ב': ['כ', 'פ'], 'כ': ['ב', 'פ'], 'פ': ['ב', 'כ'], 'ד': ['ר'], 'ר': ['ד'], 'ה': ['ח', 'ת'], 'ח': ['ה', 'ת'],
  'ת': ['ח', 'ה'], 'ו': ['ז', 'י'], 'ז': ['ו'], 'י': ['ו'], 'ג': ['נ'], 'נ': ['ג'], 'ט': ['מ'], 'מ': ['ט'],
  'ס': ['ם'], 'ם': ['ס'], 'ע': ['צ', 'א'], 'צ': ['ע'], 'א': ['ע'], 'ש': ['ס'], 'ק': ['כ'], 'ל': ['ר'],
  'ן': ['ו'], 'ך': ['ד', 'ן'], 'ף': ['ך'], 'ץ': ['ן'],
};

/** Tessere "trappola" plausibili: vocale di suono diverso o lettera simile. */
export function trapTiles(tiles: string[], n: number, rng: Rng): string[] {
  const out = new Set<string>();
  const real = new Set(tiles);
  for (let attempt = 0; out.size < n && attempt < 60; attempt++) {
    const t = pick(tiles, rng);
    const [letter, ...marks] = [...t];
    let variant: string | null = null;
    const vIdx = marks.findIndex((m) => VOWEL_MARKS.includes(m as never));
    if (vIdx >= 0 && rng() < 0.6) {
      const others = VOWEL_MARKS.filter((m) => MARK_SOUND[m] !== MARK_SOUND[marks[vIdx]]);
      const copy = [...marks];
      copy[vIdx] = pick(others, rng);
      variant = letter + copy.join('');
    } else if (LETTER_SWAPS[letter]) {
      const l = pick(LETTER_SWAPS[letter], rng);
      const keep = marks.filter((m) => m !== MARKS.SHIN_DOT && m !== MARKS.SIN_DOT);
      variant = l + keep.join('');
    }
    if (variant && !real.has(variant)) out.add(variant);
  }
  return [...out];
}

export function canCompose(w: Word): boolean {
  const g = graphemes(w.he);
  return g.length >= 2 && g.length <= 7 && !/\s/.test(w.he);
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
        ...base, prompt: say(rng, 'Come si legge questa parola?', 'Leggi la parola: quale pronuncia è giusta?', 'Qual è la lettura corretta?'),
        stimulus: { text: w.he, hebrew: true, size: 'lg' }, speak: w.he,
        options: options(opt(w.translit), ds.map((d) => opt(d)), rng),
        answer: w.translit, explanation: expl,
      };
    }
    case 'word-meaning': {
      const ds = distractors(w.it, others, WORDS, (x) => x.it, 3, rng);
      return {
        ...base, prompt: say(rng, 'Che cosa significa questa parola?', 'Qual è il significato?', 'Leggi e scegli la traduzione'),
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
        ...base, prompt: say(rng, 'Scrivi come si legge (in lettere latine)', 'Come si pronuncia? Scrivilo in lettere latine', 'Leggi e scrivi la pronuncia'),
        stimulus: { text: w.he, hebrew: true, size: 'lg' }, speak: w.he,
        answer: w.translit, accepted: acceptedReadings(w), explanation: expl,
      };
    case 'word-compose': {
      if (!canCompose(w)) return null;
      const tiles = graphemes(w.he);
      const traps = trapTiles(tiles, Math.min(3, Math.max(2, 8 - tiles.length)), rng);
      return {
        ...base,
        prompt: pool.listening
          ? `Ascolta e componi la parola (significa «${w.it}»)`
          : `Componi la parola «${w.translit}» (${w.it})`,
        audioOnly: pool.listening, speak: w.he,
        compose: { tiles: shuffle([...tiles, ...traps], rng) },
        answer: tiles.join(''), explanation: expl,
      };
    }
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
const WORD_KINDS: QuestionKind[] = ['word-read', 'word-meaning', 'meaning-word', 'word-type', 'listen-word', 'word-compose'];

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
  /** Limita i tipi di domanda (es. solo dettato). */
  kinds?: QuestionKind[];
}

const DEFAULT_WEIGHTS: Record<Category, number> = { glyph: 3, vowel: 2, syllable: 2, word: 3 };

export function buildQuiz(spec: QuizSpec, rng: Rng, o: QuizOptions = {}): Question[] {
  const cats = spec.categories ?? ['glyph', 'vowel', 'syllable', 'word'];
  const weights = { ...DEFAULT_WEIGHTS, ...spec.weights };
  const sylGlyphs = (spec.focusGlyphs.length ? spec.focusGlyphs : spec.pool.glyphs).filter((g) => !g.finalOf);
  const sylVowels = (spec.focusVowels.length ? spec.focusVowels : spec.pool.vowels);
  const kindsFor = (c: Category) => (spec.kinds ? spec.kinds.some((k) => ({
    glyph: GLYPH_KINDS, vowel: VOWEL_KINDS, syllable: SYLLABLE_KINDS, word: WORD_KINDS,
  })[c].includes(k)) : true);
  const available: Category[] = cats.filter(kindsFor).filter((c) =>
    (c === 'glyph' && spec.focusGlyphs.length) ||
    (c === 'vowel' && spec.focusVowels.length) ||
    (c === 'word' && spec.focusWords.length) ||
    (c === 'syllable' && sylGlyphs.length && sylVowels.length && spec.pool.vowels.length));
  if (!available.length) return [];

  const only = (ks: QuestionKind[]) => (spec.kinds ? ks.filter((k) => spec.kinds!.includes(k)) : ks);
  const gk = only(allowedKinds(GLYPH_KINDS, o));
  const vk = only(allowedKinds(VOWEL_KINDS, o));
  const wk = only(allowedKinds(WORD_KINDS, o));
  const out: Question[] = [];
  const keys = new Set<string>();
  const usedItems = new Set<string>();
  const totalWeight = available.reduce((s, c) => s + weights[c], 0);
  const nextGlyph = spec.focusGlyphs.length ? rotation(spec.focusGlyphs, rng) : null;
  const nextVowel = spec.focusVowels.length ? rotation(spec.focusVowels, rng) : null;
  const nextWord = spec.focusWords.length ? rotation(spec.focusWords, rng) : null;
  const nextSylGlyph = sylGlyphs.length ? rotation(sylGlyphs, rng) : null;
  const nextSylVowel = sylVowels.length ? rotation(sylVowels, rng) : null;
  const budget = spec.count * 40;

  for (let attempt = 0; out.length < spec.count && attempt < budget; attempt++) {
    // Più si fatica a trovare domande nuove, più si allentano i vincoli anti-ripetizione
    const strict = attempt < budget / 2;
    const veryStrict = attempt < budget / 4;
    let r = rng() * totalWeight;
    let cat = available[0];
    for (const c of available) { r -= weights[c]; if (r <= 0) { cat = c; break; } }

    let q: Question | null = null;
    if (cat === 'glyph') q = glyphQuestion(nextGlyph!(), pick(gk, rng), spec.pool, rng);
    else if (cat === 'vowel') q = vowelQuestion(nextVowel!(), pick(vk, rng), spec.pool, rng);
    else if (cat === 'word') q = wordQuestion(nextWord!(), pick(wk, rng), { ...spec.pool, listening: !!o.audio }, rng);
    else {
      // Almeno uno tra consonante e vocale è "in focus"; l'altro viene dal pool.
      const poolConsonants = spec.pool.glyphs.filter((x) => !x.finalOf);
      const glyphFocus = spec.focusGlyphs.length > 0 && (!spec.focusVowels.length || rng() < 0.5);
      const g = glyphFocus ? nextSylGlyph!() : pick(poolConsonants.length ? poolConsonants : sylGlyphs, rng);
      const v = glyphFocus ? pick(spec.pool.vowels, rng) : nextSylVowel!();
      if (g && v) q = syllableQuestion(g, v, pick(SYLLABLE_KINDS, rng), spec.pool, rng);
    }
    if (!q || keys.has(q.key)) continue;
    if (q.options && q.options.length < 2) continue;
    if (veryStrict && o.avoid?.has(q.key)) continue;
    if (strict && q.itemIds.some((id) => usedItems.has(id))) continue;
    keys.add(q.key);
    q.itemIds.forEach((id) => usedItems.add(id));
    out.push(q);
  }
  return spread(out);
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

  // ripasso: elementi diversi da quelli già usati negli esercizi principali, se possibile
  const mainItems = new Set(main.flatMap((q) => q.itemIds));
  const reviewAll = reviewShare ? buildQuiz({
    focusGlyphs: pool.glyphs, focusVowels: pool.vowels, focusWords: pool.words, pool, count: reviewShare * 3,
  }, rng, o).filter((q) => !main.some((m) => m.key === q.key)) : [];
  const fresh = reviewAll.filter((q) => !q.itemIds.some((id) => mainItems.has(id)));
  const review = [...fresh, ...reviewAll.filter((q) => !fresh.includes(q))];

  const all = [...main, ...review];
  // se la lezione ha pochi elementi, completa con il ripasso
  return spread(shuffle(all.slice(0, count), rng));
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
    // una domanda già vista di recente si usa solo se non se ne trova un'altra
    let fallback: Question | null = null;
    for (let attempt = 0; !q && attempt < 12; attempt++) {
      if (type === 'g' && GLYPH_BY_ID[key]) q = glyphQuestion(GLYPH_BY_ID[key], pick(allowedKinds(GLYPH_KINDS, o), rng), pool, rng);
      else if (type === 'v' && VOWEL_BY_ID[key]) {
        const v = VOWEL_BY_ID[key];
        const consonants = pool.glyphs.filter((g) => canCombine(g, v));
        q = rng() < 0.4 && consonants.length
          ? syllableQuestion(pick(consonants, rng), v, pick(SYLLABLE_KINDS, rng), pool, rng)
          : vowelQuestion(v, pick(VOWEL_KINDS, rng), pool, rng);
      } else if (type === 'w') {
        const w = WORDS.find((x) => x.id === key);
        if (w) q = wordQuestion(w, pick(allowedKinds(WORD_KINDS, o), rng), { ...pool, listening: !!o.audio }, rng);
        else break;
      } else break;
      if (q && o.avoid?.has(q.key) && attempt < 11) { fallback ??= q; q = null; }
    }
    q ??= fallback;
    if (q) out.push({ ...q, itemIds: [id] });
  }
  return spread(shuffle(out, rng));
}

/** Dettato: componi le parole con le tessere. */
export function buildDictation(level: number, count: number, rng: Rng, o: QuizOptions = {}): Question[] {
  const pool = poolUpTo(level);
  const words = pool.words.filter(canCompose);
  return buildQuiz({
    focusGlyphs: [], focusVowels: [], focusWords: words.length ? words : WORDS.filter(canCompose),
    pool, count, categories: ['word'], kinds: ['word-compose'],
  }, rng, o);
}

export function gradeLabel(pct: number): { label: string; tone: 'ok' | 'warn' | 'bad' } {
  if (pct >= 90) return { label: 'Eccellente', tone: 'ok' };
  if (pct >= 80) return { label: 'Superato', tone: 'ok' };
  if (pct >= 60) return { label: 'Quasi: ripassa e riprova', tone: 'warn' };
  return { label: 'Da ripassare', tone: 'bad' };
}

export const PASS_THRESHOLD = 80;
