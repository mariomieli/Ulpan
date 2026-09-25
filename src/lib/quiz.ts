import { GLYPHS, GLYPH_BY_ID, CONFUSABLES, FINAL_GLYPHS, type Glyph } from '../data/alphabet';
import { VOWELS, VOWEL_BY_ID, withVowel, type Vowel } from '../data/nikud';
import { WORDS, type Word } from '../data/words';
import { clusters, normalizeTranslit } from './hebrew';
import { MARKS } from '../data/nikud';
import { ktivMale } from './ktiv';
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
  /** Lettera/vocale in gioco, per spiegare l'errore specifico. */
  meta?: { glyph?: string; vowel?: string };
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
  // Solo lettere già studiate come alternative: niente segni sconosciuti tra le risposte
  const inPool = pool.glyphs.length ? pool.glyphs : GLYPHS;
  const known = new Set(inPool.map((x) => x.id));
  const conf = confusablesOf(g).filter((x) => known.has(x.id));
  const base = { key: `${kind}:${g.id}`, kind, itemIds: [`g:${g.id}`], meta: { glyph: g.id } };
  const expl = `${g.char} è ${g.name} (${g.hebrewName}): ${g.description}`;

  switch (kind) {
    case 'glyph-name': {
      const ds = distractors(g.name, conf, inPool, (x) => x.name, 3, rng);
      return {
        ...base, prompt: say(rng, 'Come si chiama questa lettera?', 'Qual è il nome di questa lettera?', 'Riconosci questa lettera?'),
        stimulus: { text: g.char, hebrew: true, size: 'xl' }, speak: g.hebrewName,
        options: options(opt(g.name), ds.map((d) => opt(d.name)), rng),
        answer: g.name, explanation: expl,
      };
    }
    case 'glyph-sound': {
      const ds = distractors(g.sound, conf, inPool, (x) => x.sound, 3, rng);
      return {
        ...base, prompt: say(rng, 'Che suono ha questa lettera?', 'Come si pronuncia questa lettera?', 'Quale suono rappresenta?'),
        stimulus: { text: g.char, hebrew: true, size: 'xl' },
        options: options(opt(g.sound), ds.map((d) => opt(d.sound)), rng),
        answer: g.sound, explanation: expl,
      };
    }
    case 'name-glyph': {
      const ds = distractors(g.char, conf, inPool, (x) => x.char, 3, rng);
      return {
        ...base, prompt: `Quale di queste è la lettera «${g.name}»?`,
        options: options(opt(g.char, true), ds.map((d) => opt(d.char, true)), rng),
        answer: g.char, explanation: expl, speak: g.hebrewName,
      };
    }
    case 'sound-glyph': {
      const ds = distractors(g.char, conf, inPool, (x) => x.char, 3, rng,
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
        if (!known.has(fin.id)) return null;
        const ds = distractors(fin.char, FINAL_GLYPHS.filter((x) => known.has(x.id)), inPool, (x) => x.char, 3, rng,
          (x) => x.id === g.id);
        return {
          ...base, prompt: `Qual è la forma finale (sofit) di ${g.letter}?`,
          options: options(opt(fin.char, true), ds.map((d) => opt(d.char, true)), rng),
          answer: fin.char,
          explanation: `A fine parola ${g.letter} si scrive ${fin.char} (${fin.name}).`,
        };
      }
      if (g.finalOf) {
        const normal = GLYPH_BY_ID[g.finalOf];
        const normals = FINAL_GLYPHS.map((f) => GLYPH_BY_ID[f.finalOf!]).filter((x) => known.has(x.id));
        const ds = distractors(normal.letter, normals, inPool.filter((x) => !x.finalOf), (x) => x.letter, 3, rng);
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
      const ds = distractors(g.char, conf, inPool, (x) => x.char, 3, rng,
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
  const base = { key: `${kind}:${v.id}`, kind, itemIds: [`v:${v.id}`], meta: { vowel: v.id } };
  const shown = vowelDisplay(v);
  const expl = `${v.name} (${v.hebrewName}): ${v.description}`;
  const inPool = pool.vowels.length ? pool.vowels : VOWELS;

  switch (kind) {
    case 'vowel-sound': {
      // solo suoni di vocali già studiate (con una sola vocale nota la domanda non ha senso)
      const known = SOUND_LABELS.filter((l) => inPool.some((x) => x.sound === l));
      const ds = distractors(v.sound, [], known, (x) => x, 3, rng);
      if (!ds.length) return null;
      return {
        ...base, prompt: say(rng, 'Come si legge questa vocale? (א è muta)', 'Che suono dà questo segno? (א è muta)', 'Leggi questa vocale (א è muta)'),
        stimulus: { text: shown, hebrew: true, size: 'xl' },
        options: options(opt(v.sound), ds.map((d) => opt(d)), rng),
        answer: v.sound, explanation: expl,
      };
    }
    case 'vowel-name': {
      const ds = distractors(v.name, inPool, [], (x) => x.name, 3, rng,
        (x) => vowelDisplay(x) === shown);
      return {
        ...base, prompt: say(rng, 'Come si chiama questo segno vocalico?', 'Qual è il nome di questo segno?'),
        stimulus: { text: shown, hebrew: true, size: 'xl' },
        options: options(opt(v.name), ds.map((d) => opt(d.name)), rng),
        answer: v.name, explanation: expl,
      };
    }
    case 'name-vowel': {
      const ds = distractors(shown, inPool, [], (x) => vowelDisplay(x), 3, rng);
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
  if (g.id === 'yod' && (v.id === 'hiriq-male' || v.id === 'tsere-male')) return false;
  if (g.id === 'vav' && v.id === 'kubutz') return false; // combinazione praticamente inesistente
  if (g.id === 'sin' && v.group === 'O') return false; // il punto del cholam coincide con quello del sin
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
  const consonants = (pool.glyphs.length ? pool.glyphs : GLYPHS).filter((x) => !x.finalOf);
  const vowels = pool.vowels.length ? pool.vowels : VOWELS;
  const candidates: Syllable[] = [];
  const confs = confusablesOf(g).filter((x) => !x.finalOf && consonants.includes(x));
  for (const c of [g, ...confs, ...consonants]) {
    for (const vv of [v, ...vowels]) {
      if ((c === g && vv === v) || !canCombine(c, vv)) continue;
      candidates.push(syllable(c, vv));
    }
  }
  const preferred = candidates.filter((c) => c.glyph === g || c.vowel === v).slice(0, 40);
  const base = {
    key: `${kind}:${g.id}+${v.id}`, kind, itemIds: [`g:${g.id}`, `v:${v.id}`], meta: { glyph: g.id, vowel: v.id },
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

/** Parole per le alternative: solo quelle già leggibili (mai parole con segni non studiati). */
function nearbyWords(pool: Pool): Word[] {
  return pool.words.length ? pool.words : WORDS;
}

/** Tipi di domanda sul significato: solo per le parole di base, quelle davvero insegnate. */
const MEANING_KINDS: QuestionKind[] = ['word-meaning', 'meaning-word', 'listen-word'];
/** Tipi di domanda di decodifica (leggere davvero), validi per qualsiasi parola. */
export const DECODING_KINDS: QuestionKind[] = ['word-read', 'word-type', 'word-compose'];

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

const DIGRAPHS = ['sh', 'ch', 'ts'];

/**
 * Letture accettate nelle risposte scritte. Con lo sheva sulla prima lettera la “e”
 * breve è facoltativa (zman = zeman, bracha = beracha, yeladim = yladim).
 */
export function acceptedReadings(w: Pick<Word, 'he' | 'translit' | 'alt'>): string[] {
  const out = [w.translit, ...(w.alt ?? [])];
  const first = clusters(w.he)[0];
  if (first?.marks.includes(MARKS.SHEVA)) {
    const t = w.translit;
    const unit = DIGRAPHS.find((d) => t.toLowerCase().startsWith(d)) ?? t.slice(0, 1);
    const rest = t.slice(unit.length);
    out.push(rest.startsWith('e') ? unit + rest.slice(1) : `${unit}e${rest}`);
  }
  return out;
}

function wordQuestion(w: Word, kind: QuestionKind, pool: Pool, rng: Rng): Question | null {
  if (!w.core && MEANING_KINDS.includes(kind)) return null;
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
      const ds = distractors(w.it, others.filter((x) => x.core), [], (x) => x.it, 3, rng);
      return {
        ...base, prompt: say(rng, 'Che cosa significa questa parola?', 'Qual è il significato?', 'Leggi e scegli la traduzione'),
        stimulus: { text: w.he, hebrew: true, size: 'lg' }, speak: w.he,
        options: options(opt(w.it), ds.map((d) => opt(d.it)), rng),
        answer: w.it, explanation: expl,
      };
    }
    case 'meaning-word': {
      const ds = distractors(w.he, others, [], (x) => x.he, 3, rng, (x) => x.it === w.it);
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
      const ds = distractors(w.he, others, [], (x) => x.he, 3, rng);
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

/**
 * Esercizi o test di una lezione.
 * - Test: ogni lettera e vocale nuova compare almeno 2 volte in formati diversi,
 *   e circa il 40% delle domande è di lettura vera (leggere, scrivere, dettato).
 * - Esercizi: soprattutto elementi nuovi, più un po' di ripasso.
 */
export function buildLessonQuiz(
  lessonId: number, count: number, rng: Rng, o: QuizOptions = {}, mode: 'practice' | 'test' = 'practice',
): Question[] {
  const lesson = LESSON_BY_ID[lessonId];
  const pool = poolUpTo(lessonId);
  const newWords = wordsOfLesson(lessonId);
  const focusGlyphs = lesson.glyphs.map((id) => GLYPH_BY_ID[id]);
  const focusVowels = lesson.vowels.map((id) => VOWEL_BY_ID[id]);
  const out: Question[] = [];
  const keys = new Set<string>();
  const add = (q: Question | null): boolean => {
    if (!q || keys.has(q.key) || (q.options && q.options.length < 2)) return false;
    keys.add(q.key);
    out.push(q);
    return true;
  };

  if (mode === 'test') {
    const gk = allowedKinds(GLYPH_KINDS, o);
    const vk = allowedKinds(VOWEL_KINDS, o);
    for (const g of focusGlyphs) {
      let n = 0;
      for (const k of shuffle(gk, rng)) if (n < 2 && add(glyphQuestion(g, k, pool, rng))) n++;
      // se i formati "lettera" non bastano (es. forme finali), una sillaba con quella lettera
      for (const v of shuffle(pool.vowels, rng)) if (n < 2 && add(syllableQuestion(g, v, pick(SYLLABLE_KINDS, rng), pool, rng))) n++;
    }
    for (const v of focusVowels) {
      let n = 0;
      for (const k of shuffle(vk, rng)) if (n < 1 && add(vowelQuestion(v, k, pool, rng))) n++;
      for (const g of shuffle(pool.glyphs, rng)) if (n < 2 && add(syllableQuestion(g, v, pick(SYLLABLE_KINDS, rng), pool, rng))) n++;
      // vocali che non formano sillabe da sole (sheva, chataf): un'altra domanda sul segno
      for (const k of shuffle(vk, rng)) if (n < 2 && add(vowelQuestion(v, k, pool, rng))) n++;
    }
  }

  // Lettura vera: decodificare parole (anche mai viste prima), non solo riconoscerle
  const decodeTarget = Math.round(count * (mode === 'test' ? 0.4 : 0.3));
  const readable = newWords.length >= 4 ? newWords : pool.words;
  if (readable.length) {
    for (const q of buildQuiz({
      focusGlyphs: [], focusVowels: [], focusWords: readable, pool, count: decodeTarget, categories: ['word'], kinds: DECODING_KINDS,
    }, rng, o)) if (out.length < count) add(q);
  }

  // Resto: domande sugli elementi nuovi (compresi i significati delle parole di base) e ripasso
  const reviewShare = lessonId === 1 ? 0 : Math.round(count * 0.25);
  const mainCount = Math.max(0, count - out.length - reviewShare);
  const coreNew = newWords.filter((w) => w.core);
  for (const q of buildQuiz({
    focusGlyphs, focusVowels,
    focusWords: coreNew.length >= 3 ? coreNew : pool.words.filter((w) => w.core),
    pool, count: mainCount * 2,
    weights: lessonId === LAST_LESSON ? { word: 6, syllable: 2 } : undefined,
  }, rng, o)) if (out.length < count - reviewShare) add(q);

  const used = new Set(out.flatMap((q) => q.itemIds));
  const review = buildQuiz({
    focusGlyphs: pool.glyphs, focusVowels: pool.vowels, focusWords: pool.words.filter((w) => w.core), pool, count: count * 2,
  }, rng, o);
  const fresh = review.filter((q) => !q.itemIds.some((id) => used.has(id)));
  for (const q of [...fresh, ...review]) if (out.length < count) add(q);

  return spread(shuffle(out.slice(0, count), rng));
}

/**
 * Test d'ingresso: un blocco breve per lezione (lettere e vocali nuove + lettura).
 * Si procede finché il blocco è superato.
 */
export function buildPlacementBlock(lessonId: number, rng: Rng): Question[] {
  const lesson = LESSON_BY_ID[lessonId];
  const pool = poolUpTo(lessonId);
  const out: Question[] = [];
  const keys = new Set<string>();
  const add = (q: Question | null) => {
    if (q && !keys.has(q.key) && (!q.options || q.options.length >= 2)) { keys.add(q.key); out.push(q); }
  };
  const readingKinds: QuestionKind[] = ['glyph-sound', 'sound-glyph', 'glyph-name'];
  for (const id of shuffle(lesson.glyphs, rng).slice(0, 3)) add(glyphQuestion(GLYPH_BY_ID[id], pick(readingKinds, rng), pool, rng));
  for (const id of shuffle(lesson.vowels, rng).slice(0, 2)) {
    const v = VOWEL_BY_ID[id];
    const g = pick(pool.glyphs.filter((x) => canCombine(x, v)), rng);
    if (g) add(syllableQuestion(g, v, 'syllable-read', pool, rng));
  }
  const words = shuffle(wordsOfLesson(lessonId).length ? wordsOfLesson(lessonId) : pool.words, rng);
  for (const w of words) {
    if (out.length >= 6) break;
    add(wordQuestion(w, 'word-read', pool, rng));
  }
  return shuffle(out, rng);
}

/** Spiega l'errore specifico confrontando la risposta data con quella giusta. */
export function explainMistake(q: Question, given: string | null): string | null {
  if (given === null || given === q.answer) return null;
  const target = q.meta?.glyph ? GLYPH_BY_ID[q.meta.glyph] : undefined;
  const vowel = q.meta?.vowel ? VOWEL_BY_ID[q.meta.vowel] : undefined;

  if (target && !vowel) {
    if (q.kind === 'glyph-sound') {
      const same = GLYPHS.filter((g) => g.sound === given).map((g) => g.char);
      return `«${given}» è il suono di ${same.join(' ')}. ${target.char} si legge «${target.sound}»: ${target.tip}`;
    }
    const chosen = GLYPHS.find((g) => g.name === given || g.char === given || (!g.finalOf && g.letter === given));
    if (chosen && chosen.id !== target.id) {
      return `Hai scelto ${chosen.char} (${chosen.name}, «${chosen.sound}»). Quella giusta è ${target.char} (${target.name}): ${target.tip}`;
    }
    return null;
  }
  if (vowel && !target) {
    if (q.kind === 'vowel-sound') return `${vowelDisplay(vowel)} si legge «${vowel.sound}», non «${given}»: ${vowel.description}`;
    const chosen = VOWELS.find((v) => v.name === given || vowelDisplay(v) === given);
    return chosen ? `Hai scelto ${chosen.name}: ${chosen.description} Il ${vowel.name} invece: ${vowel.description}` : null;
  }
  if (target && vowel) {
    // Sillabe: capire se l'errore è nella consonante o nella vocale
    const combos = GLYPHS.filter((g) => !g.finalOf).flatMap((g) => VOWELS.filter((v) => canCombine(g, v)).map((v) => syllable(g, v)));
    const chosen = combos.find((c) => (q.kind === 'syllable-read' ? c.translit === given : c.text === given));
    if (!chosen) return null;
    if (chosen.vowel.sound === vowel.sound || chosen.vowel.translit === vowel.translit) {
      return `La vocale è giusta, ma la consonante no: hai letto ${chosen.glyph.char} (${chosen.glyph.name}, «${chosen.glyph.sound}»), invece è ${target.char} (${target.name}, «${target.sound}»). ${target.tip}`;
    }
    if (chosen.glyph.translit === target.translit) {
      return `La consonante è giusta, ma la vocale no: ${vowel.name} si legge «${vowel.translit}», non «${chosen.vowel.translit}».`;
    }
    return `Consonante e vocale: ${target.char} si legge «${target.sound}» e ${vowel.name} «${vowel.translit}».`;
  }
  if (q.kind === 'word-read' || q.kind === 'word-type') {
    return `Hai letto «${given}», ma si legge «${q.answer}». Rileggi lettera per lettera, da destra a sinistra, facendo attenzione alle vocali.`;
  }
  return null;
}

/** Distanza di modifica (per riconoscere un piccolo refuso nelle risposte scritte). */
export function editDistance(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return dp[a.length][b.length];
}

/** Valuta una risposta scritta: esatta, quasi (un refuso in una parola lunga) o sbagliata. */
export function gradeTyped(input: string, accepted: string[]): 'exact' | 'close' | 'wrong' {
  const n = normalizeTranslit(input);
  if (!n) return 'wrong';
  const norms = accepted.map(normalizeTranslit);
  if (norms.includes(n)) return 'exact';
  if (norms.some((a) => a.length >= 5 && editDistance(a, n) <= 1)) return 'close';
  return 'wrong';
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
    description: 'Leggere parole vocalizzate, anche mai viste prima: lettura, scrittura e dettato.',
    build: (rng, o) => {
      const decoding = buildQuiz({ focusGlyphs: [], focusVowels: [], focusWords: WORDS, pool: FULL_POOL, count: 18, categories: ['word'], kinds: DECODING_KINDS }, rng, o);
      const meaning = buildQuiz({ focusGlyphs: [], focusVowels: [], focusWords: WORDS.filter((w) => w.core), pool: FULL_POOL, count: 7, categories: ['word'], kinds: ['word-meaning', 'meaning-word'] }, rng, o);
      return spread(shuffle([...decoding, ...meaning], rng));
    },
  },
  {
    id: 'senza-nikud', title: 'Lettura senza nikud', count: 20, requires: 10,
    description: 'Parole scritte come su giornali e cartelli: senza vocali, in grafia piena (שולחן, סיפור).',
    build: (rng, o) => {
      const qs = buildQuiz({ focusGlyphs: [], focusVowels: [], focusWords: WORDS.filter((w) => w.core), pool: FULL_POOL, count: 20, categories: ['word'], kinds: ['word-meaning', 'word-read', 'word-type'] }, rng, o);
      return qs.map((q) => q.stimulus ? {
        ...q, key: `plain:${q.key}`,
        stimulus: { ...q.stimulus, text: ktivMale(q.stimulus.text) },
        explanation: `${ktivMale(q.stimulus.text)} = ${q.explanation}`,
      } : q);
    },
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
