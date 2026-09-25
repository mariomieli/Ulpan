import type { Word } from '../data/words';
import type { SrsState } from './srs';
import { shuffle, type Rng } from './quiz';

/**
 * Ordine delle flashcard: prima le parole difficili o da ripassare, poi quelle
 * mai viste, poi le altre. Le carte viste di recente finiscono in fondo, così
 * ogni sessione propone parole diverse dalla precedente.
 */
export function flashcardOrder(
  words: readonly Word[], srs: Record<string, SrsState>, recent: ReadonlySet<string>, now: number, rng: Rng,
): Word[] {
  const weak: Word[] = [];
  const fresh: Word[] = [];
  const rest: Word[] = [];
  for (const w of words) {
    const s = srs[`w:${w.id}`];
    if (!s || s.seen === 0) fresh.push(w);
    else if (s.due <= now || s.correct / s.seen < 0.7) weak.push(w);
    else rest.push(w);
  }
  const ordered = [...shuffle(weak, rng), ...shuffle(fresh, rng), ...shuffle(rest, rng)];
  const seenRecently = (w: Word) => recent.has(`flash:${w.id}`);
  return [...ordered.filter((w) => !seenRecently(w)), ...ordered.filter(seenRecently)];
}
