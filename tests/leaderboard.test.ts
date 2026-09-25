import { describe, expect, it } from 'vitest';
import { publicStats, rankEntries, weekScore, currentStreak, type LeaderboardEntry } from '../src/lib/leaderboard';
import { applyAnswer, applyLessonTest, initialState } from '../src/lib/store';

const d = (s: string) => new Date(`${s}T12:00:00`);
const today = d('2026-09-25');

describe('statistiche pubbliche', () => {
  it('riassume il progresso senza dati personali', () => {
    let s = applyLessonTest(initialState(), 1, 90, 80);
    s = applyAnswer(s, ['g:bet'], true, d('2026-09-25'));
    s = applyAnswer(s, ['g:bet'], true, d('2026-09-25'));
    s = applyAnswer(s, ['g:bet'], false, d('2026-09-24'));
    s = applyAnswer(s, ['g:bet'], true, d('2026-09-01'));
    const p = publicStats(s, today);
    expect(p.lessons_passed).toBe(1);
    expect(p.recent).toEqual({ '2026-09-25': 2 });
    expect(Object.keys(p)).not.toContain('email');
  });

  it('punteggio settimanale e serie attuale', () => {
    const recent = { '2026-09-25': 5, '2026-09-19': 3, '2026-09-18': 100 };
    expect(weekScore(recent, today)).toBe(8);
    expect(currentStreak(4, '2026-09-24', today)).toBe(4);
    expect(currentStreak(4, '2026-09-20', today)).toBe(0);
    expect(currentStreak(4, null, today)).toBe(0);
  });
});

describe('classifica', () => {
  const e = (id: string, xp: number, recent: Record<string, number>): LeaderboardEntry => ({
    user_id: id, display_name: id, xp, streak: 1, lessons_passed: 0, last_active: '2026-09-25', recent,
  });
  const list = [e('anna', 500, { '2026-09-25': 2 }), e('bea', 300, { '2026-09-24': 10 }), e('carlo', 500, {})];

  it('settimana: ordina per risposte corrette degli ultimi 7 giorni', () => {
    const r = rankEntries(list, 'settimana', today);
    expect(r.map((x) => x.user_id)).toEqual(['bea', 'anna', 'carlo']);
    expect(r.map((x) => x.rank)).toEqual([1, 2, 3]);
  });

  it('totale: ordina per XP, pari merito condividono la posizione', () => {
    const r = rankEntries(list, 'totale', today);
    expect(r.map((x) => x.user_id)).toEqual(['anna', 'carlo', 'bea']);
    expect(r.map((x) => x.rank)).toEqual([1, 1, 3]);
  });
});
