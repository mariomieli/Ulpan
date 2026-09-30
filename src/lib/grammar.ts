import type { GrammarItem, GrammarUnit } from '../data/grammar';
import { shuffle, type Option, type Question, type QuestionKind, type Rng } from './quiz';

const KINDS: QuestionKind[] = ['word-meaning', 'meaning-word', 'word-read'];

const opt = (value: string, hebrew = false): Option => ({ value, label: value, hebrew });

/** Risposta giusta più tre alternative diverse tra loro, in ordine casuale. */
function choices(correct: Option, pool: Option[], rng: Rng): Option[] {
  const seen = new Set([correct.label]);
  const others: Option[] = [];
  for (const o of shuffle(pool, rng)) {
    if (seen.has(o.label)) continue;
    seen.add(o.label);
    others.push(o);
    if (others.length === 3) break;
  }
  return shuffle([correct, ...others], rng);
}

function grammarQuestion(unit: GrammarUnit, item: GrammarItem, kind: QuestionKind, rng: Rng): Question | null {
  const others = unit.items.filter((x) => x !== item);
  const explanation = `${item.he} si legge «${item.translit}» e significa «${item.it}».`;
  const base = { key: `${unit.id}:${kind}:${unit.items.indexOf(item)}`, kind, itemIds: [] as string[], speak: item.he, explanation };
  let q: Question;
  switch (kind) {
    case 'word-meaning':
      q = {
        ...base, prompt: 'Che cosa significa?', stimulus: { text: item.he, hebrew: true, size: 'lg' },
        options: choices(opt(item.it), others.map((x) => opt(x.it)), rng), answer: item.it,
      };
      break;
    case 'meaning-word':
      q = {
        ...base, prompt: `Quale espressione significa «${item.it}»?`,
        options: choices(opt(item.he, true), others.map((x) => opt(x.he, true)), rng), answer: item.he,
      };
      break;
    default:
      q = {
        ...base, prompt: 'Come si legge?', stimulus: { text: item.he, hebrew: true, size: 'lg' },
        options: choices(opt(item.translit), others.map((x) => opt(x.translit)), rng), answer: item.translit,
      };
  }
  return q.options && q.options.length >= 3 ? q : null;
}

/**
 * Esercizi di un'unità: ogni voce compare con tipi di domanda diversi, mai due volte di seguito la stessa.
 * Le domande in `avoid` (viste di recente) si ripropongono solo se non ce ne sono altre.
 */
export function buildGrammarQuiz(unit: GrammarUnit, count: number, rng: Rng, avoid: ReadonlySet<string> = new Set()): Question[] {
  const pairs: { item: GrammarItem; kind: QuestionKind }[] = [];
  for (const kind of KINDS) for (const item of unit.items) pairs.push({ item, kind });
  const shuffled = shuffle(pairs, rng);
  const key = (p: { item: GrammarItem; kind: QuestionKind }) => `${unit.id}:${p.kind}:${unit.items.indexOf(p.item)}`;
  const ordered = [...shuffled.filter((p) => !avoid.has(key(p))), ...shuffled.filter((p) => avoid.has(key(p)))];
  const out: Question[] = [];
  const perItem = new Map<GrammarItem, number>();
  const used = new Set<string>();
  // prima una domanda per voce, poi (se servono) le altre
  for (const pass of [0, 1, 2]) {
    for (const p of ordered) {
      if (out.length >= count) break;
      if ((perItem.get(p.item) ?? 0) !== pass || used.has(key(p))) continue;
      const q = grammarQuestion(unit, p.item, p.kind, rng);
      if (!q) continue;
      out.push(q);
      used.add(key(p));
      perItem.set(p.item, pass + 1);
    }
  }
  // evita due domande consecutive sulla stessa voce
  const mixed = shuffle(out, rng);
  for (let i = 1; i < mixed.length; i++) {
    if (mixed[i].speak !== mixed[i - 1].speak) continue;
    const j = mixed.findIndex((q, k) => k > i && q.speak !== mixed[i - 1].speak && q.speak !== mixed[i + 1]?.speak);
    if (j > 0) [mixed[i], mixed[j]] = [mixed[j], mixed[i]];
  }
  return mixed;
}
