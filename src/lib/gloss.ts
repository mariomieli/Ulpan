import { WORDS, type Word } from '../data/words';
import { clusters, stripNikud } from './hebrew';

/** Prefissi di una lettera che si attaccano alla parola seguente. */
const PREFIXES: Record<string, string> = {
  'ו': 'e', 'ב': 'in', 'ל': 'a, per', 'ה': 'il / la', 'כ': 'come', 'מ': 'da', 'ש': 'che',
};

export interface Gloss {
  /** La parola del vocabolario trovata (se c'è). */
  word?: Word;
  /** Prefisso staccato dalla parola (es. ה = "il/la"). */
  prefix?: { he: string; it: string };
  /** Traslitterazione della parola nel testo (dalla riga, se le parole corrispondono). */
  translit?: string;
}

let exact: Map<string, Word> | null = null;
let plain: Map<string, Word> | null = null;
function maps() {
  if (!exact || !plain) {
    exact = new Map();
    plain = new Map();
    for (const w of WORDS) {
      if (/\s/.test(w.he)) continue;
      if (!exact.has(w.he)) exact.set(w.he, w);
      const p = stripNikud(w.he);
      if (!plain.has(p)) plain.set(p, w);
    }
  }
  return { exact, plain };
}

const find = (he: string) => maps().exact.get(he) ?? maps().plain.get(stripNikud(he));

/** Toglie la punteggiatura attorno a una parola ebraica (lascia lettere e segni). */
export function cleanToken(token: string): string {
  return token.replace(/[^֑-ׇא-ת]/g, '');
}

/** Cosa significa una parola di un testo: dal vocabolario, eventualmente staccando un prefisso. */
export function glossWord(token: string, translit?: string): Gloss {
  const he = cleanToken(token);
  const direct = find(he);
  if (direct) return { word: direct, translit };
  const cs = clusters(he);
  if (cs.length > 2 && PREFIXES[cs[0].letter]) {
    const rest = cs.slice(1).map((c) => c.letter + c.marks.join('')).join('');
    const w = find(rest);
    if (w) return { word: w, prefix: { he: cs[0].letter + cs[0].marks.join(''), it: PREFIXES[cs[0].letter] }, translit };
  }
  return { translit };
}

/** Divide una riga in parole ebraiche, abbinando la traslitterazione quando il numero di parole coincide. */
export function lineTokens(he: string, translit: string): { token: string; translit?: string }[] {
  const tokens = he.split(/\s+/).filter((t) => cleanToken(t));
  const tr = translit.split(/\s+/).filter(Boolean);
  return tokens.map((token, i) => ({ token, translit: tr.length === tokens.length ? tr[i].replace(/[.,:;!?]+$/, '') : undefined }));
}
