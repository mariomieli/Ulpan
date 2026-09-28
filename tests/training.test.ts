import { describe, expect, it } from 'vitest';
import { buildConfusableQuiz, pickDailyItems, seededRng } from '../src/lib/quiz';
import { GLYPHS } from '../src/data/alphabet';

describe('sessione di oggi', () => {
  it('mescola scadenze, punti deboli e novità senza doppioni', () => {
    const due = Array.from({ length: 20 }, (_, i) => `g:d${i}`);
    const ids = pickDailyItems(due, ['g:w1', 'g:d0', 'g:w2'], ['v:n1', 'v:n2'], 15);
    expect(ids).toHaveLength(15);
    expect(new Set(ids).size).toBe(15);
    expect(ids).toContain('g:w1');
    expect(ids).toContain('v:n1');
  });
  it('con poco materiale restituisce quello che c’è', () => {
    expect(pickDailyItems([], ['g:a'], ['v:b'])).toEqual(['g:a', 'v:b']);
  });
});

describe('lettere simili', () => {
  it('le alternative sono lettere simili e ogni domanda ha almeno 3 risposte', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const qs = buildConfusableQuiz(GLYPHS, 12, seededRng(seed));
      expect(qs.length).toBe(12);
      for (const q of qs) {
        expect(q.options!.length).toBeGreaterThanOrEqual(3);
        expect(new Set(q.options!.map((o) => o.value)).size).toBe(q.options!.length);
        expect(q.options!.some((o) => o.value === q.answer)).toBe(true);
      }
    }
  });
  it('con poche lettere note non propone domande impossibili', () => {
    const few = GLYPHS.filter((g) => ['alef', 'bet', 'vet'].includes(g.id));
    expect(buildConfusableQuiz(few, 12, seededRng(1))).toHaveLength(0);
  });
});
