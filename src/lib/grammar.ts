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

function grammarQuestion(unit: GrammarUnit, item: GrammarItem, kind: QuestionKind, index: number, rng: Rng): Question | null {
  const others = unit.items.filter((x) => x !== item);
  const explanation = `${item.he} si legge «${item.translit}» e significa «${item.it}».`;
  const base = { key: `${unit.id}:${kind}:${index}`, kind, itemIds: [] as string[], speak: item.he, explanation };
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

/** Esercizi di un'unità: ogni voce compare con tipi di domanda diversi, mai due volte di seguito la stessa. */
export function buildGrammarQuiz(unit: GrammarUnit, count: number, rng: Rng): Question[] {
  const out: Question[] = [];
  for (let round = 0; out.length < count && round < KINDS.length * 2; round++) {
    const kind = KINDS[round % KINDS.length];
    for (const item of shuffle(unit.items, rng)) {
      if (out.length >= count) break;
      const q = grammarQuestion(unit, item, kind, out.length, rng);
      if (q) out.push(q);
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
