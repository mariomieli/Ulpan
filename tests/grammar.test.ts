import { describe, expect, it } from 'vitest';
import { GRAMMAR_UNITS } from '../src/data/grammar';
import { buildGrammarQuiz } from '../src/lib/grammar';
import { seededRng } from '../src/lib/quiz';

describe('grammatica e numeri', () => {
  it('id validi e unici (sono chiavi del punteggio salvato)', () => {
    const ids = GRAMMAR_UNITS.map((u) => u.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z-]{1,30}$/);
  });

  for (const u of GRAMMAR_UNITS) {
    it(`${u.id}: contenuti completi e senza doppioni`, () => {
      expect(u.theory.length).toBeGreaterThan(0);
      expect(u.items.length).toBeGreaterThanOrEqual(10);
      expect(new Set(u.items.map((x) => x.he)).size).toBe(u.items.length);
      expect(new Set(u.items.map((x) => x.it)).size).toBe(u.items.length);
      for (const x of u.items) expect(x.he && x.translit && x.it).toBeTruthy();
    });

    it(`${u.id}: quiz valido`, () => {
      for (let seed = 1; seed <= 20; seed++) {
        const qs = buildGrammarQuiz(u, 12, seededRng(seed));
        expect(qs).toHaveLength(12);
        expect(new Set(qs.map((q) => q.key)).size).toBe(qs.length);
        for (const q of qs) {
          expect(q.options!.length, q.key).toBeGreaterThanOrEqual(3);
          expect(new Set(q.options!.map((o) => o.label)).size, q.key).toBe(q.options!.length);
          expect(q.options!.filter((o) => o.value === q.answer), q.key).toHaveLength(1);
        }
      }
    });
  }
});
