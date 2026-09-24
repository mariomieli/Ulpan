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
