import { MARKS } from '../data/nikud';
import { clusters, type Cluster } from './hebrew';

/** Separatore mostrato tra le sillabe. */
export const SYLLABLE_SEP = '·';

const VOWEL_MARKS: string[] = [
  MARKS.QAMATS, MARKS.QAMATS_QATAN, MARKS.PATAH, MARKS.HIRIQ, MARKS.TSERE, MARKS.SEGOL, MARKS.HOLAM,
  MARKS.HOLAM_VAV, MARKS.QUBUTS, MARKS.HATAF_PATAH, MARKS.HATAF_SEGOL, MARKS.HATAF_QAMATS,
];
const has = (c: Cluster | undefined, m: string) => !!c && c.marks.includes(m);
const hasVowel = (c: Cluster | undefined) => !!c && c.marks.some((m) => VOWEL_MARKS.includes(m));
/** ו che fa da vocale (וֹ, וּ) per la consonante precedente. */
const vavVowel = (c: Cluster | undefined, prev: Cluster | undefined) =>
  !!c && !!prev && c.letter === 'ו' && !hasVowel(prev)
  && (c.marks.length === 1 && (c.marks[0] === MARKS.HOLAM || c.marks[0] === MARKS.DAGESH));
const text = (c: Cluster) => c.letter + c.marks.join('');

function word(w: string): string {
  const cs = clusters(w);
  if (cs.length < 2) return w;
  const parts: string[] = [];
  let cur = '';
  cs.forEach((c, i) => {
    const prev = cs[i - 1];
    // una sillaba comincia con una consonante che porta una vocale (sotto di sé o con ו vocalica dopo)
    const voiced = (hasVowel(c) || vavVowel(cs[i + 1], c)) && !vavVowel(c, prev);
    // lo sheva a inizio parola si lega alla sillaba seguente (בְּרָ·כָה)
    const afterInitialSheva = i === 1 && has(prev, MARKS.SHEVA) && !hasVowel(prev);
    // patach furtivo finale (רוּחַ): si legge prima della consonante, resta nella sillaba precedente
    const furtive = i === cs.length - 1 && has(c, MARKS.PATAH) && 'חעה'.includes(c.letter) && i > 0;
    if (voiced && cur && !afterInitialSheva && !furtive) {
      parts.push(cur);
      cur = '';
    }
    cur += text(c);
  });
  if (cur) parts.push(cur);
  return parts.join(SYLLABLE_SEP);
}

/** Divide in sillabe ogni parola vocalizzata: שָׁלוֹם → שָׁ·לוֹם. Il resto del testo non cambia. */
export function syllabify(input: string): string {
  return input.replace(/[ְ-ׇא-ת]+/g, (w) => word(w));
}
