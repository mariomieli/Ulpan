import { describe, expect, it } from 'vitest';
import {
  initialState, applyAnswer, applyLessonTest, applyStudied, applyExam, isLessonUnlocked,
  maxUnlockedLesson, dueItems, lessonItemIds,
} from '../src/lib/store';
import { review, newSrsState, mastery } from '../src/lib/srs';

const d = (s: string) => new Date(`${s}T12:00:00`);

describe('srs', () => {
  it('intervalli crescenti e reset su errore', () => {
    const t = Date.now();
    let s = newSrsState(t);
    s = review(s, true, t); expect(s.interval).toBe(1);
    s = review(s, true, t); expect(s.interval).toBe(3);
    s = review(s, true, t); expect(s.interval).toBeGreaterThan(3);
    expect(mastery(s)).toBe(2);
    s = review(s, false, t);
    expect(s.interval).toBe(0);
    expect(s.lapses).toBe(1);
    expect(s.ease).toBeLessThan(2.6);
  });
});

describe('store', () => {
  it('streak: giorni consecutivi e interruzione', () => {
    let s = initialState();
    s = applyAnswer(s, ['g:bet'], true, d('2026-01-01'));
    expect(s.streak).toBe(1);
    s = applyAnswer(s, ['g:bet'], true, d('2026-01-01'));
    expect(s.streak).toBe(1);
    s = applyAnswer(s, ['g:bet'], false, d('2026-01-02'));
    expect(s.streak).toBe(2);
    s = applyAnswer(s, ['g:bet'], true, d('2026-01-05'));
    expect(s.streak).toBe(1);
    expect(s.days['2026-01-02']).toEqual({ answered: 1, correct: 0 });
    expect(s.xp).toBe(32);
  });

  it('sblocco lezioni', () => {
    let s = initialState();
    expect(isLessonUnlocked(s, 1)).toBe(true);
    expect(isLessonUnlocked(s, 2)).toBe(false);
    s = applyLessonTest(s, 1, 70, 80);
    expect(isLessonUnlocked(s, 2)).toBe(false);
    s = applyLessonTest(s, 1, 85, 80);
    expect(isLessonUnlocked(s, 2)).toBe(true);
    expect(maxUnlockedLesson(s)).toBe(2);
    s = applyLessonTest(s, 1, 60, 80);
    expect(s.lessons[1]).toMatchObject({ passed: true, bestScore: 85, attempts: 3 });
  });

  it('studiare una lezione aggiunge gli elementi al ripasso', () => {
    const now = d('2026-01-01');
    const s = applyStudied(initialState(), 1, now);
    const ids = lessonItemIds(1);
    expect(ids).toContain('g:bet');
    expect(ids).toContain('v:kamatz');
    expect(dueItems(s, now.getTime()).sort()).toEqual([...ids].sort());
  });

  it('esami: miglior punteggio', () => {
    let s = applyExam(initialState(), 'finale', 70, 600, d('2026-01-01'));
    s = applyExam(s, 'finale', 90, 700, d('2026-01-02'));
    s = applyExam(s, 'finale', 50, 300, d('2026-01-03'));
    expect(s.exams.finale).toMatchObject({ bestScore: 90, lastScore: 50, attempts: 3, bestTimeSec: 700 });
  });
});

describe('sincronizzazione', () => {
  it('unisce due dispositivi tenendo il meglio di ciascuno', async () => {
    const { mergeStates } = await import('../src/lib/store');
    let a = applyLessonTest(initialState(), 1, 90, 80);
    a = applyAnswer(a, ['g:bet'], true, d('2026-01-01'));
    a = { ...a, updatedAt: 100 };
    let b = applyLessonTest(initialState(), 2, 85, 80);
    b = applyAnswer(b, ['g:bet'], true, d('2026-01-02'));
    b = applyAnswer(b, ['g:bet'], true, d('2026-01-02'));
    b = applyExam(b, 'finale', 70, 500, d('2026-01-02'));
    b = { ...b, updatedAt: 200, settings: { ...b.settings, theme: 'dark' } };
    const m = mergeStates(a, b);
    expect(m.lessons[1].passed && m.lessons[2].passed).toBe(true);
    expect(m.srs['g:bet'].seen).toBe(2);
    expect(m.days['2026-01-01'].answered).toBe(1);
    expect(m.days['2026-01-02'].answered).toBe(2);
    expect(m.exams.finale.bestScore).toBe(70);
    expect(m.settings.theme).toBe('dark');
    expect(m.lastActive).toBe('2026-01-02');
    expect(mergeStates(b, a)).toMatchObject({ lessons: m.lessons, xp: m.xp });
  });

  it('un azzeramento non viene annullato da una copia più vecchia', async () => {
    const { mergeStates } = await import('../src/lib/store');
    const old = { ...applyLessonTest(initialState(), 1, 90, 80), updatedAt: 100 };
    const reset = { ...initialState(), updatedAt: 300, resetAt: 300 };
    expect(mergeStates(old, reset).lessons).toEqual({});
    expect(mergeStates(reset, old).lessons).toEqual({});
    const later = { ...applyLessonTest(initialState(), 3, 90, 80), updatedAt: 400 };
    expect(mergeStates(reset, later).lessons[3].passed).toBe(true);
  });
});
