import { MARKS } from '../data/nikud';
import { clusters, type Cluster } from './hebrew';

/**
 * Grafia piena (ktiv malè): come si scrive l'ebraico senza nikud su giornali e cartelli.
 * Regole principali dell'Accademia della lingua ebraica:
 * - holam e kubutz → ו (שֻׁלְחָן → שולחן, חֹדֶשׁ → חודש);
 * - chirik in sillaba aperta → י (סִפּוּר → סיפור), non prima di una sheva o a fine sillaba (מִכְתָּב → מכתב);
 * - vav consonantica in mezzo alla parola → וו (תִּקְוָה → תקווה);
 * - "-ayim" → ייִם (שָׁמַיִם → שמיים).
 * Le eccezioni più comuni sono elencate a parte.
 */
const EXCEPTIONS: Record<string, string> = {
  'כל': 'כל', 'כה': 'כה', 'פה': 'פה', 'משה': 'משה', 'אמא': 'אמא', 'מים': 'מים',
  'שלמה': 'שלמה', 'שרותים': 'שירותים', 'אם': 'אם', 'עם': 'עם', 'מן': 'מן', 'חג': 'חג',
};

const VOWEL_MARKS: string[] = [
  MARKS.QAMATS, MARKS.QAMATS_QATAN, MARKS.PATAH, MARKS.HIRIQ, MARKS.TSERE, MARKS.SEGOL, MARKS.HOLAM,
  MARKS.HOLAM_VAV, MARKS.QUBUTS, MARKS.HATAF_PATAH, MARKS.HATAF_SEGOL, MARKS.HATAF_QAMATS,
];
const has = (c: Cluster | undefined, m: string) => !!c && c.marks.includes(m);
const hasVowel = (c: Cluster | undefined) => !!c && c.marks.some((m) => VOWEL_MARKS.includes(m));
/** ו che è una vocale (shuruk o holam malè) e non una consonante. */
const isVavVowel = (c: Cluster, prev: Cluster | undefined) =>
  c.letter === 'ו' && prev && !hasVowel(prev) && !has(prev, MARKS.SHEVA)
  && (has(c, MARKS.HOLAM) || (has(c, MARKS.DAGESH) && !hasVowel(c)));
/** La lettera in posizione i è seguita da un suono vocalico (vocale sotto di lei o ו vocalica dopo). */
const voiced = (cs: Cluster[], i: number) =>
  hasVowel(cs[i]) || (!!cs[i + 1] && isVavVowel(cs[i + 1], cs[i]));

function word(w: string): string {
  const cs = clusters(w);
  const plain = cs.map((c) => c.letter).join('');
  if (plain in EXCEPTIONS) return EXCEPTIONS[plain];
  let out = '';
  cs.forEach((c, i) => {
    const prev = cs[i - 1];
    const next = cs[i + 1];
    const last = i === cs.length - 1;
    // vav consonantica con vocale, non all'inizio e non accanto a un'altra ו → raddoppiata
    if (c.letter === 'ו' && i > 0 && !last && hasVowel(c) && !isVavVowel(c, prev)
      && prev?.letter !== 'ו' && next?.letter !== 'ו') {
      out += 'וו';
    } else if (c.letter === 'י' && has(c, MARKS.HIRIQ) && has(prev, MARKS.PATAH) && i > 1) {
      out += 'יי'; // -ayim
      return;
    } else {
      out += c.letter;
    }
    if (c.letter === 'ו') return;
    // holam e kubutz → ו (non prima di una א muta o di una ה finale muta: לֹא, פֹּה)
    if (has(c, MARKS.HOLAM) || has(c, MARKS.QUBUTS) || has(c, MARKS.QAMATS_QATAN)) {
      const silentNext = next && !hasVowel(next) && !has(next, MARKS.SHEVA) && (next.letter === 'א' || (next.letter === 'ה' && i + 1 === cs.length - 1));
      if (!silentNext && next?.letter !== 'ו') out += 'ו';
      return;
    }
    // chirik → י solo in sillaba aperta (la lettera seguente ha una vocale) e se la י non c'è già
    if (has(c, MARKS.HIRIQ) && next && next.letter !== 'י' && voiced(cs, i + 1)) {
      out += 'י';
    }
  });
  return out;
}

export function ktivMale(text: string): string {
  // parola per parola: lettere + segni; il resto (spazi, punteggiatura, maqaf) resta com'è
  return text.replace(/[ְ-ׇא-ת]+/g, (w) => word(w));
}
