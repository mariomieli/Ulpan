import { LAST_LESSON, LAST_LETTER_LESSON } from '../data/curriculum';
import { WORDS } from '../data/words';
import { mastery } from './srs';
import type { AppState } from './store';

export interface Badge {
  id: string;
  title: string;
  description: string;
  /** Glifo o numero al centro del medaglione. */
  glyph: string;
  tone: 'gold' | 'blue' | 'green';
  earned: boolean;
  /** Avanzamento verso il traguardo (0–1), per i badge non ancora ottenuti. */
  progress: number;
}

/** La serie più lunga di giorni consecutivi con almeno una risposta. */
export function longestStreak(days: AppState['days']): number {
  const keys = Object.keys(days).filter((k) => days[k].answered > 0).sort();
  let best = 0;
  let run = 0;
  let prev: number | null = null;
  for (const k of keys) {
    const t = Date.UTC(+k.slice(0, 4), +k.slice(5, 7) - 1, +k.slice(8, 10));
    run = prev !== null && t - prev === 86400000 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = t;
  }
  return best;
}

const ratio = (v: number, max: number) => Math.max(0, Math.min(1, v / max));

export function badges(s: AppState): Badge[] {
  const passed = (n: number) => !!s.lessons[n]?.passed;
  const passedCount = Object.values(s.lessons).filter((l) => l.passed).length;
  const words = WORDS.filter((w) => mastery(s.srs[`w:${w.id}`]) >= 2).length;
  const streak = Math.max(s.streak, longestStreak(s.days));
  const texts = Object.keys(s.texts).length;
  const vowels = [1, 2, 3].filter(passed).length;
  const b = (id: string, title: string, description: string, glyph: string, tone: Badge['tone'], progress: number): Badge =>
    ({ id, title, description, glyph, tone, progress: ratio(progress, 1), earned: progress >= 1 });
  return [
    b('prima-lezione', 'Primo passo', 'Supera il test di una lezione', 'א', 'blue', passedCount),
    b('vocali', 'Tutte le vocali', 'Supera le lezioni 1–3', 'אָ', 'gold', vowels / 3),
    b('alfabeto', 'Alfabeto completo', `Supera la lezione ${LAST_LETTER_LESSON}: conosci tutte le lettere`, 'א־ת', 'blue', passed(LAST_LETTER_LESSON) ? 1 : passedCount / LAST_LETTER_LESSON),
    b('senza-nikud', 'Lettore esperto', `Supera la lezione ${LAST_LESSON}: leggere senza nikud`, 'ספר', 'green', passed(LAST_LESSON) ? 1 : passedCount / LAST_LESSON),
    b('serie-7', 'Una settimana', '7 giorni di fila con almeno una risposta', '7', 'gold', streak / 7),
    b('serie-30', 'Un mese', '30 giorni di fila', '30', 'gold', streak / 30),
    b('parole-100', '100 parole', '100 parole consolidate nel ripasso', '100', 'green', words / 100),
    b('primo-testo', 'Primo testo', 'Leggi un testo fino in fondo', 'שָׁ', 'blue', texts),
    b('testi-10', 'Biblioteca', 'Leggi 10 testi', '10', 'green', texts / 10),
    b('esame-finale', 'Diploma', 'Supera l’esame finale', '★', 'gold', (s.exams.finale?.bestScore ?? 0) >= 80 ? 1 : 0),
  ];
}
