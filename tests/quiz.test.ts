import { describe, expect, it } from 'vitest';
import { buildLessonQuiz, buildReview, EXAMS, seededRng, misreadings, type Question } from '../src/lib/quiz';
import { LESSONS } from '../src/data/curriculum';

function checkQuestion(q: Question) {
  if (q.options) {
    expect(q.options.length, q.key).toBeGreaterThanOrEqual(2);
    const labels = q.options.map((o) => o.label);
    expect(new Set(labels).size, `${q.key}: ${labels}`).toBe(labels.length);
    expect(q.options.filter((o) => o.value === q.answer), q.key).toHaveLength(1);
  } else {
    expect(q.accepted?.length, q.key).toBeGreaterThan(0);
  }
  expect(q.itemIds.length).toBeGreaterThan(0);
  expect(q.explanation.length).toBeGreaterThan(0);
}

describe('quiz di lezione', () => {
  for (const l of LESSONS) {
    it(`lezione ${l.id}: domande valide e senza duplicati`, () => {
      for (let seed = 1; seed <= 25; seed++) {
        const qs = buildLessonQuiz(l.id, 15, seededRng(seed), { audio: true, typing: true });
        expect(qs.length, `seed ${seed}`).toBeGreaterThanOrEqual(10);
        expect(new Set(qs.map((q) => q.key)).size).toBe(qs.length);
        qs.forEach(checkQuestion);
      }
    });
  }
});

describe('esami', () => {
  for (const e of EXAMS) {
    it(`${e.id}: ${e.count} domande valide`, () => {
      for (let seed = 1; seed <= 10; seed++) {
        const qs = e.build(seededRng(seed), {});
        expect(qs).toHaveLength(e.count);
        qs.forEach(checkQuestion);
        expect(qs.some((q) => q.kind.startsWith('listen'))).toBe(false);
      }
    });
  }
});

describe('ripasso', () => {
  it('crea una domanda per elemento', () => {
    const ids = ['g:bet', 'v:kamatz', 'w:shalom', 'g:fe-sofit'];
    const qs = buildReview(ids, 10, seededRng(3));
    expect(qs.map((q) => q.itemIds[0]).sort()).toEqual([...ids].sort());
    qs.forEach(checkQuestion);
  });
});

describe('distrattori di lettura', () => {
  it('genera letture sbagliate plausibili e diverse dalla corretta', () => {
    const m = misreadings('shalom');
    expect(m).not.toContain('shalom');
    expect(m).toContain('shalum');
    expect(m).toContain('salom');
  });
});
