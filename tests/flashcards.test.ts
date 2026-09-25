import { describe, expect, it } from 'vitest';
import { flashcardOrder } from '../src/lib/flashcards';
import { seededRng } from '../src/lib/quiz';
import { WORDS } from '../src/data/words';
import { newSrsState } from '../src/lib/srs';

describe('flashcard', () => {
  const now = Date.now();
  const words = WORDS.slice(0, 20);
  const s = (seen: number, correct: number, due: number) => ({ ...newSrsState(now), seen, correct, due });

  it('prima le parole difficili, poi le nuove, poi le altre; le recenti in fondo', () => {
    const srs = {
      [`w:${words[0].id}`]: s(5, 1, now + 1e9), // difficile
      [`w:${words[1].id}`]: s(5, 5, now - 1000), // da ripassare
      [`w:${words[2].id}`]: s(5, 5, now + 1e9), // conosciuta
    };
    const recent = new Set([`flash:${words[3].id}`]);
    const order = flashcardOrder(words, srs, recent, now, seededRng(1));
    expect(order).toHaveLength(20);
    expect(new Set(order.slice(0, 2).map((w) => w.id))).toEqual(new Set([words[0].id, words[1].id]));
    expect(order[order.length - 1].id).toBe(words[3].id);
    expect(order[order.length - 2].id).toBe(words[2].id);
  });

  it('sessioni diverse iniziano con parole diverse', () => {
    const a = flashcardOrder(words, {}, new Set(), now, seededRng(1)).slice(0, 5).map((w) => w.id);
    const recent = new Set(a.map((id) => `flash:${id}`));
    const b = flashcardOrder(words, {}, recent, now, seededRng(2)).slice(0, 5).map((w) => w.id);
    expect(b.filter((id) => a.includes(id))).toEqual([]);
  });
});
