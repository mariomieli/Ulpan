import { dayKey, type AppState } from './store';

/** Statistiche condivise con i compagni di gruppo (niente email, niente dettagli di studio). */
export interface PublicStats {
  xp: number;
  streak: number;
  lessons_passed: number;
  last_active: string | null;
  recent: Record<string, number>;
}

export interface LeaderboardEntry extends PublicStats {
  user_id: string;
  display_name: string;
}

export type RankMode = 'settimana' | 'totale';

export interface RankedEntry extends LeaderboardEntry {
  rank: number;
  week: number;
  currentStreak: number;
}

function daysAgo(today: Date, n: number): string {
  const d = new Date(today);
  d.setDate(d.getDate() - n);
  return dayKey(d);
}

export function publicStats(s: AppState, today: Date = new Date()): PublicStats {
  const recent: Record<string, number> = {};
  for (let i = 0; i < 14; i++) {
    const k = daysAgo(today, i);
    const c = s.days[k]?.correct ?? 0;
    if (c) recent[k] = c;
  }
  return {
    xp: s.xp,
    streak: s.streak,
    lessons_passed: Object.values(s.lessons).filter((l) => l.passed).length,
    last_active: s.lastActive,
    recent,
  };
}

/** Risposte corrette negli ultimi 7 giorni (oggi compreso). */
export function weekScore(recent: Record<string, number>, today: Date = new Date()): number {
  let sum = 0;
  for (let i = 0; i < 7; i++) sum += recent[daysAgo(today, i)] ?? 0;
  return sum;
}

/** La serie vale solo se l'ultima attività è di oggi o di ieri. */
export function currentStreak(streak: number, lastActive: string | null, today: Date = new Date()): number {
  if (!lastActive) return 0;
  return lastActive === dayKey(today) || lastActive === daysAgo(today, 1) ? streak : 0;
}

export function rankEntries(entries: LeaderboardEntry[], mode: RankMode, today: Date = new Date()): RankedEntry[] {
  const rows = entries.map((e) => ({
    ...e,
    week: weekScore(e.recent ?? {}, today),
    currentStreak: currentStreak(e.streak, e.last_active, today),
  }));
  const score = (r: typeof rows[number]) => (mode === 'settimana' ? r.week : r.xp);
  rows.sort((a, b) => score(b) - score(a) || b.xp - a.xp || a.display_name.localeCompare(b.display_name));
  let rank = 0;
  let prev: number | null = null;
  return rows.map((r, i) => {
    if (score(r) !== prev) { rank = i + 1; prev = score(r); }
    return { ...r, rank };
  });
}
