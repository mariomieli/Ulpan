import { describe, expect, it } from 'vitest';
import { badges, longestStreak } from '../src/lib/badges';
import { initialState } from '../src/lib/store';

describe('traguardi', () => {
  it('serie più lunga dai giorni di attività', () => {
    const d = (answered: number) => ({ answered, correct: answered });
    expect(longestStreak({ '2026-01-01': d(3), '2026-01-02': d(1), '2026-01-03': d(2), '2026-01-05': d(1) })).toBe(3);
    expect(longestStreak({ '2026-02-28': d(1), '2026-03-01': d(1) })).toBe(2);
    expect(longestStreak({})).toBe(0);
  });
  it('badge ottenuti e avanzamento', () => {
    const s = { ...initialState(), lessons: { 1: { studied: true, passed: true, bestScore: 90, attempts: 1 }, 2: { studied: true, passed: true, bestScore: 90, attempts: 1 } } };
    const by = Object.fromEntries(badges(s).map((b) => [b.id, b]));
    expect(by['prima-lezione'].earned).toBe(true);
    expect(by.vocali.earned).toBe(false);
    expect(by.vocali.progress).toBeCloseTo(2 / 3);
    expect(by['esame-finale'].earned).toBe(false);
  });
});
